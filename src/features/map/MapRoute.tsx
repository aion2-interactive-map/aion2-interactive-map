import { useRef, useState } from "react";
import type { MapRef } from "@/types/game";
import GameMapView from "@/features/map/canvas/GameMapView";
import Sidebar from "@/features/map/sidebar/Sidebar";
import TopNavbar from "@/components/TopNavbar";

export default function MapRoute() {
  const mapRef = useRef<MapRef>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <TopNavbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onSelectMarker={setSelectedMarkerId}
          onFlyTo={setSelectedPosition}
        />
        <GameMapView
          mapRef={mapRef}
          onSelectMarker={setSelectedMarkerId}
          selectedMarkerId={selectedMarkerId}
          selectedPosition={selectedPosition}
        />
      </div>
    </div>
  );
}
