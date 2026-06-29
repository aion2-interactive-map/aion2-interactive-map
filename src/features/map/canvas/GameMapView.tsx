import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

import type {
  MapRef,
  MarkerWithTranslations,
  RegionInstance,
} from "@/types/game";
import { useGameMap } from "@/context/GameMapContext";
import { useMarkers } from "@/context/MarkersContext";
import { useGameData } from "@/context/GameDataContext";
import { dataToLatLng } from "@/lib/coords";
import "@/lib/leaflet-smooth-wheel-zoom"; // registers the smooth wheel-zoom handler

import GameMapTiles from "@/features/map/canvas/GameMapTiles";
import GameMapBorders from "@/features/map/canvas/GameMapBorders";
import GameMarker from "@/features/map/canvas/GameMarker";
import CursorTracker from "@/features/map/canvas/CursorTracker";
import MapZoomControl from "@/features/map/canvas/MapZoomControl";
import MarkerFocusController from "@/features/map/canvas/MarkerFocusController";
import MapContextMenu, {
  type ContextMenuState,
} from "@/features/map/canvas/MapContextMenu";
import MapStatusBar from "@/features/map/canvas/MapStatusBar";
import SelectedMarkerPopup from "@/features/map/popup/SelectedMarkerPopup";

type Props = {
  mapRef: React.RefObject<MapRef>;
  onSelectMarker: (markerId: string | null) => void;
  selectedMarkerId: string | null;
  selectedPosition: { x: number; y: number } | null;
};

/**
 * 3-tier level-of-detail thresholds (Leaflet zoom). The map opens fully zoomed
 * out at the default zoom -3 (range -3..2; the MapContainer is not
 * bounds-fitted, it mounts at the `zoom` prop).
 *
 * - tier 1 markers are always shown (subject to subtype filter + culling).
 * - tier 2 markers appear at/above TIER2_MIN_ZOOM.
 * - tier 3 markers appear at/above TIER3_MIN_ZOOM.
 *
 * With the values below the default view (zoom -3) shows only tier 1; zooming
 * in past TIER2_MIN_ZOOM adds tier 2, and past TIER3_MIN_ZOOM adds tier 3.
 */
const TIER2_MIN_ZOOM = -1.25; // at/above this zoom, tier-2 markers appear
const TIER3_MIN_ZOOM = 0; // at/above this zoom, tier-3 markers appear

/**
 * Viewport culling: only markers whose position falls inside the current map
 * bounds (expanded by this fraction on each side) are mounted. The padding
 * keeps a ring of off-screen markers ready so panning doesn't pop them in at
 * the edge. This is the main perf lever for the ~3.6k-marker maps: without it,
 * crossing a tier threshold bulk-mounts thousands of DOM markers in one frame.
 */
const VIEWPORT_PAD = 0.5;

/**
 * Progressive (chunked) mounting: how many *new* markers to mount per animation
 * frame. When a large set becomes visible at once — zooming all the way out, or
 * enabling every subtype while zoomed out — mounting all ~3.6k Leaflet markers
 * in a single React commit blocks the main thread for one long frame (the
 * freeze). Instead we mount at most this many per frame and yield, so the map
 * stays interactive and markers stream in over a few frames. Higher = fills in
 * faster but with bigger per-frame hitches; lower = smoother but slower to
 * fully populate. ~250/frame fully populates 3.6k in ~15 frames (~0.25s).
 */
const MOUNT_CHUNK = 250;

/** Compute the highest marker tier visible at the given Leaflet zoom. */
function visibleTierForZoom(zoom: number): number {
  if (zoom >= TIER3_MIN_ZOOM) return 3;
  if (zoom >= TIER2_MIN_ZOOM) return 2;
  return 1;
}

/**
 * Tracks the current Leaflet zoom level AND padded viewport bounds into React
 * state. Fires only on `moveend`/`zoomend` (end of gesture, not continuously),
 * so re-rendering GameMapView is infrequent. Seeds an initial value on mount so
 * markers cull correctly before the first gesture.
 */
const ViewportWatcher: React.FC<{
  onChange: (zoom: number, bounds: L.LatLngBounds) => void;
}> = ({ onChange }) => {
  const map = useMap();
  useEffect(() => {
    onChange(map.getZoom(), map.getBounds());
    // Run once per map instance; `onChange` is a stable useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  useMapEvents({
    moveend: (e) => onChange(e.target.getZoom(), e.target.getBounds()),
    zoomend: (e) => onChange(e.target.getZoom(), e.target.getBounds()),
  });
  return null;
};

