import React, { memo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

import type { GameMapMeta } from "@gamemap/data-contract";
import type { EngineMarker, MapAssets } from "@/features/map/engineTypes";
import { createPinIcon, type PinTheme } from "@gamemap/map-engine";

/**
 * Subtypes (beyond the whole `gathering` category) that are numerous/dense and
 * read better rendered a touch smaller than the POI/location markers.
 */
const COMPACT_SUBTYPES = new Set(["fragments", "hiddenCube"]);
/** Scale applied to gathering nodes and the compact subtypes above. */
const COMPACT_SCALE = 0.9;
/** God fragments carry a directional badge, so they read a touch larger. */
const FRAGMENT_SCALE = 1.1;

type Props = {
  marker: EngineMarker;
  map: GameMapMeta;
  /**
   * Precomputed Leaflet position. GameMapView already projects every marker
   * through `dataToLatLng` for viewport culling, so it passes the result down
   * rather than have each marker recompute the same conversion.
   */
  position: L.LatLng;
  /** Show the permanent marker-name tooltip. */
  showLabels: boolean;
  onSelectMarker?: (markerId: string) => void;
  selected?: boolean;
  /** Reference-stable app adapters; this component is memoized. */
  assets: MapAssets;
  /**
   * Pin colors only — this component never touches the map chrome, so it
   * accepts the narrower `PinTheme` (the full `MapTheme` extends it, so
   * callers may still pass the whole theme object).
   */
  theme?: PinTheme;
};

const GameMarkerInner: React.FC<Props> = ({
  marker,
  map,
  position,
  showLabels,
  onSelectMarker,
  selected = false,
  assets,
  theme,
}) => {
  // Subtype definition (resolved by the app adapter, carries its category name).
  const sub = marker.subtypeMeta;
  const category = sub?.category;

  const iconScale = sub?.iconScale || 1.25;
  const hideTooltip = !!sub?.hideTooltip;

  const isCompleted = !!marker.completed;

  // Resolve icon. Subtypes carry a distinct game-icon image; render that as
  // the marker (the "image" variant) for every category that has one,
  // including `location`. Only when a subtype has no icon do we fall back to
  // the circular Lanhu dot ("pin"), tinted with the subtype color or the
  // default blue.
  // Icon-swap completion: subtypes that define `iconComplete` (fragments) show
  // a dedicated "done" icon instead of the generic dim + green check. When we
  // swap, we pass `renderCompleted=false` so the icon itself conveys completion.
  // NOTE: `iconComplete` must be a non-empty path — an empty string would make
  // `rawIcon` empty and route the marker into the `!rawIcon` pin fallback
  // (losing both the swapped icon and the air/water badge).
  const useIconSwap = isCompleted && !!sub?.iconComplete;
  const rawIcon =
    (useIconSwap ? sub?.iconComplete : marker.icon || sub?.icon) || "";
  const innerIcon = assets.markerIconUrl(rawIcon, map);
  const renderCompleted = isCompleted && !useIconSwap;
  let icon: L.DivIcon;
  if (category === "creature") {
    icon = createPinIcon(innerIcon, 0.9, renderCompleted, {
      variant: "circular",
      selected,
      theme,
    });
  } else if (!rawIcon) {
    // No game icon for this subtype: fall back to the circular dot. Use the
    // subtype color as the inner dot when provided (non-black); otherwise the
    // default Lanhu blue is used.
    const dot =
      sub?.color && sub.color !== "#000000" ? sub.color : undefined;
    icon = createPinIcon(innerIcon, iconScale, renderCompleted, {
      variant: "pin",
      innerColor: dot,
      selected,
      theme,
    });
  } else {
    // Gathering nodes plus a few dense collection subtypes (fragments,
    // hiddenCube) render a touch smaller so dense clusters stay readable.
    const compact =
      category === "gathering" ||
      (!!sub?.name && COMPACT_SUBTYPES.has(sub.name));
    const imageScale =
      sub?.name === "fragments"
        ? FRAGMENT_SCALE
        : compact
          ? COMPACT_SCALE
          : iconScale;
    icon = createPinIcon(innerIcon, imageScale, renderCompleted, {
      variant: "image",
      selected,
      fragmentType: marker.fragmentType,
      theme,
    });
  }

  const localizedName =
    marker.localizedName || marker.name || marker.subtypeLabel;

  return (
    <Marker
      position={position}
      icon={icon}
      // Lift the selected marker above its neighbors so the larger,
      // shadowed icon isn't clipped by overlapping markers.
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{
        click: () => {
          onSelectMarker?.(marker.id);
        },
      }}
    >
      {showLabels && !hideTooltip && !selected && (
        <Tooltip
          permanent
          direction="top"
          offset={[0, -18]}
          className="game-marker-tooltip"
        >
          {localizedName}
        </Tooltip>
      )}
    </Marker>
  );
};

const GameMarker = memo(GameMarkerInner);

export default GameMarker;
