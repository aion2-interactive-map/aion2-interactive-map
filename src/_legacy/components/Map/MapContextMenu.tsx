import React from "react";
import { useMapEvents } from "react-leaflet";
import { useUserMarkers } from "@/context/UserMarkersContext";

export type ContextMenuState = {
  x: number;      // screen coords (relative to map container)
  y: number;
  mapX: number;   // map coords (your [x, y] system)
  mapY: number;
};

type MapContextMenuProps = {
  onOpenMenu: (state: ContextMenuState) => void;
  onCloseMenu: () => void;
};

const MapContextMenu: React.FC<MapContextMenuProps> = ({ onOpenMenu, onCloseMenu }) => {
  const { setPickMode, pickMode } = useUserMarkers();

  const map = useMapEvents({
    contextmenu(e) {
      // Right-click on map
      e.originalEvent.preventDefault();
      if (pickMode) {
        setPickMode(false);
        return;
      }

      // Leaflet CRS.Simple: lat = y, lng = x
      const mapX = e.latlng.lng;
      const mapY = e.latlng.lat;

      const containerPoint = map.latLngToContainerPoint(e.latlng);

      onOpenMenu({
        x: containerPoint.x,
        y: containerPoint.y,
        mapX,
        mapY,
      });
    },
    click() {
      // Left-click anywhere on map closes menu
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
