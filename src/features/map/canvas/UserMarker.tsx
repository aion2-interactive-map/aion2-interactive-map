import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

import type { UserMarkerInstance } from "@/types/game";
import { useUserMarkers } from "@/context/UserMarkersContext";
import { useGameMap } from "@/context/GameMapContext";

import { getUserMarkerLocalIcon } from "@/features/map/canvas/markerIcons";
import { getStaticUrl } from "@/lib/url";
import { dataToLatLngTuple } from "@/lib/coords";
import { useTranslation } from "react-i18next";

const LOCAL_ICON_WRAPPER_CLASS = [
  "w-full h-full",
  "rounded-full",
  "border border-white",
  "flex items-center justify-center",
  "shrink-0",
  "bg-[radial-gradient(50%_50%_at_50%_50%,_#2E97FF_75%,_rgba(22,23,23,0.7)_76%)]",
].join(" ");

const UserMarkerInner: React.FC<{ marker: UserMarkerInstance }> = ({
  marker,
}) => {
  const { removeMarker } = useUserMarkers();
  const { selectedMap } = useGameMap();
  const { t } = useTranslation();

  if (!selectedMap) return null;

  const localIconPath = getUserMarkerLocalIcon(marker);
  const innerIcon = localIconPath ? getStaticUrl(localIconPath) : "";

  const iconScale = 1;
  const iconSize = 40 * iconScale;

  const icon = new L.DivIcon({
    className: "",
    html: `
      <div class="${LOCAL_ICON_WRAPPER_CLASS}">
        <img
          src="${innerIcon}"
          class="object-contain pointer-events-none select-none"
          style="width:${iconSize * 0.7}px;height:${iconSize * 0.7}px"
          draggable="false"
          alt="${marker.localType ?? ""}"
        />
      </div>
    `,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
    popupAnchor: [0, -iconSize / 2],
  });

  return (
    <Marker position={dataToLatLngTuple(selectedMap, marker.x, marker.y)} icon={icon}>
      <Popup>
        <button
          type="button"
          className="text-sm text-destructive hover:underline"
          onClick={() => removeMarker(marker.id)}
        >
          {t("common:markerActions.remove", "Remove")}
        </button>
      </Popup>
    </Marker>
  );
};

const UserMarker = React.memo(UserMarkerInner);

export default UserMarker;
