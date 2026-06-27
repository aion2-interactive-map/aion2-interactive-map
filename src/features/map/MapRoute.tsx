import { useRef, useState } from "react";
import type { MapRef } from "@/types/game";
import GameMapView from "@/features/map/canvas/GameMapView";
import Sidebar from "@/features/map/sidebar/Sidebar";

export default function MapRoute() {
  const mapRef = useRef<MapRef>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
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
  );
}
