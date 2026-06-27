import { useRef, useState } from "react";
import type { MapRef } from "@/types/game";
import GameMapView from "@/features/map/canvas/GameMapView";

export default function MapRoute() {
  const mapRef = useRef<MapRef>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedPosition] = useState<{ x: number; y: number } | null>(null);
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <GameMapView
        mapRef={mapRef}
        onSelectMarker={setSelectedMarkerId}
        selectedMarkerId={selectedMarkerId}
        selectedPosition={selectedPosition}
      />
    </div>
  );
}
