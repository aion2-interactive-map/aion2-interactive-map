import React from "react";
import { useMapEvents } from "react-leaflet";
import { useUserMarkers } from "@/context/UserMarkersContext";

type MapClickPickerProps = {
  createMarker: (mapX: number, mapY: number) => void;
};

const MapClickPicker: React.FC<MapClickPickerProps> = ({ createMarker }) => {
  const { pickMode } = useUserMarkers();

  useMapEvents({
    click(e) {
      if (!pickMode) return;

      const mapX = e.latlng.lng;
      const mapY = e.latlng.lat;

      createMarker(mapX, mapY);
    },
  });

  return null;
};

export default MapClickPicker;
