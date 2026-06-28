import React from "react";
import { useMapEvents } from "react-leaflet";

type CursorTrackerProps = {
  onUpdate: (x: number, y: number) => void;
};

const CursorTracker: React.FC<CursorTrackerProps> = ({ onUpdate }) => {
  useMapEvents({
    mousemove(e) {
      const { lat, lng } = e.latlng;
      // CRS.Simple: lat = y, lng = x
      onUpdate(lng, lat);
    },
  });

  return null;
};

export default CursorTracker;
