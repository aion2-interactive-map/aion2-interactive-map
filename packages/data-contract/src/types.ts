// @gamemap/data-contract — game-agnostic data-format types.
//
// These types describe the JSON files emitted by a game's `tools` pipeline
// into a `data/` repo (maps, marker types, marker instances, regions).
// They must stay free of app concerns: no React, no Leaflet, no backend types.

/** Bump when the emitted data format changes; document in README changelog. */
export const CONTRACT_VERSION = 1;

/**
 * Axis mapping from world space to the tile-image pixel grid. Mirrors the
 * `tools` pipeline transform: `pxAxis` picks which world axis drives the pixel
 * X axis (the other drives pixel Y); `flipX`/`flipY` mirror that pixel axis.
 */
export interface MapOrientation {
  pxAxis: "X" | "Y";
  flipX: boolean;
  flipY: boolean;
}

/**
 * Map metadata for background image + coordinate system.
 *
 * When {@link worldBounds} and {@link orientation} are present, marker/region
 * `x,y` are RAW WORLD coordinates and consumers derive pixels via the
 * world→pixel transform. When absent, `x,y` are already image-pixel
 * coordinates (legacy) and the transform is treated as identity.
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
  /** World-space bounding box that maps onto the full pixel grid. */
  worldBounds?: { min: { x: number; y: number }; max: { x: number; y: number } };
  /** World→pixel axis mapping; required alongside {@link worldBounds}. */
  orientation?: MapOrientation;
}

/**
 * Subtype inside a marker category, e.g.:
 * - locations.tpPoint
 * - gatheringPoints.mining
 */
/** How a marker pin is rendered: full icon image, circular cropped portrait
 *  with a white border (creatures/pals/bosses), or the fallback dot. */
export type MarkerPinVariant = "image" | "circular" | "pin";

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
  /** Pin render style. Falls back to the owning category's value, then to
   *  icon-based defaults in the engine. */
  pinVariant?: MarkerPinVariant;
  hideTooltip?: boolean;
  /** Hex color string for the pin body, e.g. "#FFAA00". */
  color?: string;
  /** Whether markers of this subtype can be marked as completed. */
  canComplete?: boolean;
  /** Icon shown when a marker of this subtype is completed (icon-swap
   *  completion, e.g. the game's MonolithFragment_Complete asset). When set,
   *  the generic dim + green check are suppressed for completed markers. */
  iconComplete?: string;
  /** Paldeck index (palworld). 1-based; absent/<=0 means uncatalogued. */
  zukanIndex?: number;
  /** Paldeck variant suffix, e.g. "B" for elemental variants. */
  zukanIndexSuffix?: string;
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
  /** Default pin render style applied to all subtypes in this category
   *  (a subtype may override it with its own `pinVariant`). */
  pinVariant?: MarkerPinVariant;
  subtypes: MarkerTypeSubtype[];
}

export interface MarkerEntityRef {
  type: "quest" | "npc" | "item";
  id: number;
}

/**
 * A concrete marker instance on a map.
 *
 * Coordinates (`x`, `y`) are RAW WORLD coordinates when the owning
 * {@link GameMapMeta} carries `worldBounds`+`orientation`; otherwise they are
 * image-pixel coordinates (legacy), y increasing DOWNWARD to match the tiles.
 * Either way, consumers rendering in a y-up system (Leaflet CRS.Simple) derive
 * pixels via the map's world→pixel transform (identity in the legacy case) and
 * then apply the vertical flip.
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
  /** Paldeck index (palworld). 1-based; absent/<=0 means uncatalogued. */
  zukanIndex?: number;
  /** Paldeck variant suffix, e.g. "B" for elemental variants. */
  zukanIndexSuffix?: string;
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
