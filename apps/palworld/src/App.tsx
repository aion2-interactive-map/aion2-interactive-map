import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameMapView, type EngineMarker, type MapRef } from '@gamemap/map-engine'
import { FilterPanel, MarkerPopupCard, SearchPanel, ShellMapSelect, ShellSidebar, ShellTopBar, ThemeToggle, type FilterCategory, type SearchItem } from '@gamemap/map-shell'
import type { MarkerTypeSubtype } from '@gamemap/data-contract'
import {
  loadStatic, loadMarkers,
  type MapMeta, type Taxonomy, type TypesLocale, type MapsLocale, type MarkerRow, type MarkerLocale
} from './lib/data'
import { palworldAssets } from './lib/assets'
import { toGameCoords } from './lib/coords'
import { palworldTheme } from './theme'
import { LANGUAGES, LANGUAGE_LABELS } from './i18n'
import { formatPalId } from './lib/palId'

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
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // When on, marker names show as permanent labels; when off, they appear on
  // hover (handled by the engine). Off by default to keep the map uncluttered.
  const [showLabels, setShowLabels] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    loadStatic(lng)
      .then((d) => {
        if (cancelled) return
        setStaticData(d)
        // Only initialize visible set once; preserve user-set empty (Hide all).
        // Default to showing just the location markers, minus dungeons.
        if (!visibleInitialized.current) {
          visibleInitialized.current = true
          setVisible(new Set(d.types.subtypes.filter((s) => s.category === 'location' && s.id !== 'dungeon').map((s) => s.id)))
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setLoadError(t('loadError'))
      })
    return () => { cancelled = true }
  }, [lng, t])

  // Clear selection on map switch
  useEffect(() => {
    setMarkerData(null)
    setSelectedMarkerId(null)
    setSelectedPosition(null)
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
        zukanIndex: m.zukanIndex,
        zukanIndexSuffix: m.zukanIndexSuffix,
      }
    })
  }, [staticData, markerData, subtypeMetaMap])

  const searchItems: SearchItem[] = useMemo(() => {
    if (!staticData) return []
    return engineMarkers.map((m) => {
      const catId = m.subtypeMeta?.category ?? m.category
      const iconName = m.icon || m.subtypeMeta?.icon || ''
      return {
        id: m.id,
        name: m.localizedName || '',
        idLabel: formatPalId(m.zukanIndex ?? m.subtypeMeta?.zukanIndex, m.zukanIndexSuffix ?? m.subtypeMeta?.zukanIndexSuffix),
        description: m.localizedDescription,
        subtypeLabel: m.subtypeLabel ?? m.subtype,
        categoryLabel: catId ? (staticData.typesL10n.categories[catId]?.name ?? catId) : '',
        iconUrl: iconName && map ? palworldAssets.markerIconUrl(iconName, map) : undefined,
        x: m.x,
        y: m.y,
      }
    })
  }, [engineMarkers, staticData, map])

  const searchLabels = useMemo(() => ({
    search: t('search'),
    resultsCount: (n: number) => t('resultsCount', { count: n }),
    unnamed: t('unnamed'),
    noDescription: t('noDescription'),
    scopeName: t('scopeName'),
    scopeAll: t('scopeAll'),
  }), [t])

  const onToggle = useCallback((id: string) => {
    setVisible((v) => {
      const next = new Set(v)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const onSetCategory = useCallback((categoryId: string, show: boolean) => {
    setVisible((v) => {
      if (!staticData) return v
      const next = new Set(v)
      for (const s of staticData.types.subtypes) {
        if (s.category !== categoryId) continue
        if (show) next.add(s.id); else next.delete(s.id)
      }
      return next
    })
  }, [staticData])

  // Marker count per subtype on the current map (drives the button count +
  // hides subtypes absent from this map).
  const countBySubtype = useMemo(() => {
    const counts = new Map<string, number>()
    if (!markerData) return counts
    for (const m of markerData.markers) counts.set(m.subtype, (counts.get(m.subtype) ?? 0) + 1)
    return counts
  }, [markerData])

  const filterCategories: FilterCategory[] = useMemo(() => {
    if (!staticData) return []
    return staticData.types.categories
      .map((cat) => ({
        id: cat.id,
        label: staticData.typesL10n.categories[cat.id]?.name ?? cat.id,
        subtypes: staticData.types.subtypes
          .filter((s) => s.category === cat.id)
          .filter((s) => (countBySubtype.get(s.id) ?? 0) > 0)
          .map((s) => ({
            id: s.id,
            label: staticData.typesL10n.subtypes[s.id]?.name ?? s.id,
            active: visible.has(s.id),
            // Pal buttons show the Paldeck id; everything else shows a count.
            badge: formatPalId(s.zukanIndex, s.zukanIndexSuffix),
            count: cat.id === 'pal' ? undefined : (countBySubtype.get(s.id) ?? 0),
          })),
      }))
      .filter((cat) => cat.subtypes.length > 0)
  }, [staticData, visible, countBySubtype])

  const onToggleMarker = useCallback((id: string | null) => {
    setSelectedMarkerId((cur) => (cur === id ? null : id))
  }, [])

  // Show the game's in-game map coordinates in the readout (cursor + copy).
  const displayCoords = useCallback(
    (x: number, y: number) => toGameCoords(mapId, x, y),
    [mapId],
  )

  const subzoneAt = useCallback(() => '', [])

  const labels = useMemo(() => ({
    copyPosition: t('copyPosition'),
    noMapSelected: t('noMapSelected'),
    zoomIn: t('zoomIn'),
    zoomOut: t('zoomOut'),
  }), [t])

  const renderPopupContent = useCallback((marker: EngineMarker) => {
    const idLabel = formatPalId(marker.zukanIndex ?? marker.subtypeMeta?.zukanIndex, marker.zukanIndexSuffix ?? marker.subtypeMeta?.zukanIndexSuffix)
    const catId = marker.subtypeMeta?.category ?? marker.category
    const catLabel = catId ? (staticData?.typesL10n.categories[catId]?.name ?? catId) : ''
    const subLabel = marker.subtypeLabel ?? marker.subtype
    const g = toGameCoords(mapId, marker.x, marker.y)
    const metaLine = [
      [catLabel, subLabel].filter(Boolean).join(' / '),
      `(${Math.round(g.x)}, ${Math.round(g.y)})`,
    ].filter(Boolean).join(' ')
    return (
      <MarkerPopupCard
        idLabel={idLabel}
        name={marker.localizedName || t('unnamed')}
        metaLine={metaLine}
        description={marker.localizedDescription}
        noDescriptionLabel={t('noDescription')}
      />
    )
  }, [staticData, t, mapId])

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-destructive">
        {loadError}
      </div>
    )
  }

  if (!staticData) return <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">Loading…</div>

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <ShellTopBar
        classNames={{ root: 'border-b border-border bg-card text-card-foreground' }}
        leftSlot={<h1 className="text-sm font-semibold">{t('title')}</h1>}
        languageSwitcher={{
          languages: LANGUAGES.map((code) => ({ code, label: LANGUAGE_LABELS[code] })),
          current: lng,
          onChange: (code) => void i18n.changeLanguage(code),
          menuLabel: 'language',
        }}
        rightExtras={
          <ThemeToggle
            labels={{ auto: t('themeAuto'), light: t('themeLight'), dark: t('themeDark') }}
          />
        }
      />
      <div className="flex min-h-0 flex-1">
        <ShellSidebar
          collapseLabel={t('collapse')}
          expandLabel={t('expand')}
          classNames={{
            root: 'border-r border-border bg-gradient-to-b from-card to-background text-sm text-card-foreground',
            collapseButton: 'bg-secondary text-secondary-foreground',
            content: 'px-3 pt-3',
          }}
          mapSelectorSlot={
            <ShellMapSelect
              classNames={{ wrapper: "mb-3" }}
              maps={staticData.maps.map((m) => ({
                id: m.id,
                label: staticData.mapsL10n[m.id]?.shortName ?? staticData.mapsL10n[m.id]?.name ?? m.id,
              }))}
              activeMapId={mapId}
              onSelectMap={setMapId}
              barStyle={{
                background:
                  "linear-gradient(90deg, rgba(53,208,232,0) 0%, rgba(53,208,232,0.35) 54%, rgba(53,208,232,0) 100%)",
                borderImage:
                  "linear-gradient(90deg, rgba(53,208,232,0), rgba(53,208,232,0.9), rgba(53,208,232,0)) 1",
              }}
            />
          }
        >
          <FilterPanel
            categories={filterCategories}
            onToggleSubtype={onToggle}
            onSetCategory={onSetCategory}
            categoryToggleLabels={{ show: t('showAll'), hide: t('hideAll') }}
            controls={[
              {
                id: 'show-all',
                label: t('showAll'),
                onClick: () => setVisible(new Set(staticData.types.subtypes.map((s) => s.id))),
              },
              { id: 'hide-all', label: t('hideAll'), onClick: () => setVisible(new Set()) },
              {
                id: 'show-tooltip',
                label: t('showTooltip'),
                onClick: () => setShowLabels((v) => !v),
                active: showLabels,
              },
            ]}
            classNames={{
              controlButton: 'bg-secondary text-secondary-foreground',
              controlButtonActive: 'bg-primary text-primary-foreground',
              subtypeButton: 'bg-secondary text-secondary-foreground',
              subtypeButtonActive: 'bg-primary text-primary-foreground',
            }}
          />
        </ShellSidebar>
        <main className="relative flex min-w-0 flex-1 overflow-hidden">
          <GameMapView
            mapRef={mapRef}
            map={map}
            markers={engineMarkers}
            regions={[]}
            visibleSubtypes={visible}
            showLabels={showLabels}
            showBorders={false}
            lodEnabled={false}
            selectedMarkerId={selectedMarkerId}
            selectedPosition={selectedPosition}
            onToggleMarker={onToggleMarker}
            subzoneAt={subzoneAt}
            displayCoords={displayCoords}
            flyToDuration={0.5}
            assets={palworldAssets}
            theme={palworldTheme}
            exposeTestHandle={import.meta.env.DEV}
            renderPopupContent={renderPopupContent}
            labels={labels}
          />
          <SearchPanel
            items={searchItems}
            onSelect={setSelectedMarkerId}
            onFlyTo={setSelectedPosition}
            labels={searchLabels}
            displayCoords={displayCoords}
          />
        </main>
      </div>
    </div>
  )
}
