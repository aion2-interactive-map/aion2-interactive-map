import React from "react";
import { Popup } from "react-leaflet";

import { useMarkers } from "@/context/MarkersContext";
import { useGameMap } from "@/context/GameMapContext";
import MarkerPopupContent from "@/features/map/popup/MarkerPopupContent";
import { dataToLatLngTuple } from "@/lib/coords";

type Props = {
  selectedMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
};

const SelectedMarkerPopup: React.FC<Props> = ({
  selectedMarkerId,
  onSelectMarker,
}) => {
  const { markersById } = useMarkers();
  const { selectedMap } = useGameMap();

  if (!selectedMarkerId || !selectedMap) return null;

  const marker = markersById[selectedMarkerId];
  if (!marker) return null;

  // DATA (image-space) → Leaflet [lat, lng] with the single vertical flip.
  return (
    <Popup
      position={dataToLatLngTuple(selectedMap, marker.x, marker.y)}
      autoPan
      closeButton={false}
      eventHandlers={{ remove: () => onSelectMarker(null) }}
    >
      <MarkerPopupContent marker={marker} />
    </Popup>
  );
};

export default SelectedMarkerPopup;
