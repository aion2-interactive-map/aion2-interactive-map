import type { GameMapMeta, MarkerPinVariant, MarkerTypeSubtype } from '@gamemap/data-contract'
import { DATA_BASE } from './urls'

const j = async <T>(url: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  return r.json() as Promise<T>
}

// Re-export so App.tsx can use GameMapMeta directly without importing data-contract
export type { GameMapMeta as MapMeta }

export interface Taxonomy {
  categories: { id: string }[]
  // MarkerTypeSubtype requires name; we supply it from the locale at load time
  subtypes: MarkerTypeSubtype[]
}
export interface MarkerRow {
  zukanIndex?: number
  zukanIndexSuffix?: string
  id: string; subtype: string; category?: string; x: number; y: number; z?: number
  icon?: string; indexInSubtype: number
}
export type MarkerLocale = Record<string, { name?: string; description?: string }>
export interface TypesLocale {
  categories: Record<string, { name: string }>
  subtypes: Record<string, { name: string; description?: string }>
}
export type MapsLocale = Record<string, { name: string; shortName?: string }>

interface TypesFile {
  categories: {
    id: string
    pinVariant?: MarkerPinVariant
    subtypes: { id: string; icon?: string; color?: string; iconScale?: number; pinVariant?: MarkerPinVariant }[]
  }[]
}

export async function loadStatic(lng: string) {
  const [mapsFile, typesFile, mapsL10n, typesL10n] = await Promise.all([
    j<{ maps: GameMapMeta[] }>(`${DATA_BASE}/maps.json`),
    j<TypesFile>(`${DATA_BASE}/types.json`),
    j<MapsLocale>(`${DATA_BASE}/locales/${lng}/maps.json`),
    j<TypesLocale>(`${DATA_BASE}/locales/${lng}/types.json`),
  ])
  const types: Taxonomy = {
    categories: typesFile.categories.map((c) => ({ id: c.id })),
    subtypes: typesFile.categories.flatMap((c) =>
      c.subtypes.map((s): MarkerTypeSubtype => ({
        ...s,
        category: c.id,
        pinVariant: s.pinVariant ?? c.pinVariant,
        // Use locale name if available; fall back to id so the required `name` field is always set
        name: typesL10n.subtypes[s.id]?.name ?? s.id,
      }))),
  }
  return { maps: mapsFile.maps, types, mapsL10n, typesL10n }
}

export async function loadMarkers(mapId: string, lng: string) {
  const [markersFile, l10n] = await Promise.all([
    j<{ markers: MarkerRow[] }>(`${DATA_BASE}/markers/${mapId}.json`),
    j<MarkerLocale>(`${DATA_BASE}/locales/${lng}/markers/${mapId}.json`),
  ])
  return { markers: markersFile.markers, l10n }
}
