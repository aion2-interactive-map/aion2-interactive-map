import L from "leaflet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { renderToString } from "react-dom/server";
import type { UserMarkerInstance, UserMarkerLocalType } from "@/types/game";

/**
 * Build a Leaflet divIcon for a marker pin.
 * `circular` crops the inner icon into a bordered circle (used for creatures).
 */
export function createPinIcon(
  innerIcon: string,
  iconScale: number,
  completed: boolean,
  circular = false,
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
              objectFit: "cover",
              pointerEvents: "none",
            }}
          />
        </div>
      ) : (
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

const USER_MARKER_LOCAL_ICON_MAP: Record<UserMarkerLocalType, string> = {
  completed: "images/Markers/Completed.svg",
  location: "images/Markers/Location.svg",
  fox: "images/Markers/Fox.svg",
  favorite: "images/Markers/Favorite.svg",
  gathering: "images/Markers/Gathering.svg",
  creature: "images/Markers/Creature.svg",
};

export function getUserMarkerLocalIcon(
  marker: UserMarkerInstance,
): string | null {
  if (marker.type !== "local") return null;
  if (!marker.localType) return null;
  return USER_MARKER_LOCAL_ICON_MAP[marker.localType] ?? null;
}
