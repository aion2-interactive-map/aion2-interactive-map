import React, { useMemo } from "react";
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

  const marker = selectedMarkerId ? markersById[selectedMarkerId] : null;

  // DATA (image-space) → Leaflet [lat, lng] with the single vertical flip.
  // Memoize so the tuple keeps a STABLE reference across pan/zoom re-renders
  // (coords don't change). react-leaflet's popup lifecycle effect lists
  // `position` in its deps; a fresh array each render would tear the popup
  // layer down and re-open it (replaying the fade-in) — a visible blink after
  // every drag/zoom `moveend`.
  // `marker` is referentially stable across pan/zoom re-renders (markersById is
  // memoized on the loaded markers), so this tuple's reference only changes when
  // the selection or map actually changes — not on every drag/zoom moveend.
  const position = useMemo<[number, number] | null>(
    () =>
      selectedMap && marker
        ? dataToLatLngTuple(selectedMap, marker.x, marker.y)
        : null,
    [selectedMap, marker],
  );

  if (!position || !marker) return null;

  return (
    <Popup
      position={position}
      autoPan
      closeButton={false}
      eventHandlers={{ remove: () => onSelectMarker(null) }}
    >
      <MarkerPopupContent marker={marker} />
    </Popup>
  );
};

export default SelectedMarkerPopup;
