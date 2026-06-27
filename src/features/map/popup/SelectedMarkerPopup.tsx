import React from "react";
import { Popup } from "react-leaflet";

import { useMarkers } from "@/context/MarkersContext";
import MarkerPopupContent from "@/features/map/popup/MarkerPopupContent";

type Props = {
  selectedMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
};

const SelectedMarkerPopup: React.FC<Props> = ({
  selectedMarkerId,
  onSelectMarker,
}) => {
  const { markersById } = useMarkers();

  if (!selectedMarkerId) return null;

  const marker = markersById[selectedMarkerId];
  if (!marker) return null;

  // CRS.Simple → LatLng(y, x)
  return (
    <Popup
      position={[marker.y, marker.x]}
      autoPan
      closeButton={false}
      eventHandlers={{ remove: () => onSelectMarker(null) }}
    >
      <MarkerPopupContent marker={marker} />
    </Popup>
  );
};

export default SelectedMarkerPopup;
