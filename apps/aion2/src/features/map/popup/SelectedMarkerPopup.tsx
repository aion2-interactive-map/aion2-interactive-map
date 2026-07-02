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

// Popup vertical offset, tuned so the popup card bottom lines up with the marker
// name tooltip's box bottom (~25px above the marker point). NOTE the two do NOT
// share the same offset→bottom relationship: Leaflet's popup wrapper reserves a
// large fixed gap below the point (measured: offset -18 lands the card bottom
// ~39px above the point), whereas a `direction=top` tooltip lands its box bottom
// only ~6.5px higher than -offset.y (offset -18 → ~24.5px above). So to co-locate
// the two bottoms the popup needs a much smaller magnitude (-4 → ~25px above)
// than the tooltip (-18). The card's downward ::after triangle then hangs ~8px
// below that toward the icon. Module-level so the reference stays stable across
// re-renders (see the `position` memo note below).
const POPUP_OFFSET: [number, number] = [0, -4];

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
      // React (`selectedMarkerId`) is the single source of truth for whether the
      // popup is open. Leaflet's default `closePopupOnClick`/`autoClose` would
      // close the popup out-of-band on `preclick` — which fires for EVERY click,
      // including on a marker. On a double-click, click 2's `preclick` schedules
      // `onSelectMarker(null)` while the marker's own `click` schedules
      // `onSelectMarker(id)` in the same React batch; `id` wins, so React keeps
      // the marker "selected" (tooltip hidden) while Leaflet has actually closed
      // the popup — and since the props never changed, it never reopens (the
      // marker gets stuck: no tooltip, no popup). Disabling both leaves closing
      // entirely to React: a map-background click deselects (GameMapView), and
      // the `remove` handler below covers the unmount path.
      closeOnClick={false}
      autoClose={false}
      eventHandlers={{ remove: () => onSelectMarker(null) }}
    >
      <MarkerPopupContent marker={marker} />
    </Popup>
  );
};

export default SelectedMarkerPopup;
