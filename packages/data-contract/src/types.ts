// @gamemap/data-contract — game-agnostic data-format types.
//
// These types describe the JSON files emitted by a game's `tools` pipeline
// into a `data/` repo (maps, marker types, marker instances, regions).
// They must stay free of app concerns: no React, no Leaflet, no backend types.

/** Bump when the emitted data format changes; document in README changelog. */
export const CONTRACT_VERSION = 1;

/**
 * Map metadata for background image + coordinate system.
 */
export interface GameMapMeta {
  id: string;
  name: string;
  type: string;
  tileWidth: number;
  tileHeight: number;
  tilesCountX: number;
  tilesCountY: number;
  isVisible: boolean;
}

/**
 * Subtype inside a marker category, e.g.:
 * - locations.tpPoint
 * - gatheringPoints.mining
 */
export interface MarkerTypeSubtype {
  id: string;
  name: string;
  /**
   * Owning category name. NOT present in the emitted `types.json` (the app
   * assigns it at load time from the parent category), hence optional.
   */
  category?: string;
  /** Icon image resource path, e.g. "UI/Resource/Texture/Icon/UT_Marker_*.webp". */
  icon?: string;
  /** Multiplier applied to the icon's base render size. */
  iconScale?: number;
  hideTooltip?: boolean;
  /** Hex color string for the pin body, e.g. "#FFAA00". */
  color?: string;
  /** Whether markers of this subtype can be marked as completed. */
  canComplete?: boolean;
  /** Icon shown when a marker of this subtype is completed (icon-swap
   *  completion, e.g. the game's MonolithFragment_Complete asset). When set,
   *  the generic dim + green check are suppressed for completed markers. */
  iconComplete?: string;
}

/**
 * Marker category, e.g.:
 * - locations
 * - gatheringPoints
 * - questPoints
 * - enemies
 */
export interface MarkerTypeCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  subtypes: MarkerTypeSubtype[];
}

export interface MarkerEntityRef {
  type: "quest" | "npc" | "item";
  id: number;
}

/**
 * A concrete marker instance on a map.
 *
 * Coordinates (`x`, `y`) are in image-pixel space: y increases DOWNWARD,
 * matching the map tiles. Consumers rendering in a y-up coordinate system
 * (e.g. Leaflet CRS.Simple) must apply the vertical flip themselves.
 */
export interface MarkerInstance {
  id: string;
  category?: string;
  subtype: string;
  region?: string;
  x: number;
  y: number;
  images: string[];
  contributors: string[];
  icon?: string;
  name?: string;
  indexInSubtype: number;
  /**
   * Level-of-detail tier (1 = always shown; 2 = shown at default zoom;
   * 3 = shown only when zoomed in). Lower tiers stay visible at all zooms
   * at/above the tier's threshold.
   */
  tier?: number;
  /** For fragment markers: which physical kind (drives dialog text + icon badge). */
  fragmentType?: "ground" | "air" | "water";
  entity?: MarkerEntityRef;
}

export interface RegionInstance {
  id: string;
  name: string;
  type: string;
  borders: number[][][];
}

/**
 * Root `maps.json`: the list of maps a game's data repo provides. Each entry
 * is a {@link GameMapMeta} (tile grid dimensions + visibility); the map's
 * pixel size is `tilesCountX * tileWidth` by `tilesCountY * tileHeight`.
 */
export interface MapsFile {
  maps: GameMapMeta[];
}

/**
 * Root `types.json`: the marker taxonomy — categories (e.g. "locations",
 * "gatheringPoints") each containing subtypes with icon/color/display options.
 */
export interface TypesFile {
  categories: MarkerTypeCategory[];
}

/**
 * Per-map `markers/<Map>.json`: all marker instances placed on one map.
 */
export interface RawMarkersFile {
  markers: MarkerInstance[];
}

/**
 * Per-map `regions/<Map>.json`: named region polygons for one map.
 */
export interface RawRegionsFile {
  regions: RegionInstance[];
}
