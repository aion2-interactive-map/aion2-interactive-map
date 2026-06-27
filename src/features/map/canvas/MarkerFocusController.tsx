import React, { useEffect } from "react";
import { Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { renderToString } from "react-dom/server";
import { MapPin } from "lucide-react";
import { useMarkers } from "@/context/MarkersContext";
import { MAP_FLY_TO_DURATION } from "@/lib/constants";

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

  useEffect(() => {
    if (!map || !selectedMarkerId) return;

    const marker = markersById[selectedMarkerId];
    if (!marker) return;

    // Leaflet uses [lat, lng]; y=lat, x=lng:
    const latLng: [number, number] = [marker.y, marker.x];

    map.flyTo(latLng, map.getZoom(), { duration: MAP_FLY_TO_DURATION });
  }, [map, selectedMarkerId, markersById]);

  useEffect(() => {
    if (!map || !selectedPosition) return;
    const latLng: [number, number] = [selectedPosition.y, selectedPosition.x];
    map.flyTo(latLng, map.getZoom(), { duration: MAP_FLY_TO_DURATION });
  }, [map, selectedPosition]);

  if (selectedPosition) {
    return (
      <Marker
        position={new L.LatLng(selectedPosition.y, selectedPosition.x)}
        icon={createFocusIcon()}
        interactive={false}
      />
    );
  }

  return null;
};

export default MarkerFocusController;
