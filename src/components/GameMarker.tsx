// src/components/GameMarker.tsx
import React, {memo, useEffect, useRef} from "react";
import {Marker, Tooltip, Popup, useMap} from "react-leaflet";
import { useTranslation } from "react-i18next";
import L, {Popup as LeafletPopup} from "leaflet";
import MarkerPopupContent from "./MarkerPopupContent";

import type {MarkerInstance} from "../types/game";
import {useMarkers} from "@/context/MarkersContext.tsx";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {useGameData} from "@/context/GameDataContext.tsx";
import {createPinIcon} from "@/utils/marker.tsx";
import {parseIconUrl} from "@/utils/url.ts";

type Props = {
  marker: MarkerInstance;
  selected?: boolean;
};

const GameMarkerInner: React.FC<Props> = ({
                                       marker,
                                       selected,
                                     }) => {

  // Namespace for this map's markers (ensures markers/world.yaml loads)
  // console.log(marker)
  const popupRef = useRef<LeafletPopup>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const map = useMap();

  const {selectedMap, types} = useGameMap();
  const {allSubtypes} = useGameData();
  const {showLabels, toggleMarkerCompleted, completedBySubtype} = useMarkers();

  const markerNs = `markers/${selectedMap?.name}`;
  const regionNs = `regions/${selectedMap?.name}`;
  const { t } = useTranslation([markerNs, regionNs]);

  useEffect(() => {
    if (selected) {
      const lat = marker.y;
      const lng = marker.x;
      const target = L.latLng(lat, lng);
      map.once("moveend", () => {
        markerRef?.current?.openPopup();
      })
      map.setView(target, map.getZoom(), { animate: true });
    }
  }, [selected, marker, map]);

  if (!selectedMap) return null;

  const markerKeyPrefix = `${markerNs}:${marker.id}`;
  const regionKeyPrefix = `${regionNs}:${marker.region}`;

  // Find subtype and category definition
  const sub = allSubtypes.get(marker.subtype);
  const cat = types.find((c) => c.name === sub?.category);

  // Category & subtype labels from types namespace (fully-qualified keys)
  const categoryLabel = t(
    `types:categories.${cat?.name}.name`,
  );
  const subtypeLabel = t(
    `types:subtypes.${sub?.name}.name`,
  );
  const regionLabel = marker.region ? t(`${regionKeyPrefix}.name`) : "";
  const iconScale = sub?.iconScale || 1.25;
  const canComplete = !!sub?.canComplete;
  const hideTooltip = !!sub?.hideTooltip;

  // Completion key is stored per map in useMarkers; here we just build the same key
  let isCompleted= false;
  if (sub?.name && completedBySubtype[sub.name]) {
    const completedSet = completedBySubtype[sub.name];
    isCompleted = completedSet.has(marker.indexInSubtype);
  }


  // find icon and color
  const innerIcon = parseIconUrl(marker.icon || sub?.name || "", selectedMap);
  // const pinColor = getSubtypeColor(sub, cat);
  let icon;
  if (cat?.name === "creature") {
    icon = createPinIcon(innerIcon, 0.9, isCompleted, true);
  } else {
    icon = createPinIcon(innerIcon, iconScale, isCompleted);
  }

  // Localized marker name with fallback to id
  let localizedName = t(`${markerKeyPrefix}.name`, "");
  if (!localizedName) {
    localizedName = marker.name || "";
  }
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
      ref={markerRef}
    >
      {(showLabels && !hideTooltip) && (
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
          marker={marker}
          name={localizedName}
          categoryLabel={categoryLabel}
          subtypeLabel={subtypeLabel}
          regionLabel={regionLabel}
          // x={marker.x}
          // y={marker.y}
          // images={marker.images}
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
