// src/components/GameMarker.tsx
import L from "leaflet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {  faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { renderToString } from "react-dom/server";

import type {GameMapMeta, MarkerTypeSubtype} from "../types/game";
import {parseIconUrl} from "../utils/url.ts";


/** Lookup icon definition from YAML (by category/subtype). */
export function getSubtypeIconDef(sub: MarkerTypeSubtype | undefined, map: GameMapMeta): string {
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

export function createPinIcon(
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