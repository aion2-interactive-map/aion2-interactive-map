import React, { memo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import { useTranslation } from "react-i18next";
import L from "leaflet";

import type { MarkerWithTranslations } from "@/types/game";
import { useMarkers } from "@/context/MarkersContext";
import { useGameMap } from "@/context/GameMapContext";
import { useGameData } from "@/context/GameDataContext";
import { createPinIcon } from "@/features/map/canvas/markerIcons";
import { parseIconUrl } from "@/lib/url";

type Props = {
  marker: MarkerWithTranslations;
  /**
   * Precomputed Leaflet position. GameMapView already projects every marker
   * through `dataToLatLng` for viewport culling, so it passes the result down
   * rather than have each marker recompute the same conversion.
   */
  position: L.LatLng;
  onSelectMarker?: (markerId: string) => void;
};

const GameMarkerInner: React.FC<Props> = ({
  marker,
  position,
  onSelectMarker,
}) => {
  const { selectedMap } = useGameMap();
  const { allSubtypes } = useGameData();
  const { showLabels, completedBySubtype } = useMarkers();
  const { t } = useTranslation();

  if (!selectedMap) return null;

  // Subtype definition (carries its category name, assigned in GameDataContext).
  const sub = allSubtypes.get(marker.subtype);
  const category = sub?.category;

  const subtypeLabel = t(`types:subtypes.${sub?.name}.name`);
  const iconScale = sub?.iconScale || 1.25;
  const hideTooltip = !!sub?.hideTooltip;

  let isCompleted = false;
  if (sub?.name && completedBySubtype[sub.name]) {
    const completedSet = completedBySubtype[sub.name];
    isCompleted = completedSet.has(marker.indexInSubtype);
  }

  // Resolve icon. Subtypes carry a distinct game-icon image; render that as
  // the marker (the "image" variant) for every category that has one,
  // including `location`. Only when a subtype has no icon do we fall back to
  // the circular Lanhu dot ("pin"), tinted with the subtype color or the
  // default blue.
  const rawIcon = marker.icon || sub?.icon || "";
  const innerIcon = parseIconUrl(rawIcon, selectedMap);
  let icon: L.DivIcon;
  if (category === "creature") {
    icon = createPinIcon(innerIcon, 0.9, isCompleted, "circular");
  } else if (!rawIcon) {
    // No game icon for this subtype: fall back to the circular dot. Use the
    // subtype color as the inner dot when provided (non-black); otherwise the
    // default Lanhu blue is used.
    const dot =
      sub?.color && sub.color !== "#000000" ? sub.color : undefined;
    icon = createPinIcon(innerIcon, iconScale, isCompleted, "pin", dot);
  } else {
    // Gathering nodes are numerous and dense; render them smaller than the
    // POI/location markers so the map stays readable.
    const imageScale = category === "gathering" ? 0.65 : iconScale;
    icon = createPinIcon(innerIcon, imageScale, isCompleted, "image");
  }

  const localizedName = marker.localizedName || marker.name || subtypeLabel;

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => {
          onSelectMarker?.(marker.id);
        },
      }}
    >
      {showLabels && !hideTooltip && (
        <Tooltip
          permanent
          direction="top"
          offset={[0, -15]}
          className="game-marker-tooltip"
        >
          {localizedName}
        </Tooltip>
      )}
    </Marker>
  );
};

const GameMarker = memo(GameMarkerInner);

export default GameMarker;
