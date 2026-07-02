// engineTypes.ts — prop contracts for the (soon-to-be) game-agnostic map
// engine components. Temporary home under the app: these interfaces move into
// `@gamemap/map-engine` together with the components themselves in a later
// step. Nothing in here may reference app contexts, i18n or app-only types.
import type { ReactNode, RefObject } from "react";
import type L from "leaflet";
import type { MapTheme } from "@gamemap/map-engine";
import type {
  GameMapMeta,
  MarkerInstance,
  MarkerTypeSubtype,
  RegionInstance,
} from "@gamemap/data-contract";

export type { MapTheme } from "@gamemap/map-engine";

/**
 * Marker as the engine consumes it: pre-localized and with the subtype meta
 * resolved by the app, so the engine components never touch app contexts,
 * i18n or the marker-type taxonomy.
 */
export interface EngineMarker extends MarkerInstance {
  /**
   * Localized marker name. May be "" for unnamed markers — consumers apply
   * their own fallback chain (`localizedName || name || subtypeLabel`).
   */
  localizedName: string;
  localizedDescription?: string;
  /**
   * Localized display name of the marker's subtype — the last-resort label
   * for the marker tooltip when the marker itself is unnamed.
   */
  subtypeLabel: string;
  /**
   * Subtype definition (icon, scale, color, completion options, ...).
   * Undefined when the marker references a subtype missing from the taxonomy.
   */
  subtypeMeta?: MarkerTypeSubtype;
  /** Whether the user marked this marker completed (drives icon dim/swap). */
  completed?: boolean;
}

/**
 * Asset-URL resolution, injected by the app (the engine never builds URLs
 * itself). No default exists — every game must provide one.
 */
export interface MapAssets {
  /** URL of the map tile at grid indices (x, y). Indices are already clamped to the tile grid by the engine tile layer. */
  tileUrl(map: GameMapMeta, x: number, y: number): string;
  /**
   * URL for a marker's game-icon image. `icon` may be "" / undefined (subtype
   * without an icon) — implementations decide the fallback. `map` is provided
   * for per-map variants (e.g. AION2 swaps Light→Dark icons on dark maps).
   */
  markerIconUrl(icon: string | undefined, map: GameMapMeta): string;
  /** Optional watermark image tiled over the map at low opacity. Omit to disable the watermark layer. */
  watermarkUrl?: string;
}

/** UI strings the engine renders itself (i18n stays app-side). */
export interface GameMapViewLabels {
  /** Context-menu "copy position" entry; coordinates are appended by the engine. */
  copyPosition: string;
  /** Empty-state message shown when `map` is undefined. */
  noMapSelected: string;
  /** Zoom-control accessibility labels. */
  zoomIn: string;
  zoomOut: string;
  /** Footer line above the cursor pill (e.g. legal/ICP record). Empty/undefined = hidden. */
  footerText?: string;
}

/**
 * Everything `GameMapView` needs, provided by the app adapter (`MapRoute`):
 * the components under `features/map/canvas` + the marker popup read NO app
 * context — all data and callbacks arrive through these props.
 */
export interface GameMapViewProps {
  /** Map to render; when undefined the empty-state message is shown. */
  map?: GameMapMeta;
  /** Markers of the current map, pre-localized + subtype-resolved by the app. */
  markers: EngineMarker[];
  /** Region polygons of the current map. */
  regions: RegionInstance[];
  /**
   * Subtype filter: markers whose subtype is not in the set are hidden
   * (selection overrides). Undefined = filter not initialized yet → all hidden.
   */
  visibleSubtypes?: Set<string>;
  /** Region filter for the region fills. Undefined = show all regions. */
  visibleRegions?: Set<string>;
  /** Show permanent marker-name tooltips. */
  showLabels: boolean;
  /** Draw region border polylines. */
  showBorders: boolean;
  /** Gate higher-tier markers behind minimum zoom levels (game-like LOD). */
  lodEnabled: boolean;
  selectedMarkerId: string | null;
  /** Position to fly to (search / deep-link), DATA image-space. */
  selectedPosition: { x: number; y: number } | null;
  /**
   * Marker click / background click / popup close → selection toggle.
   * `null` always deselects.
   */
  onToggleMarker: (markerId: string | null) => void;
  /** `(x, y)` DATA-space → localized subzone name, for the cursor status bar. */
  subzoneAt: (x: number, y: number) => string;
  /** Duration (seconds) of the fly-to animation on selection. */
  flyToDuration: number;
  /** Escape hatch to the Leaflet map instance. */
  mapRef: RefObject<L.Map | null>;
  /** Asset-URL resolver (tiles, marker icons, watermark). Required — no default. */
  assets: MapAssets;
  /** Color tokens for engine-rendered chrome; defaults to the AION2 Lanhu palette. */
  theme?: MapTheme;
  /** Renders the selected marker's popup body (app-side content: links, actions...). */
  renderPopupContent: (marker: EngineMarker) => ReactNode;
  /** Dev/test only: publish the Leaflet map on `window.__leafletMap` for e2e. */
  exposeTestHandle?: boolean;
  labels?: GameMapViewLabels;
}
