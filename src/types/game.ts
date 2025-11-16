// src/types/game.ts
import type L from "leaflet";

/**
 * Map metadata for background image + coordinate system.
 */
export interface GameMapMeta {
  id: string;
  /** Public URL to the map image (relative to BASE_URL in YAML). */
  imageUrl: string;
  /** Map width in "x" units (e.g., pixels). */
  width: number;
  /** Map height in "y" units (e.g., pixels). */
  height: number;
}

/**
 * Subtype inside a marker category, e.g.:
 * - locations.tpPoint
 * - gatheringPoints.mining
 */
export interface MarkerTypeSubtype {
  id: string;
  /** Font Awesome icon name, e.g. "faMapPin", "faTree". */
  icon?: string;
  /** Hex color string for the pin body, e.g. "#FFAA00". */
  color?: string;
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
  icon?: string;
  color?: string;
  subtypes: MarkerTypeSubtype[];
}

/**
 * A concrete marker instance on a map.
 *
 * IMPORTANT: position is [x, y] everywhere in our app.
 * When passing to Leaflet, we convert to [y, x].
 */
export interface MarkerInstance {
  id: string;
  categoryId: string;
  subtypeId: string;
  /** [x, y] in map coordinates. */
  position: [number, number];
}

/** Reference to the Leaflet map instance. */
export type MapRef = L.Map;
