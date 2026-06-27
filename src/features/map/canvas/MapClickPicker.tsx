import React from "react";
import { useMapEvents } from "react-leaflet";
import { useUserMarkers } from "@/context/UserMarkersContext";

type MapClickPickerProps = {
  createMarker: (x: number, y: number) => void;
};

const MapClickPicker: React.FC<MapClickPickerProps> = ({ createMarker }) => {
  const { pickMode } = useUserMarkers();

  useMapEvents({
    click(e) {
      if (!pickMode) return;

      // CRS.Simple: lat = y, lng = x
      const x = e.latlng.lng;
      const y = e.latlng.lat;

      createMarker(x, y);
    },
  });

  return null;
};

export default MapClickPicker;
