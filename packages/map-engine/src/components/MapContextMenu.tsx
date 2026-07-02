import React from "react";
import { useMapEvents } from "react-leaflet";
import type { GameMapMeta } from "@gamemap/data-contract";
import { latLngToData } from "../coords.ts";

export type ContextMenuState = {
  x: number; // screen coords (relative to map container)
  y: number;
  mapX: number; // map coords (x, y system)
  mapY: number;
};

type MapContextMenuProps = {
  map: GameMapMeta;
  onOpenMenu: (state: ContextMenuState) => void;
  onCloseMenu: () => void;
};

const MapContextMenu: React.FC<MapContextMenuProps> = ({
  map,
  onOpenMenu,
  onCloseMenu,
}) => {
  const leafletMap = useMapEvents({
    contextmenu(e) {
      e.originalEvent.preventDefault();

      // Leaflet (lat, lng) → DATA (image-space) with the inverse vertical flip.
      const { x: mapX, y: mapY } = latLngToData(map, e.latlng.lat, e.latlng.lng);

      const containerPoint = leafletMap.latLngToContainerPoint(e.latlng);

      onOpenMenu({
        x: containerPoint.x,
        y: containerPoint.y,
        mapX,
        mapY,
      });
    },
    click() {
      onCloseMenu();
    },
    movestart() {
      onCloseMenu();
    },
    zoomstart() {
      onCloseMenu();
    },
  });

  return null;
};

export default MapContextMenu;
