import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useUserMarkers } from "@/context/UserMarkersContext";
import { getStaticUrl } from "@/utils/url";

const MapCursorController: React.FC = () => {
  const map = useMap();
  const { pickMode } = useUserMarkers();

  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = pickMode ? `url(${getStaticUrl("images/CursorAdd.png")}) 22 63, crosshair` : "grab";
  }, [map, pickMode]);

  return null;
};

export default MapCursorController;
