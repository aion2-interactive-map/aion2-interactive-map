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

// Popup vertical offset. Leaflet places the popup's card bottom edge at
// `-offset.y` above the marker point, so -18 sits the card bottom 18px above
// the point — the same height as the marker name tooltip's box bottom
// (Tooltip offset [0,-18] in GameMarker.tsx), so the popup and tooltip share a
// common bottom edge. The card's downward ::after triangle then hangs ~8px
// below that toward the icon. Module-level so the reference stays stable across
// re-renders (see the `position` memo note below).
const POPUP_OFFSET: [number, number] = [0, -18];

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
