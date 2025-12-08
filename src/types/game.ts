// src/types/game.ts
import type L from "leaflet";

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
  category: string;
  /** Font Awesome icon name, e.g. "faMapPin", "faTree". */
  icon?: string;
  /** Hex color string for the pin body, e.g. "#FFAA00". */
  iconScale?: number;
  hideTooltip?: boolean;
  color?: string;
  /** Whether markers of this subtype can be marked as completed. */
  canComplete?: boolean;
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

/**
 * A concrete marker instance on a map.
 *
 * IMPORTANT: position is [x, y] in our app.
 * When passing to Leaflet (CRS.Simple), we convert to [y, x].
 */
export interface MarkerInstance {
  id: string;
  // categoryId: string;
  subtype: string;
  region?: string;
  x: number;
  y: number;
  images: string[];
  indexInSubtype: number;
}

export interface UserMarkerInstance {
  id: string;
  subtype: string;
  mapId: string;
  x: number;
  y: number;
  name: string;
  description: string;
  image: string;
  type: "local" | "feedback" | "uploaded";
}


export interface CommentInstance {
  id: string;
  content: string;
  replyToId?: string;
  rootIs?: string;
  createdAt: string;
}


export interface RegionInstance {
  id: string;
  name: string;
  type: string;
  borders: number[][][];
}

/**
 * Reference to the Leaflet map instance.
 * Allow null so useRef<Map | null>(null) matches React.RefObject<MapRef>.
 */
export type MapRef = L.Map | null;

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
 *     icon: "faMapPin"
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