/**
 * Dev/test-only hook: publishes the Leaflet map instance on `window` so e2e
 * tests can project DATA coords through the real map (verifying the vertical
 * flip). No-op in production builds.
 */
const TestMapHandle: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __leafletMap?: unknown }).__leafletMap = map;
    return () => {
      delete (window as unknown as { __leafletMap?: unknown }).__leafletMap;
    };
  }, [map]);
  return null;
};

const GameMapView: React.FC<Props> = ({
  mapRef,
  onSelectMarker,
  selectedMarkerId,
  selectedPosition,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<RegionInstance | undefined>(
    undefined,
  );
  // Initialized to the MapContainer default zoom (-3); updated on `zoomend`.
  const [zoom, setZoom] = useState(-3);
  // Padded visible bounds for viewport culling; null until the map is ready
  // (during which culling is skipped — only the few default-zoom markers show).
  const [viewBounds, setViewBounds] = useState<L.LatLngBounds | null>(null);

  const handleViewport = useCallback(
    (z: number, bounds: L.LatLngBounds) => {
      setZoom(z);
      setViewBounds(bounds.pad(VIEWPORT_PAD));
    },
    [],
  );

  const { selectedMap } = useGameMap();
  const { visibleSubtypes, lodEnabled } = useGameData();
  const { markers } = useMarkers();

  const handleCopyPosition = useCallback((x: number, y: number) => {
    const text = `${Math.round(x)}, ${Math.round(y)}`;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .catch((err) => console.error("Clipboard error", err));
    } else {
      console.log("Copied position:", text);
    }
  }, []);

  /**
   * Stable `id → Leaflet position` map, projected once per marker. Recomputed
   * only when the marker set or map changes — NOT on pan/zoom. Reusing the same
   * `LatLng` object for a given marker across renders keeps `GameMarker`'s
   * `position` prop reference-stable, so `React.memo` still skips re-rendering
   * markers that didn't move when the viewport changes.
   */
  const positionById = useMemo(() => {
    const map = new Map<string, L.LatLng>();
    if (!selectedMap) return map;
    for (const m of markers) {
      map.set(m.id, dataToLatLng(selectedMap, m.x, m.y));
    }
    return map;
  }, [selectedMap, markers]);

  /**
   * The set of markers eligible to show, each paired with its (stable)
   * projected position. Recomputed only when an input that affects visibility
   * changes (markers, subtype filter, LOD, zoom tier, viewport bounds,
   * selection) — NOT on unrelated re-renders.
   */
  const visibleMarkers = useMemo<
    { marker: MarkerWithTranslations; position: L.LatLng }[]
  >(() => {
    if (!selectedMap) return [];
    const visibleTier = visibleTierForZoom(zoom);
    const out: { marker: MarkerWithTranslations; position: L.LatLng }[] = [];
    for (const m of markers) {
      // Selection always overrides subtype filter, LOD and culling so the
      // focused marker (and its popup) render even when off-screen.
      const isSelected = selectedMarkerId === m.id;
      if (!isSelected) {
        if (!visibleSubtypes?.has(m.subtype)) continue;
        if (lodEnabled) {
          if (m.tier == null) continue;
          if (m.tier > visibleTier) continue;
        }
      }
      const position = positionById.get(m.id)!;
      // Viewport culling: skip markers outside the padded visible bounds (until
      // `viewBounds` is known). Keeps the mounted DOM-marker count to the
      // on-screen subset — the main fix for zoom/pan stutter.
      if (!isSelected && viewBounds && !viewBounds.contains(position)) continue;
      out.push({ marker: m, position });
    }
    return out;
  }, [
    selectedMap,
    markers,
    positionById,
    visibleSubtypes,
    lodEnabled,
    zoom,
    viewBounds,
    selectedMarkerId,
  ]);

  /**
   * Ids of markers currently allowed to mount. Driven by the progressive
   * ramp below: when `visibleMarkers` changes we prune ids that left the
   * target set, then add the missing ones MOUNT_CHUNK-at-a-time across
   * animation frames. Tracking ids (not array indices) keeps already-mounted
   * markers stable — they never unmount/flicker just because the set's
   * composition changed (e.g. enabling another subtype).
   */
  const [mountedIds, setMountedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const targetIds = new Set(visibleMarkers.map((v) => v.marker.id));

    let raf = 0;
    let cancelled = false;
    // Each frame: prune ids that left the target set AND mount up to
    // MOUNT_CHUNK new ones, both inside the rAF callback (no synchronous
    // setState in the effect body). Pruning + adding together keeps `next` a
    // subset of the target, so the `next.size === targetIds.size` check ends
    // the ramp exactly when everything is mounted. Markers that left the set
    // are already dropped from the screen by the `renderedMarkers` filter; the
    // prune here just keeps the tracking Set bounded and the size check honest.
    const step = () => {
      if (cancelled) return;
      setMountedIds((prev) => {
        const next = new Set<string>();
        for (const id of prev) {
          if (targetIds.has(id)) next.add(id);
        }
        let added = 0;
        for (const v of visibleMarkers) {
          if (added >= MOUNT_CHUNK) break;
          if (!next.has(v.marker.id)) {
            next.add(v.marker.id);
            added += 1;
          }
        }
        if (next.size < targetIds.size) raf = requestAnimationFrame(step);
        return next;
      });
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [visibleMarkers]);

  /**
   * The markers handed to Leaflet this frame: the target set filtered to those
   * the ramp has mounted so far. The selected marker is always included (even
   * before the ramp reaches it) so search "fly to" / selection shows instantly.
   */
  const renderedMarkers = useMemo(
    () =>
      visibleMarkers.filter(
        ({ marker }) =>
          mountedIds.has(marker.id) || marker.id === selectedMarkerId,
      ),
    [visibleMarkers, mountedIds, selectedMarkerId],
  );

  if (!selectedMap) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        No map selected.
      </div>
    );
  }

  // Leaflet CRS.Simple uses [y, x] for bounds and center
  const width = selectedMap.tileWidth * selectedMap.tilesCountX;
  const height = selectedMap.tileHeight * selectedMap.tilesCountY;

  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [height, width],
  ];

  const center: [number, number] = [height / 2, width / 2];

  return (
    <div
      className="flex-1 relative"
      onClick={() => setContextMenu(null)}
      style={{ cursor: "default" }}
    >
      <MapContainer
        key={selectedMap.id}
        center={center}
        bounds={bounds}
        zoom={-3}
        minZoom={-3}
        maxZoom={2}
        // Smooth, continuous zoom. zoomSnap=0 lets the map settle on any
        // fractional zoom (no stepping to 0.25 boundaries). The built-in
        // (discrete) wheel handler is disabled (scrollWheelZoom=false) in
        // favour of the smooth per-frame handler registered via
        // "@/lib/leaflet-smooth-wheel-zoom"; it's configured through the
        // smoothWheelZoom/smoothSensitivity props below (react-leaflet forwards
        // them into the Leaflet map options). Raise smoothSensitivity to zoom
        // faster, lower it to zoom slower. Tiles are CSS-scaled (maxNativeZoom
        // =0), so fractional zoom is a pure GPU transform. zoomDelta still
        // drives the +/- buttons and keyboard.
        zoomSnap={0}
        zoomDelta={0.25}
        scrollWheelZoom={false}
        smoothWheelZoom={true}
        smoothSensitivity={4}
        crs={L.CRS.Simple}
        className="w-full h-full"
        attributionControl={false}
        zoomControl={false}
        ref={mapRef}
      >
        <MapZoomControl />
        <ViewportWatcher onChange={handleViewport} />
        <TestMapHandle />
        <CursorTracker />

        <MapContextMenu
          onOpenMenu={(state) => setContextMenu(state)}
          onCloseMenu={() => setContextMenu(null)}
        />

        <GameMapTiles selectedMap={selectedMap} />
        <GameMapBorders
          hoveredRegion={hoveredRegion}
          setHoveredRegion={setHoveredRegion}
        />

        {renderedMarkers.map(({ marker, position }) => (
          <GameMarker
            key={marker.id}
            marker={marker}
            position={position}
            onSelectMarker={onSelectMarker}
          />
        ))}

        <MarkerFocusController
          selectedMarkerId={selectedMarkerId}
          selectedPosition={selectedPosition}
        />

        <SelectedMarkerPopup
          selectedMarkerId={selectedMarkerId}
          onSelectMarker={onSelectMarker}
        />
      </MapContainer>

      {/* Bottom status bar (Lanhu): subscribes to the cursor store itself so
          mousemove re-renders ONLY the bar, not the map layers. */}
      <MapStatusBar />

      {/* Context menu overlay */}
      {contextMenu && (
        <div
          className="absolute z-[5000] min-w-[190px] rounded-md border border-border bg-popover text-popover-foreground shadow-md py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyPosition(contextMenu.mapX, contextMenu.mapY);
              setContextMenu(null);
            }}
          >
            Copy position ({Math.round(contextMenu.mapX)},{" "}
            {Math.round(contextMenu.mapY)})
          </button>
        </div>
      )}
    </div>
  );
};

export default GameMapView;
