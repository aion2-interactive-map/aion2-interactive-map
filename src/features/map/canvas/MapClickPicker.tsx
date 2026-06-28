import React from "react";
import { useMapEvents } from "react-leaflet";
import { useUserMarkers } from "@/context/UserMarkersContext";
import { useGameMap } from "@/context/GameMapContext";
import { latLngToData } from "@/lib/coords";

type MapClickPickerProps = {
  createMarker: (x: number, y: number) => void;
};

const MapClickPicker: React.FC<MapClickPickerProps> = ({ createMarker }) => {
  const { pickMode } = useUserMarkers();
  const { selectedMap } = useGameMap();

  useMapEvents({
    click(e) {
      if (!pickMode || !selectedMap) return;

      // Leaflet (lat, lng) → DATA (image-space) with the inverse vertical flip.
      const { x, y } = latLngToData(selectedMap, e.latlng.lat, e.latlng.lng);

      createMarker(x, y);
    },
  });

  return null;
};

export default MapClickPicker;
