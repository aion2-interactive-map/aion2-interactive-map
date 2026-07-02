import L from "leaflet";
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { renderToString } from "react-dom/server";
import { DEFAULT_PIN_THEME, type PinTheme } from "./theme.ts";

export type PinVariant = "image" | "circular" | "pin";

/**
 * Build a Leaflet divIcon for a marker pin.
 *
 * - `image`    — the subtype icon drawn as a ~40px image (categories / POI).
 * - `circular` — the inner icon cropped into a bordered circle (creatures).
 * - `pin`      — the Lanhu-style location pin: a dark translucent disc with a
 *                white hairline border around a colored inner dot. Fallback for
 *                subtypes that have no game-icon image. `innerColor` overrides
 *                the dot color (default comes from `theme.pinDot`).
 */
/** Selected-marker emphasis: how much the icon grows and its lifted shadow. */
const SELECTED_SCALE = 1.2;
// Two chained drop-shadows: a soft lifted shadow below, plus a tight dark ring
// hugging the icon's outline so the emphasis stays apparent on busy/dark map
// tiles (a single low-opacity shadow washes out).
const SELECTED_SHADOW =
  "drop-shadow(0 3px 5px rgba(0,0,0,0.85)) drop-shadow(0 0 3px rgba(0,0,0,0.9))";

/**
 * Icon cache keyed by the visual signature of a pin. Building a `DivIcon`
 * runs `renderToString` (full React SSR) — at ~3.6k markers, doing that once
 * per marker froze the map whenever a large set mounted (zoom-out / "show
 * all"). Markers with the same appearance (same subtype icon, scale, variant,
 * completed/selected flags) produce byte-identical HTML, so we build each
 * distinct icon ONCE and share the `DivIcon` object across every marker that
 * needs it. Leaflet clones the HTML per marker via `icon.createIcon()`, so a
 * shared icon instance is safe. This collapses thousands of SSR renders into a
 * few dozen. The set of distinct signatures is bounded (subtypes × a few
 * flags), so the cache never needs eviction.
 */
const iconCache = new Map<string, L.DivIcon>();

/** Optional appearance knobs for {@link createPinIcon}. */
export interface PinIconOptions {
  variant?: PinVariant;
  /** "pin" variant inner-dot color; defaults to `theme.pinDot`. */
  innerColor?: string;
  /** Selected-marker emphasis (scale-up + lifted shadow). */
  selected?: boolean;
  /** Fragment direction badge; "air" = up chevron, "water" = down, ground/none = no badge. */
  fragmentType?: "ground" | "air" | "water";
  theme?: PinTheme;
}

export function createPinIcon(
  innerIcon: string,
  iconScale: number,
  completed: boolean,
  options: PinIconOptions = {},
): L.DivIcon {
  const {
    variant = "image",
    innerColor,
    selected = false,
    fragmentType,
    theme = DEFAULT_PIN_THEME,
  } = options;
  const dot = innerColor ?? theme.pinDot;
  // Theme is fixed per game at startup, never varies at runtime, so it is
  // deliberately NOT part of the key. A game that switches pin themes at
  // runtime would need to fold the theme values in.
  const cacheKey = `${variant}|${innerIcon}|${iconScale}|${completed ? 1 : 0}|${dot}|${selected ? 1 : 0}|${fragmentType ?? ""}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;
  const iconBaseSize = 40;
  const iconSize = iconBaseSize * iconScale;

  // Corner badges (completed tick / fragment chevron) sit at the icon's
  // visible bottom-right corner. The content is center-anchored inside the
  // fixed `iconBaseSize` box, so as the icon scales its real corner moves
  // out (larger) or in (smaller) by half the size delta. Deriving the offset
  // from the rendered content size keeps the badge nestled `BADGE_INSET`px
  // inside that corner at any scale, instead of drifting when we resize.
  const BADGE_INSET = 3;
  const contentSize = variant === "pin" ? 30 : iconSize;
  const badgeOffset = iconBaseSize / 2 - contentSize / 2 + BADGE_INSET;

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
          border: `1px solid ${theme.pinBorder}`,
          backgroundColor: theme.pinDiscBg,
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
            backgroundColor: dot,
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
        // Selected emphasis: grow from center (anchor stays at the 40px
        // center, so the marker doesn't shift) and add a lifted drop shadow
        // that follows the icon's actual alpha shape.
        ...(selected
          ? {
              transform: `scale(${SELECTED_SCALE})`,
              transformOrigin: "center",
              filter: SELECTED_SHADOW,
            }
          : null),
      }}
    >
      {content}

      {completed && (
        <CheckCircle
          size={15}
          strokeWidth={3.5}
          style={{
            position: "absolute",
            right: `${badgeOffset}px`,
            bottom: `${badgeOffset}px`,
            color: theme.completedAccent,
            filter: "drop-shadow(0 0 1.5px rgba(0,0,0,0.9))",
          }}
        />
      )}

      {/* Air/water badge for fragments. Air = up, water = down; ground = none.
          Fragments use icon-swap completion (no green check), so this never
          collides with the CheckCircle above. Pulled in tight over the icon
          with a heavy stroke + dark halo so the direction reads at a glance. */}
      {(fragmentType === "air" || fragmentType === "water") &&
        (fragmentType === "air" ? (
          <ChevronUp
            size={15}
            strokeWidth={4}
            style={{
              position: "absolute",
              right: `${badgeOffset}px`,
              bottom: `${badgeOffset}px`,
              color: theme.completedAccent,
              filter: "drop-shadow(0 0 1.5px rgba(0,0,0,0.9))",
            }}
          />
        ) : (
          <ChevronDown
            size={15}
            strokeWidth={4}
            style={{
              position: "absolute",
              right: `${badgeOffset}px`,
              bottom: `${badgeOffset}px`,
              color: theme.completedAccent,
              filter: "drop-shadow(0 0 1.5px rgba(0,0,0,0.9))",
            }}
          />
        ))}
    </div>,
  );

  const icon = L.divIcon({
    html,
    className: "",
    iconSize: [iconBaseSize, iconBaseSize],
    iconAnchor: [iconBaseSize / 2, iconBaseSize / 2],
    popupAnchor: [0, -10],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}
