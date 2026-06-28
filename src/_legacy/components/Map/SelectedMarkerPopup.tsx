import React from "react";
import { Popup, useMapEvents } from "react-leaflet";
import { useMarkers } from "@/context/MarkersContext";
import MarkerPopupContent from "@/components/Map/MarkerPopupContent";

type SelectedMarkerPopupProps = {
  onSelectMarker: (markerId: string | null) => void;
  selectedMarkerId: string | null | undefined;
};

const SelectedMarkerPopup: React.FC<SelectedMarkerPopupProps> = ({ onSelectMarker, selectedMarkerId }) => {
  const { markersById } = useMarkers();

  useMapEvents({
    click() {
      onSelectMarker(null);
    },
  });

  if (!selectedMarkerId) return null;

  const marker = markersById[selectedMarkerId];
  if (!marker) return null;

  return (
    <Popup
      position={[marker.y + 10, marker.x]}
      maxWidth={360}
      minWidth={360}
      autoPan={true}
      closeButton={false}
    >
      <MarkerPopupContent
        marker={marker}
        onSelectMarker={onSelectMarker}
      />
    </Popup>
  );
};

export default SelectedMarkerPopup;
