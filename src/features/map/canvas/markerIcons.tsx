import L from "leaflet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { renderToString } from "react-dom/server";
import type { UserMarkerInstance, UserMarkerLocalType } from "@/types/game";

/** Lanhu marker-pin colors (design "1天族"). */
const LANHU_PIN_DISC_BG = "rgba(0,0,0,0.6)"; // 圆形 17 background
const LANHU_PIN_BORDER = "rgba(255,255,255,1)"; // 0.5px hairline
const LANHU_PIN_DOT = "#2E97FF"; // 圆形 18 inner dot (rgba 46,150,255)

export type PinVariant = "image" | "circular" | "pin";

/**
 * Build a Leaflet divIcon for a marker pin.
 *
 * - `image`    — the subtype icon drawn as a ~40px image (categories / POI).
 * - `circular` — the inner icon cropped into a bordered circle (creatures).
 * - `pin`      — the Lanhu-style location pin: a dark translucent disc with a
 *                white hairline border around a colored inner dot. Fallback for
 *                subtypes that have no game-icon image. `innerColor` overrides
 *                the dot color (default blue #2E97FF).
 */
export function createPinIcon(
  innerIcon: string,
  iconScale: number,
  completed: boolean,
  variant: PinVariant = "image",
  innerColor: string = LANHU_PIN_DOT,
): L.DivIcon {
  const iconBaseSize = 40;
  const iconSize = iconBaseSize * iconScale;

  let content: React.ReactNode;
  if (variant === "pin") {
    // Lanhu location pin: outer disc 30px (design 15px logical @2x), inner
    // dot 22px (design 11px logical @2x). Sized to read ~24-30px on-screen.
    const outer = 30;
    const inner = 22;
    content = (
      <div
        style={{
          width: `${outer}px`,
          height: `${outer}px`,
          borderRadius: "50%",
          border: `1px solid ${LANHU_PIN_BORDER}`,
          backgroundColor: LANHU_PIN_DISC_BG,
          boxShadow: "0 1px 3px rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: `${inner}px`,
            height: `${inner}px`,
            borderRadius: "50%",
            backgroundColor: innerColor,
          }}
        />
      </div>
    );
  } else if (variant === "circular") {
    content = (
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
    );
  } else {
    content = (
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
    );
  }

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
      {content}

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
