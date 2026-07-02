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
  /** Hex color string for the pin body, e.g. "#FFAA00". */
  iconScale?: number;
  hideTooltip?: boolean;
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
 * IMPORTANT: position is [x, y] in DATA / image space (y increases DOWNWARD,
 * matching the tiles). When passing to Leaflet (CRS.Simple, y increases UP) we
 * flip vertically once: `lat = mapHeight - y`, `lng = x`. Use the helpers in
 * `@/lib/coords` (`dataToLatLng` / `latLngToData`) for every conversion.
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
 * Parsed maps.yaml
 *
 * Expected structure:
 * version: 1
 * maps:
 *   - id: "world"
 *     imageUrl: "/maps/world.webp"
 *     width: 2275
 *     height: 1285
 */
export interface MapsFile {
  // version: number;
  maps: GameMapMeta[];
}

/**
 * Parsed types.yaml
 *
 * Expected structure:
 * version: 1
 * categories:
 *   - id: "locations"
 *     icon: "UI/Resource/Texture/Icon/UT_Marker_Location.webp"
 *     subtypes: [...]
 */
export interface TypesFile {
  // version: number;
  categories: MarkerTypeCategory[];
}

/**
 * Parsed markers YAML (e.g. data/markers/world.yaml).
 *
 * We only care that we can iterate:
 *   categoryId -> subtypeId -> markerId -> { position: [x, y], ... }
 *
 * So we keep it intentionally loose apart from the 'version' field.
 */
export interface RawMarkersFile {
  // version: number;
  // categories, gatheringPoints, questPoints, enemies, etc.
  // [categoryId: string]: any;
  markers: MarkerInstance[];
}

export interface RawRegionsFile {
  regions: RegionInstance[];
}
