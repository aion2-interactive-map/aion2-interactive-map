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

// Lift the popup so its downward triangle (the card's ::after, ~9px tall,
// hanging below the card bottom) sits just above the 40px, center-anchored
// marker icon whose top edge is ~20px above the point. Leaflet places the
// popup's bottom edge at `-offset.y` above the point, so the card bottom sits
// 28px up and the triangle tip lands ~20px up — right at the icon's top.
// Module-level so the reference stays stable across re-renders (see the
// `position` memo note below).
const POPUP_OFFSET: [number, number] = [0, -28];

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
      offset={POPUP_OFFSET}
      className="marker-popup"
      // Match the 320px card. Leaflet's default maxWidth (300px) would clamp the
      // wrapper narrower than the card, so the centered tip lands left of the
      // card's true centre. Sizing the wrapper to the card re-centres the tip.
      maxWidth={320}
      minWidth={320}
      autoPan
      closeButton={false}
      eventHandlers={{ remove: () => onSelectMarker(null) }}
    >
      <MarkerPopupContent marker={marker} />
    </Popup>
  );
};

export default SelectedMarkerPopup;
