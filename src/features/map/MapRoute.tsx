import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    if (appliedDeepLink.current || Object.keys(markersById).length === 0) {
      return;
    }
    appliedDeepLink.current = true;

    const markerId = getQueryParam("marker");
    const pos = getQueryParam("pos");
    if (markerId && markersById[markerId]) {
      setSelectedMarkerId(markerId);
      setSelectedPosition({
        x: markersById[markerId].x,
        y: markersById[markerId].y,
      });
      return;
    }

    if (pos) {
      const [x, y] = pos.split(",").map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        setSelectedPosition({ x, y });
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
            onSelectMarker={setSelectedMarkerId}
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
