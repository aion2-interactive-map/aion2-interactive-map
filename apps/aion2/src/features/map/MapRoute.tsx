import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MapRef } from "@/types/game";
import type { EngineMarker } from "@/features/map/engineTypes";
import { useGameMap } from "@/context/GameMapContext";
import { useMarkers } from "@/context/MarkersContext";
import { useGameData } from "@/context/GameDataContext";
import { useSubzoneLookup } from "@/features/map/useSubzoneLookup";
import GameMapView from "@/features/map/canvas/GameMapView";
import Sidebar from "@/features/map/sidebar/Sidebar";
import SearchPanel from "@/features/map/search/SearchPanel";
import TopNavbar from "@/components/TopNavbar";
import { getQueryParam } from "@/lib/url";
import { MAP_FLY_TO_DURATION } from "@/lib/constants";

export default function MapRoute() {
  const mapRef = useRef<MapRef>(null);
  const appliedDeepLink = useRef(false);

  // App contexts → engine props. MapRoute is the ADAPTER: the canvas/popup
  // components under features/map/canvas (+ SelectedMarkerPopup) read no app
  // context themselves; everything they need is derived here and passed down.
  const { selectedMap } = useGameMap();
  const { markers, markersById, regions, showLabels, completedBySubtype } =
    useMarkers();
  const { visibleSubtypes, visibleRegions, showBorders, lodEnabled, allSubtypes } =
    useGameData();
  const subzoneAt = useSubzoneLookup();
  const { t } = useTranslation();

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  /**
   * App markers (already translated) + subtype taxonomy + completion state →
   * the pre-resolved `EngineMarker[]` the engine components consume.
   *
   * Memoization matters: this feeds thousands of memoized `GameMarker`s, and
   * `GameMapView` keys its per-marker `LatLng` cache on this array. The array
   * (and every object in it) is reference-stable across pan/zoom re-renders —
   * it is rebuilt only when the marker set, taxonomy, translations or
   * completion state actually change (completion changes re-rendered every
   * marker under the old context wiring too).
   */
  const engineMarkers = useMemo<EngineMarker[]>(
    () =>
      markers.map((m) => {
        const sub = allSubtypes.get(m.subtype);
        let completed = false;
        if (sub?.name && completedBySubtype[sub.name]) {
          completed = completedBySubtype[sub.name].has(m.indexInSubtype);
        }
        return {
          ...m,
          subtypeMeta: sub,
          subtypeLabel: t(`types:subtypes.${sub?.name}.name`),
          completed,
        };
      }),
    [markers, allSubtypes, completedBySubtype, t],
  );

  // Marker-click selection is a TOGGLE: clicking the already-selected marker
  // (including the second click of a double-click) deselects it and closes the
  // popup. A functional update reads the latest committed selection, so it stays
  // correct even when a double-click's two clicks land in quick succession.
  // Passing `null` always deselects (`prev === null ? null : null`), so the
  // map-background-click and popup-unmount paths that call this with `null` keep
  // working. Search selects directly via `setSelectedMarkerId` (never toggles).
  const handleToggleMarker = useCallback((id: string | null) => {
    setSelectedMarkerId((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    if (appliedDeepLink.current || Object.keys(markersById).length === 0) {
      return;
    }
    appliedDeepLink.current = true;

    const markerId = getQueryParam("marker");
    const pos = getQueryParam("pos");
    if (markerId && markersById[markerId]) {
      const marker = markersById[markerId];
      queueMicrotask(() => {
        setSelectedMarkerId(markerId);
        setSelectedPosition({
          x: marker.x,
          y: marker.y,
        });
      });
      return;
    }

    if (pos) {
      const [x, y] = pos.split(",").map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        queueMicrotask(() => setSelectedPosition({ x, y }));
      }
    }
  }, [markersById]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <TopNavbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="relative flex flex-1 overflow-hidden">
          <GameMapView
            mapRef={mapRef}
            map={selectedMap}
            markers={engineMarkers}
            regions={regions}
            visibleSubtypes={visibleSubtypes}
            visibleRegions={visibleRegions}
            showLabels={showLabels}
            showBorders={showBorders}
            lodEnabled={lodEnabled}
            selectedMarkerId={selectedMarkerId}
            selectedPosition={selectedPosition}
            onToggleMarker={handleToggleMarker}
            subzoneAt={subzoneAt}
            flyToDuration={MAP_FLY_TO_DURATION}
          />
          <SearchPanel
            onSelectMarker={setSelectedMarkerId}
            onFlyTo={setSelectedPosition}
          />
        </div>
      </div>
    </div>
  );
}
