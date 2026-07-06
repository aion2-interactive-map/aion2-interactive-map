import type { MapAssets } from '@gamemap/map-engine'
import { RES_BASE } from './urls'

const pad2 = (n: number) => String(n).padStart(2, '0')

export const palworldAssets: MapAssets = {
  tileUrl: (map, x, y) =>
    `${RES_BASE}/tiles/${map.id}/${map.id}_${pad2(x)}_${pad2(y)}.webp`,
  markerIconUrl: (icon) =>
    icon ? `${RES_BASE}/icons/${icon}.webp` : '',
}

/** Pal roster icon (e.g. `T_Anubis_icon_normal`). */
export const palIconUrl = (icon: string): string => `${RES_BASE}/icons/${icon}.webp`
/** Element badge icon; every element has one. */
export const elementIconUrl = (element: string): string => `${RES_BASE}/icons/element_${element}.webp`
/** Work-suitability icon; OilExtraction has none (callers fall back to the label). */
export const workIconUrl = (work: string): string => `${RES_BASE}/icons/work_${work}.webp`
