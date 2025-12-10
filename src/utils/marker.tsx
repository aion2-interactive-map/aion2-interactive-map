// src/components/GameMarker.tsx
import L from "leaflet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {  faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { renderToString } from "react-dom/server";


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
  circular = false,              // 🔹 new flag with default
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
      {circular ? (
        // 🔵 Circular mode: crop into a circle with border + shadow
        <div
          style={{
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            borderRadius: "50%",
            overflow: "hidden",
            border: "1.5px solid rgba(255,255,255,0.9)",
            boxShadow: "0 0 6px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <img
            src={innerIcon}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",   // crop to circle
              pointerEvents: "none",
            }}
          />
        </div>
      ) : (
        // 🟢 Original mode
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
      )}

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
    iconAnchor: [iconBaseSize / 2, iconBaseSize / 2],
    popupAnchor: [0, -10],
  });
}
