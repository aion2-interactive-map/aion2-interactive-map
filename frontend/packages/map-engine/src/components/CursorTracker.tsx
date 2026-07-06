import React from "react";
import { useMapEvents } from "react-leaflet";
import type { GameMapMeta } from "@gamemap/data-contract";
import { cursorStore } from "../cursorStore.ts";
import { latLngToData } from "../coords.ts";

type Props = {
  map: GameMapMeta;
};

/**
 * Writes the live cursor map-coordinates into an external store (NOT React
 * state) so high-frequency mousemove never re-renders the map layer tree.
 * The bottom status bar subscribes to the store independently.
 */
const CursorTracker: React.FC<Props> = ({ map }) => {
  useMapEvents({
    mousemove(e) {
      // Leaflet (lat, lng) → DATA (image-space) with the inverse vertical flip.
      const { x, y } = latLngToData(map, e.latlng.lat, e.latlng.lng);
      cursorStore.set(x, y);
    },
    mouseout() {
      cursorStore.clear();
    },
  });

  return null;
};

export default CursorTracker;
