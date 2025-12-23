import React from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

import type { UserMarkerInstance } from "@/types/game";
import { useUserMarkers } from "@/context/UserMarkersContext.tsx";
import { useGameData } from "@/context/GameDataContext.tsx";
import { useGameMap } from "@/context/GameMapContext.tsx";

import { createPinIcon } from "@/utils/marker.tsx";
import { parseIconUrl, getStaticUrl } from "@/utils/url.ts";
import { getUserMarkerLocalIcon } from "@/utils/userMarkerLocalIcons.ts";

import { useTranslation } from "react-i18next";

const LOCAL_ICON_WRAPPER_CLASS = [
  "w-[30px] h-[30px]",
  "rounded-full",
  "border border-white",
  "flex items-center justify-center",
  "shrink-0",
  "bg-[radial-gradient(50%_50%_at_50%_50%,_#2E97FF_75%,_rgba(22,23,23,0.7)_76%)]",
].join(" ");

const UserMarkerInner: React.FC<{ marker: UserMarkerInstance }> = ({ marker }) => {
  const { setEditingMarker } = useUserMarkers();
  const { selectedMap } = useGameMap();
  const { allSubtypes } = useGameData();
  const { t } = useTranslation();

  if (!selectedMap) return null;

  // Resolve subtype
  const subtype = [...allSubtypes.values()].find(
    (v) => v.id === marker.subtype,
  );

  // Base icon from subtype
  const baseInnerIcon = subtype?.icon
    ? parseIconUrl(subtype.icon, selectedMap)
    : parseIconUrl("", selectedMap);

  // Local icon override
  const localIconPath =
    marker.type === "local" ? getUserMarkerLocalIcon(marker) : null;

  const innerIcon = localIconPath
    ? getStaticUrl(localIconPath)
    : baseInnerIcon;

  const iconScale = localIconPath ? 1.0 : subtype?.iconScale ?? 1.25;

  // Local marker: custom wrapper with gradient
  const icon =
    marker.type === "local"
      ? new L.DivIcon({
        className: "",
        html: `
            <div class="${LOCAL_ICON_WRAPPER_CLASS}">
              <img
                src="${innerIcon}"
                class="w-[22px] h-[22px] object-contain pointer-events-none select-none"
                draggable="false"
              />
            </div>
          `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15],
      })
      : createPinIcon(innerIcon, iconScale, false);

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

const UserMarker = React.memo(UserMarkerInner);

export default UserMarker;
