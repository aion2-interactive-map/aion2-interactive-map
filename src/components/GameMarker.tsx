// src/components/GameMarker.tsx
import React, {memo, useRef} from "react";
import {Marker, Tooltip, Popup } from "react-leaflet";
import { useTranslation } from "react-i18next";
import L, {Popup as LeafletPopup} from "leaflet";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {  faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { renderToString } from "react-dom/server";

import MarkerPopupContent from "./MarkerPopupContent";

import type {GameMapMeta, MarkerInstance, MarkerTypeCategory, MarkerTypeSubtype} from "../types/game";
import {parseIconUrl} from "../utils/url.ts";

type Props = {
  map: GameMapMeta;
  marker: MarkerInstance;
  types: MarkerTypeCategory[];
  subtypes: Map<string, MarkerTypeSubtype>;
  showLabel: boolean;
  completedSet: Set<string>;
  toggleMarkerCompleted: (marker: MarkerInstance) => void;
};

/** Lookup icon definition from YAML (by category/subtype). */
function getSubtypeIconDef(sub: MarkerTypeSubtype | undefined, map: GameMapMeta): string {
  return parseIconUrl(sub?.icon || "", map);
}

/** Lookup color from YAML (subtype > category > default). */
/*function getSubtypeColor(
  sub?: MarkerTypeSubtype, cat?: MarkerTypeCategory,
): string {
  return "#FFFFFF";
  return (
    sub?.color ||
    cat?.color ||
    "#E53935"
  );
}*/

function createPinIcon(
  innerIcon: string,
  iconScale: number,
  completed: boolean,
): L.DivIcon {
  const iconBaseSize = 40;
  const iconSize = iconBaseSize * iconScale;
  const html = renderToString(
    <div
      style={{
        position: "relative",
        width: `${iconBaseSize}px`,
        height: `${iconBaseSize}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: completed ? 0.4 : 1,
      }}
    >
      {/* Inner icon directly */}
      <img
        src={innerIcon}
        alt=""
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          objectFit: "contain",
          pointerEvents: "none",
          zIndex: 1000,
        }}
      />

      {completed && (
        <FontAwesomeIcon
          icon={faCheckCircle}
          style={{
            position: "absolute",
            fontSize: "12px",
            right: "-2px",
            bottom: "-2px",
            color: "#22c55e",
          }}
        />
      )}
    </div>,
  );

  return L.divIcon({
    html,
    className: "",
    iconSize: [iconBaseSize, iconBaseSize],
    iconAnchor: [iconBaseSize / 2, iconBaseSize / 2], // center of the icon
    popupAnchor: [0, -10], // popup above icon
  });
}


const GameMarkerInner: React.FC<Props> = ({
                                       map,
                                       marker,
                                       types,
                                       subtypes,
                                       showLabel,
                                       completedSet,
                                       toggleMarkerCompleted,
                                     }) => {

  // Namespace for this map's markers (ensures markers/world.yaml loads)
  // console.log(marker)
  const popupRef = useRef<LeafletPopup>(null);

  const markerNs = `markers/${map.name}`;
  const regionNs = `regions/${map.name}`;
  const { t } = useTranslation([markerNs, regionNs]);

  const markerKeyPrefix = `${markerNs}:${marker.id}`;
  const regionKeyPrefix = `${regionNs}:${marker.region}`;

  // Find subtype and category definition
  const sub = subtypes.get(marker.subtype);
  const cat = types.find((c) => c.name === sub?.category);

  // Category & subtype labels from types namespace (fully-qualified keys)
  const categoryLabel = t(
    `types:categories.${cat?.name}.name`,
  );
  const subtypeLabel = t(
    `types:subtypes.${sub?.name}.name`,
  );
  const regionLabel = marker.region ? t(`${regionKeyPrefix}.name`) : "";
  const iconScale = sub?.iconScale || 1.0;
  const canComplete = !!sub?.canComplete;
  const hideTooltip = !!sub?.hideTooltip;

  // Completion key is stored per map in useMarkers; here we just build the same key
  const completedKey = marker.id;
  const isCompleted = completedSet.has(completedKey);

  // find icon and color
  const innerIcon = getSubtypeIconDef(sub, map);
  // const pinColor = getSubtypeColor(sub, cat);

  const icon = createPinIcon(innerIcon, iconScale, isCompleted);

  // Localized marker name with fallback to id
  let localizedName = t(`${markerKeyPrefix}.name`, "");
  if (!localizedName) {
    localizedName = subtypeLabel;
  }

  // Localized description with fallback text
  const description = t(
    `${markerKeyPrefix}.description`,
    "No description available yet.",
  );

  return (
    <Marker
      position={new L.LatLng(marker.y, marker.x)}
      icon={icon}
    >
      {(showLabel && !hideTooltip) && (
        <Tooltip
          permanent
          direction="top"
          offset={[0, -15]}
          className="game-marker-tooltip"
        >
          {localizedName}
        </Tooltip>
      )}

      <Popup maxWidth={360} minWidth={360} autoPan={true} closeButton={false} ref={popupRef}>
        <MarkerPopupContent
          name={localizedName}
          categoryLabel={categoryLabel}
          subtypeLabel={subtypeLabel}
          regionLabel={regionLabel}
          x={marker.x}
          y={marker.y}
          images={marker.images}
          description={description}
          canComplete={canComplete}
          completed={isCompleted}
          onToggleCompleted={() => {
            if (!isCompleted) popupRef?.current?.close();
            toggleMarkerCompleted(marker);
          }}
        />
      </Popup>
    </Marker>
  );
};

const GameMarker = memo(GameMarkerInner);

export default GameMarker;
