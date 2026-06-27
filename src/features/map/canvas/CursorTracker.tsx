import React from "react";
import { useMapEvents } from "react-leaflet";
import { cursorStore } from "@/features/map/canvas/cursorStore";

/**
 * Writes the live cursor map-coordinates into an external store (NOT React
 * state) so high-frequency mousemove never re-renders the map layer tree.
 * The bottom status bar subscribes to the store independently.
 */
const CursorTracker: React.FC = () => {
  useMapEvents({
    mousemove(e) {
      // CRS.Simple: lat = y, lng = x
      cursorStore.set(e.latlng.lng, e.latlng.lat);
    },
    mouseout() {
      cursorStore.clear();
    },
  });

  return null;
};

export default CursorTracker;
