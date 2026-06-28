import React, { useCallback, useEffect, useState } from "react";
import { MapContainer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

import type { MapRef, RegionInstance } from "@/types/game";
import { useGameMap } from "@/context/GameMapContext";
import { useMarkers } from "@/context/MarkersContext";
import { useGameData } from "@/context/GameDataContext";
import { useUserMarkers } from "@/context/UserMarkersContext";
import { useTranslation } from "react-i18next";
import { dataToLatLng } from "@/lib/coords";

import GameMapTiles from "@/features/map/canvas/GameMapTiles";
import GameMapBorders from "@/features/map/canvas/GameMapBorders";
import GameMarker from "@/features/map/canvas/GameMarker";
import UserMarker from "@/features/map/canvas/UserMarker";
import CursorTracker from "@/features/map/canvas/CursorTracker";
import MapCursorController from "@/features/map/canvas/MapCursorController";
import MapClickPicker from "@/features/map/canvas/MapClickPicker";
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
const TIER2_MIN_ZOOM = -1; // at/above this zoom, tier-2 markers appear
const TIER3_MIN_ZOOM = 0; // at/above this zoom, tier-3 markers appear

/**
 * Viewport culling: only markers whose position falls inside the current map
 * bounds (expanded by this fraction on each side) are mounted. The padding
 * keeps a ring of off-screen markers ready so panning doesn't pop them in at
 * the edge. This is the main perf lever for the ~3.6k-marker maps: without it,
 * crossing a tier threshold bulk-mounts thousands of DOM markers in one frame.
 */
const VIEWPORT_PAD = 0.5;

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
  const { pickMode, createMarker, userMarkers, hideUserMarkers } =
    useUserMarkers();

  const regionNs = `regions/${selectedMap?.name}`;
  const { t } = useTranslation([regionNs]);
  const regionLabel = hoveredRegion
    ? t(`${regionNs}:${hoveredRegion.name}.name`)
    : "";

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
      style={{ cursor: pickMode ? "crosshair" : "default" }}
    >
      <MapContainer
        key={selectedMap.id}
        center={center}
        bounds={bounds}
        zoom={-3}
        minZoom={-3}
        maxZoom={2}
        zoomSnap={0.25}
        zoomDelta={0.25}
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
        <MapCursorController />
        <MapClickPicker createMarker={createMarker} />

        <MapContextMenu
          onOpenMenu={(state) => setContextMenu(state)}
          onCloseMenu={() => setContextMenu(null)}
        />

        <GameMapTiles selectedMap={selectedMap} />
        <GameMapBorders
          hoveredRegion={hoveredRegion}
          setHoveredRegion={setHoveredRegion}
        />

        {markers
          .filter((m) => {
            // Selection always overrides subtype filter, LOD and culling so the
            // focused marker (and its popup) render even when off-screen.
            if (selectedMarkerId === m.id) return true;
            // Subtype filter (as today).
            if (!visibleSubtypes?.has(m.subtype)) return false;
            // Tier-based level-of-detail gate.
            if (lodEnabled) {
              if (m.tier == null) return false;
              if (m.tier > visibleTierForZoom(zoom)) return false;
            }
            // Viewport culling: skip markers outside the padded visible bounds.
            // Computed last (after the cheap subtype/tier checks) and only once
            // `viewBounds` is known. Keeps the mounted DOM-marker count to the
            // on-screen subset, which is the main fix for zoom/pan stutter.
            if (viewBounds && !viewBounds.contains(dataToLatLng(selectedMap, m.x, m.y))) {
              return false;
            }
            return true;
          })
          .map((m) => (
            <GameMarker key={m.id} marker={m} onSelectMarker={onSelectMarker} />
          ))}

        {!hideUserMarkers
          ? userMarkers
              .filter((m) => m.type === "local")
              .map((m) => <UserMarker key={m.id} marker={m} />)
          : null}

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
      <MapStatusBar regionLabel={regionLabel} />

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
