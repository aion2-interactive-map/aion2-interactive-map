// src/components/GameMarker.tsx
import React from "react";
import { Marker, Tooltip, Popup } from "react-leaflet";
import { useTranslation } from "react-i18next";
import L from "leaflet";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as SolidIcons from "@fortawesome/free-solid-svg-icons";
import { faLocationPin, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { renderToString } from "react-dom/server";

import MarkerPopupContent from "./MarkerPopupContent";

import type { MarkerInstance, MarkerTypeCategory } from "../types/game";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

type Props = {
  mapId: string;
  marker: MarkerInstance;
  types: MarkerTypeCategory[];
  showLabel: boolean;
  completedSet: Set<string>;
  toggleMarkerCompleted: (marker: MarkerInstance) => void;
};

/** Lookup icon definition from YAML (by category/subtype). */
function getSubtypeIconDef(
  types: MarkerTypeCategory[],
  categoryId: string,
  subtypeId: string,
): IconDefinition {
  const cat = types.find((c) => c.id === categoryId);
  const sub = cat?.subtypes.find((s) => s.id === subtypeId) || null;

  const iconName =
    (sub as any)?.icon || (cat as any)?.icon || "faCircleDot";

  return (
    ((SolidIcons as any)[iconName] as IconDefinition) ||
    (SolidIcons.faCircleDot as IconDefinition)
  );
}

/** Lookup color from YAML (subtype > category > default). */
function getSubtypeColor(
  types: MarkerTypeCategory[],
  categoryId: string,
  subtypeId: string,
): string {
  const cat = types.find((c) => c.id === categoryId);
  const sub = cat?.subtypes.find((s) => s.id === subtypeId) || null;

  return (
    (sub as any)?.color ||
    (cat as any)?.color ||
    "#E53935"
  );
}

/** Create a FA-based location pin icon. */
function createPinIcon(
  innerIcon: IconDefinition,
  pinColor: string,
  completed: boolean,
): L.DivIcon {
  const html = renderToString(
    <div
      style={{
        position: "relative",
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: completed ? 0.4 : 1,
      }}
    >
      {/* Outer pin */}
      <FontAwesomeIcon
        icon={faLocationPin}
        style={{
          fontSize: "36px",
          color: pinColor,
          filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.4))",
        }}
      />

      {/* Inner icon shifted a bit upwards */}
      <FontAwesomeIcon
        icon={innerIcon}
        style={{
          position: "absolute",
          fontSize: "14px",
          color: "white",
          top: "6px",
          left: "50%",
          transform: "translateX(-50%)",
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
            color: "#22c55e", // emerald-500
          }}
        />
      )}
    </div>,
  );

  return L.divIcon({
    html,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

const GameMarker: React.FC<Props> = ({
                                       mapId,
                                       marker,
                                       types,
                                       showLabel,
                                       completedSet,
                                       toggleMarkerCompleted,
                                     }) => {
  // marker.position is [x, y] in our data model
  const [x, y] = marker.position;

  // Namespace for this map's markers (ensures markers/world.yaml loads)
  const markerNs = `markers/${mapId}`;
  const { t } = useTranslation(markerNs);

  const markerKeyPrefix = `${markerNs}:${marker.categoryId}.${marker.subtypeId}.${marker.id}`;

  // Localized marker name with fallback to id
  const localizedName = t(`${markerKeyPrefix}.name`, marker.id);

  // Localized description with fallback text
  const description = t(
    `${markerKeyPrefix}.description`,
    "No description available yet.",
  );

  // Category & subtype labels from types namespace (fully-qualified keys)
  const categoryLabel = t(
    `types:categories.${marker.categoryId}.name`,
  );
  const subtypeLabel = t(
    `types:subtypes.${marker.categoryId}.${marker.subtypeId}.name`,
  );

  const innerIcon = getSubtypeIconDef(
    types,
    marker.categoryId,
    marker.subtypeId,
  );
  const pinColor = getSubtypeColor(
    types,
    marker.categoryId,
    marker.subtypeId,
  );

  // Find subtype definition to check canComplete
  const cat = types.find((c) => c.id === marker.categoryId);
  const sub = cat?.subtypes.find((s) => s.id === marker.subtypeId) || null;
  const canComplete = !!sub?.canComplete;

  // Completion key is stored per map in useMarkers; here we just build the same key
  const completedKey = `${marker.categoryId}::${marker.subtypeId}::${marker.id}`;
  const isCompleted = completedSet.has(completedKey);

  const icon = createPinIcon(innerIcon, pinColor, isCompleted);

  return (
    <Marker
      position={new L.LatLng(y, x)}
      icon={icon}
    >
      {showLabel && (
        <Tooltip
          permanent
          direction="top"
          offset={[0, -38]} // your chosen offset
          className="game-marker-tooltip"
        >
          {localizedName}
        </Tooltip>
      )}

      <Popup maxWidth={360} minWidth={260}>
        <MarkerPopupContent
          name={localizedName}
          categoryLabel={categoryLabel}
          subtypeLabel={subtypeLabel}
          x={x}
          y={y}
          description={description}
          canComplete={canComplete}
          completed={isCompleted}
          onToggleCompleted={() => toggleMarkerCompleted(marker)}
        />
      </Popup>
    </Marker>
  );
};

export default GameMarker;
