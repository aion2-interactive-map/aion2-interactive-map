import React, { useEffect } from "react";
import { Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { renderToString } from "react-dom/server";
import { MapPin } from "lucide-react";
import { useMarkers } from "@/context/MarkersContext";
import { useGameMap } from "@/context/GameMapContext";
import { MAP_FLY_TO_DURATION } from "@/lib/constants";
import { dataToLatLng } from "@/lib/coords";

function createFocusIcon(): L.DivIcon {
  const html = renderToString(
    <div
      style={{
        color: "#df1414",
        transform: "translate(-50%, -100%)",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
      }}
    >
      <MapPin size={32} fill="currentColor" />
    </div>,
  );

  return L.divIcon({
    html,
    className: "", // IMPORTANT: avoid Leaflet default styles
    iconSize: [24, 24],
    iconAnchor: [12, 24], // bottom-center
  });
}

type MarkerFocusControllerProps = {
  selectedMarkerId: string | null | undefined;
  selectedPosition: { x: number; y: number } | null | undefined;
};

const MarkerFocusController: React.FC<MarkerFocusControllerProps> = ({
  selectedMarkerId,
  selectedPosition,
}) => {
  const map = useMap();
  const { markersById } = useMarkers();
  const { selectedMap } = useGameMap();

  useEffect(() => {
    if (!map || !selectedMarkerId || !selectedMap) return;

    const marker = markersById[selectedMarkerId];
    if (!marker) return;

    // DATA (image-space) → Leaflet LatLng with the single vertical flip.
    const latLng = dataToLatLng(selectedMap, marker.x, marker.y);

    map.flyTo(latLng, map.getZoom(), { duration: MAP_FLY_TO_DURATION });
  }, [map, selectedMarkerId, markersById, selectedMap]);

  useEffect(() => {
    if (!map || !selectedPosition || !selectedMap) return;
    const latLng = dataToLatLng(
      selectedMap,
      selectedPosition.x,
      selectedPosition.y,
    );
    map.flyTo(latLng, map.getZoom(), { duration: MAP_FLY_TO_DURATION });
  }, [map, selectedPosition, selectedMap]);

  if (selectedPosition && selectedMap) {
    return (
      <Marker
        position={dataToLatLng(
          selectedMap,
          selectedPosition.x,
          selectedPosition.y,
        )}
        icon={createFocusIcon()}
        interactive={false}
      />
    );
  }

  return null;
};

export default MarkerFocusController;
