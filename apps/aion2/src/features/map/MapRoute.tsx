import { useCallback, useEffect, useRef, useState } from "react";
import type { MapRef } from "@/types/game";
import { useMarkers } from "@/context/MarkersContext";
import GameMapView from "@/features/map/canvas/GameMapView";
import Sidebar from "@/features/map/sidebar/Sidebar";
import SearchPanel from "@/features/map/search/SearchPanel";
import TopNavbar from "@/components/TopNavbar";
import { getQueryParam } from "@/lib/url";

export default function MapRoute() {
  const mapRef = useRef<MapRef>(null);
  const appliedDeepLink = useRef(false);
  const { markersById } = useMarkers();
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

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
            onSelectMarker={handleToggleMarker}
            selectedMarkerId={selectedMarkerId}
            selectedPosition={selectedPosition}
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
