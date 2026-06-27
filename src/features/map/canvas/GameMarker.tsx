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
  onSelectMarker?: (markerId: string) => void;
};

const GameMarkerInner: React.FC<Props> = ({ marker, onSelectMarker }) => {
  const { selectedMap, types } = useGameMap();
  const { allSubtypes } = useGameData();
  const { showLabels, completedBySubtype } = useMarkers();
  const { t } = useTranslation();

  if (!selectedMap) return null;

  // Find subtype and category definition
  const sub = allSubtypes.get(marker.subtype);
  const cat = types.find((c) => c.name === sub?.category);

  const subtypeLabel = t(`types:subtypes.${sub?.name}.name`);
  const iconScale = sub?.iconScale || 1.25;
  const hideTooltip = !!sub?.hideTooltip;

  let isCompleted = false;
  if (sub?.name && completedBySubtype[sub.name]) {
    const completedSet = completedBySubtype[sub.name];
    isCompleted = completedSet.has(marker.indexInSubtype);
  }

  // Resolve icon
  const innerIcon = parseIconUrl(marker.icon || sub?.icon || "", selectedMap);
  let icon: L.DivIcon;
  if (cat?.name === "creature") {
    icon = createPinIcon(innerIcon, 0.9, isCompleted, true);
  } else {
    icon = createPinIcon(innerIcon, iconScale, isCompleted);
  }

  const localizedName = marker.localizedName || marker.name || subtypeLabel;

  return (
    <Marker
      position={new L.LatLng(marker.y, marker.x)}
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
