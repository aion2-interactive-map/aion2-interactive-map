import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameMapView, type EngineMarker, type MapRef } from '@gamemap/map-engine'
import type { MarkerTypeSubtype } from '@gamemap/data-contract'
import {
  loadStatic, loadMarkers,
  type MapMeta, type Taxonomy, type TypesLocale, type MapsLocale, type MarkerRow, type MarkerLocale
} from './lib/data'
import { palworldAssets } from './lib/assets'
import { palworldTheme } from './theme'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'

export default function App() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en-US'
  const mapRef = useRef<MapRef>(null)
  // Track whether visible-subtypes have been initialized at least once
  const visibleInitialized = useRef(false)

  const [staticData, setStaticData] = useState<{
    maps: MapMeta[]; types: Taxonomy; mapsL10n: MapsLocale; typesL10n: TypesLocale
  } | null>(null)
  const [mapId, setMapId] = useState('MainWorld')
  const [markerData, setMarkerData] = useState<{ markers: MarkerRow[]; l10n: MarkerLocale } | null>(null)
  const [visible, setVisible] = useState<Set<string>>(new Set())
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Fix 1 & 2: cancellation guard + error handling for loadStatic
  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    loadStatic(lng)
      .then((d) => {
        if (cancelled) return
        setStaticData(d)
        // Fix 3: only initialize visible set once; preserve user-set empty (Hide all)
        if (!visibleInitialized.current) {
          visibleInitialized.current = true
          setVisible(new Set(d.types.subtypes.map((s) => s.id)))
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setLoadError(t('loadError'))
      })
    return () => { cancelled = true }
  }, [lng, t])

  // Fix 1 & 2: cancellation guard + error handling for loadMarkers
  // Fix 5: clear selection on map switch
  useEffect(() => {
    setMarkerData(null)
    setSelectedMarkerId(null)
    let cancelled = false
    loadMarkers(mapId, lng)
      .then((d) => {
        if (cancelled) return
        setMarkerData(d)
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setLoadError(t('loadError'))
      })
    return () => { cancelled = true }
  }, [mapId, lng, t])

  const map = staticData?.maps.find((m) => m.id === mapId) ?? undefined

  // Fix 4: build a Map<id, subtypeMeta> once before the loop instead of O(n·m) find
  const subtypeMetaMap = useMemo(() => {
    if (!staticData) return new Map<string, MarkerTypeSubtype>()
    return new Map(staticData.types.subtypes.map((s) => [s.id, s]))
  }, [staticData])

  const engineMarkers: EngineMarker[] = useMemo(() => {
    if (!staticData || !markerData) return []
    return markerData.markers.map((m) => {
      const loc = markerData.l10n[m.id]
      const subLabel = staticData.typesL10n.subtypes[m.subtype]?.name ?? m.subtype
      const subtypeMeta = subtypeMetaMap.get(m.subtype)
      return {
        id: m.id,
        subtype: m.subtype,
        category: m.category,
        x: m.x,
        y: m.y,
        icon: m.icon,
        indexInSubtype: m.indexInSubtype,
        images: [] as string[],
        contributors: [] as string[],
        localizedName: loc?.name ?? subLabel,
        localizedDescription: loc?.description,
        subtypeLabel: subLabel,
        subtypeMeta,
        completed: false,
      }
    })
  }, [staticData, markerData, subtypeMetaMap])

  const onToggle = useCallback((id: string) => {
    setVisible((v) => {
      const next = new Set(v)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  // Fix 6: memoize stable engine props + use i18n labels
  const onToggleMarker = useCallback((id: string | null) => {
    setSelectedMarkerId((cur) => (cur === id ? null : id))
  }, [])

  const subzoneAt = useCallback(() => '', [])

  const labels = useMemo(() => ({
    copyPosition: t('copyPosition'),
    noMapSelected: t('noMapSelected'),
    zoomIn: t('zoomIn'),
    zoomOut: t('zoomOut'),
  }), [t])

  const renderPopupContent = useCallback((marker: EngineMarker) => (
    <div className="max-w-60">
      <div className="font-semibold">{marker.localizedName}</div>
      {marker.localizedDescription && (
        <div className="mt-1 whitespace-pre-line text-xs text-neutral-300">{marker.localizedDescription}</div>
      )}
    </div>
  ), [])

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-900 text-red-400">
        {loadError}
      </div>
    )
  }

  if (!staticData) return <div className="flex h-screen items-center justify-center bg-neutral-900 text-neutral-400">Loading…</div>

  return (
    <div className="flex h-screen flex-col bg-neutral-900">
      <TopBar
        maps={staticData.maps.map((m) => ({ id: m.id, label: staticData.mapsL10n[m.id]?.shortName ?? staticData.mapsL10n[m.id]?.name ?? m.id }))}
        activeMapId={mapId}
        onSelectMap={setMapId}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          types={staticData.types}
          typesL10n={staticData.typesL10n}
          visible={visible}
          onToggle={onToggle}
          onSetAll={(on) => setVisible(on ? new Set(staticData.types.subtypes.map((s) => s.id)) : new Set())}
        />
        <main className="relative flex min-w-0 flex-1 overflow-hidden">
          <GameMapView
            mapRef={mapRef}
            map={map}
            markers={engineMarkers}
            regions={[]}
            visibleSubtypes={visible}
            showLabels={false}
            showBorders={false}
            lodEnabled={false}
            selectedMarkerId={selectedMarkerId}
            selectedPosition={null}
            onToggleMarker={onToggleMarker}
            subzoneAt={subzoneAt}
            flyToDuration={0.5}
            assets={palworldAssets}
            theme={palworldTheme}
            exposeTestHandle={import.meta.env.DEV}
            renderPopupContent={renderPopupContent}
            labels={labels}
          />
        </main>
      </div>
    </div>
  )
}
