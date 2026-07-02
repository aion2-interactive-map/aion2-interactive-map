import React from "react";
import { useMapEvents } from "react-leaflet";
import { cursorStore } from "@/features/map/canvas/cursorStore";
import { useGameMap } from "@/context/GameMapContext";
import { latLngToData } from "@/lib/coords";

/**
 * Writes the live cursor map-coordinates into an external store (NOT React
 * state) so high-frequency mousemove never re-renders the map layer tree.
 * The bottom status bar subscribes to the store independently.
 */
const CursorTracker: React.FC = () => {
  const { selectedMap } = useGameMap();
  useMapEvents({
    mousemove(e) {
      if (!selectedMap) return;
      // Leaflet (lat, lng) → DATA (image-space) with the inverse vertical flip.
      const { x, y } = latLngToData(selectedMap, e.latlng.lat, e.latlng.lng);
      cursorStore.set(x, y);
    },
    mouseout() {
      cursorStore.clear();
    },
  });

  return null;
};

export default CursorTracker;
