// src/components/UserMarker.tsx
import React from "react";
import {Marker, Tooltip} from "react-leaflet";
import type {UserMarkerInstance} from "@/types/game";
import {useUserMarkers} from "@/context/UserMarkersContext.tsx";
import {useGameData} from "@/context/GameDataContext.tsx";
import {createPinIcon} from "@/utils/marker.tsx";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {parseIconUrl} from "@/utils/url.ts";
import {useTranslation} from "react-i18next";

const UserMarkerInner: React.FC<{ marker: UserMarkerInstance }> = ({marker}) => {
  const {setEditingMarker} = useUserMarkers();
  const {selectedMap} = useGameMap();
  const {allSubtypes} = useGameData();
  const {t} = useTranslation();

  if (!selectedMap) return null;

  const sub = [...allSubtypes.values()].find(v => v.id === marker.subtype);
  let innerIcon;
  if (sub?.icon) {
    innerIcon = parseIconUrl(sub.icon, selectedMap);
  } else {
    innerIcon = parseIconUrl("", selectedMap);
  }
  const iconScale = sub?.iconScale || 1.25;
  const icon = createPinIcon(innerIcon, iconScale, false);


  return (
    <Marker
      position={[marker.y, marker.x]}
      icon={icon}
      eventHandlers={{
        click: () => setEditingMarker(marker),
      }}
    >
      <Tooltip
        permanent
        direction="top"
        offset={[0, -15]}
        className="game-marker-tooltip"
      >
        {t("common:markerActions.userMarker", "User Marker")}
      </Tooltip>
    </Marker>
  );
};

const UserMarker = React.memo(UserMarkerInner)

export default UserMarker;