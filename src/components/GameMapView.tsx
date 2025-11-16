// src/components/GameMapView.tsx
import React from "react";
import { MapContainer, ImageOverlay } from "react-leaflet";
import L from "leaflet";

import GameMarker from "./GameMarker";

import type {
  GameMapMeta,
  MapRef,
  MarkerInstance,
  MarkerTypeCategory,
} from "../types/game";

type Props = {
  selectedMap: GameMapMeta | null;
  markers: MarkerInstance[];
  mapRef: React.RefObject<MapRef>;
  visibleSubtypes: Set<string>;
  types: MarkerTypeCategory[];
  showLabels: boolean;
};

const GameMapView: React.FC<Props> = ({
                                        selectedMap,
                                        markers,
                                        mapRef,
                                        visibleSubtypes,
                                        types,
                                        showLabels,
                                      }) => {
  if (!selectedMap) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-default-500">
        No map selected.
      </div>
    );
  }

  // Leaflet simple CRS uses [y, x] for bounds and center
  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [selectedMap.height, selectedMap.width],
  ];

  const center: [number, number] = [
    selectedMap.height / 2,
    selectedMap.width / 2,
  ];

  const base = import.meta.env.BASE_URL ?? "/";
  const imageUrl =
    base + selectedMap.imageUrl.replace(/^\//, "");

  return (
    <div className="flex-1 relative">
      <MapContainer
        key={selectedMap.id}
        center={center}
        zoom={0}
        minZoom={-2}
        maxZoom={2}
        crs={L.CRS.Simple}
        className="w-full h-full"
        attributionControl={false}
        ref={mapRef as any}
      >
        <ImageOverlay url={imageUrl} bounds={bounds} />

        {markers
          .filter((m) =>
            visibleSubtypes.has(
              `${m.categoryId}::${m.subtypeId}`,
            ),
          )
          .map((m) => (
            <GameMarker
              key={`${m.categoryId}-${m.subtypeId}-${m.id}`}
              mapId={selectedMap.id}
              marker={m}
              types={types}
              showLabel={showLabels}
            />
          ))}
      </MapContainer>
    </div>
  );
};

export default GameMapView;
