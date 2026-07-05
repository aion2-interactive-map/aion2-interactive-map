import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Tooltip } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
// Importing the map-engine barrel also registers the smooth wheel-zoom handler.
import { GameMapTiles, createPinIcon, dataToLatLng } from '@gamemap/map-engine'
import { cn } from '@gamemap/ui'
import { palworldAssets, palIconUrl } from '../../../lib/assets'
import { loadPalSpawns, type PalSpawns } from '../../../lib/pals'
import { toGameCoords } from '../../../lib/coords'
import { DATA_BASE } from '../../../lib/urls'

type MapsLocale = Record<string, { name: string; shortName?: string }>

function useMapLabels(lng: string): Record<string, string> {
  const [labels, setLabels] = useState<Record<string, string>>({})
  useEffect(() => {
    let cancelled = false
    fetch(`${DATA_BASE}/locales/${lng}/maps.json`)
      .then((r) => (r.ok ? (r.json() as Promise<MapsLocale>) : ({} as MapsLocale)))
      .then((m) => {
        if (cancelled) return
        const out: Record<string, string> = {}
        for (const [id, v] of Object.entries(m)) out[id] = v.shortName ?? v.name ?? id
        setLabels(out)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [lng])
  return labels
}

/**
 * Embedded mini-map of a single pal's spawns, unclustered (each data point
 * shown individually). Loads spawns across every map; when the pal spawns on
 * more than one map, a toggle switches between them. Bare Leaflet + tiles (no
 * full engine chrome), mirroring aion2's wiki `EmbeddedMap`.
 */
export function PalSpawnMap({
  palId,
  palIcon,
  className,
}: {
  palId: string
  palIcon: string
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const mapLabels = useMapLabels(i18n.resolvedLanguage ?? 'en-US')
  const [spawns, setSpawns] = useState<PalSpawns[] | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    let cancelled = false
    setSpawns(null)
    setActive(0)
    loadPalSpawns(palId)
      .then((s) => {
        if (!cancelled) setSpawns(s)
      })
      .catch(() => {
        if (!cancelled) setSpawns([])
      })
    return () => {
      cancelled = true
    }
  }, [palId])

  const current = spawns?.[active]
  const map = current?.map

  const icon = useMemo(
    () => createPinIcon(palIconUrl(palIcon), 0.7, false, { variant: 'circular' }),
    [palIcon],
  )

  const { bounds, fit } = useMemo(() => {
    if (!map || !current) return { bounds: null, fit: null }
    const width = map.tileWidth * map.tilesCountX
    const height = map.tileHeight * map.tilesCountY
    const full: L.LatLngBoundsExpression = [
      [0, 0],
      [height, width],
    ]
    const pts = current.points.map((p) => dataToLatLng(map, p.x, p.y))
    if (!pts.length) return { bounds: full, fit: full }
    return { bounds: full, fit: L.latLngBounds(pts).pad(0.4) }
  }, [map, current])

  if (spawns && spawns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="pal-spawn-empty">
        {t('pal.noSpawns')}
      </p>
    )
  }
  if (!spawns || !map || !current || !bounds) {
    return <div className={cn('animate-pulse rounded-lg bg-secondary', className ?? 'h-72')} />
  }

  const first = current.points[0]
  const g = first ? toGameCoords(map.id, first.x, first.y) : null
  const href = `/?map=${encodeURIComponent(map.id)}${
    g ? `&pos=${Math.round(g.x)},${Math.round(g.y)}` : ''
  }`

  return (
    <div className="space-y-2" data-testid="pal-spawn-map">
      {spawns.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {spawns.map((s, i) => (
            <button
              key={s.map.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'rounded px-2 py-0.5 text-xs font-medium',
                i === active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent',
              )}
            >
              {mapLabels[s.map.id] ?? s.map.id} ({s.points.length})
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          'relative isolate overflow-hidden rounded-lg border border-border',
          className ?? 'h-72',
        )}
      >
        <MapContainer
          key={`${map.id}:${current.points.length}`}
          bounds={fit ?? bounds}
          maxBounds={bounds}
          crs={L.CRS.Simple}
          minZoom={-4}
          maxZoom={2}
          zoomSnap={0}
          zoomDelta={0.25}
          scrollWheelZoom={false}
          smoothWheelZoom={true}
          smoothSensitivity={4}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <GameMapTiles selectedMap={map} assets={palworldAssets} />
          {current.points.map((p, i) => (
            <Marker key={i} position={dataToLatLng(map, p.x, p.y)} icon={icon}>
              {p.count && p.count > 1 ? (
                <Tooltip direction="top">{t('spawnCount', { count: p.count })}</Tooltip>
              ) : null}
            </Marker>
          ))}
        </MapContainer>
        <a
          href={href}
          className="absolute top-2 right-2 z-[500] rounded bg-background/80 px-2 py-1 text-xs hover:bg-background"
          data-testid="pal-spawn-open-full"
        >
          {t('pal.viewOnMap')}
        </a>
      </div>
    </div>
  )
}
