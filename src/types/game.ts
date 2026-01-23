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

export const MAP_NAMES = {
  ABYSS_A: "Abyss_Reshanta_A",
  ABYSS_B: "Abyss_Reshanta_B",
} as const;

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
  contributors: string[];
  icon?: string;
  name?: string;
  indexInSubtype: number;
}

export type MarkerWithTranslations = MarkerInstance & {
  localizedName: string;
  localizedDescription?: string;
};

export type UserMarkerLocalType =
  | "completed"
  | "location"
  | "fox"
  | "favorite"
  | "gathering"
  | "creature";

export interface UserMarkerInstance {
  id: string;
  markerId: string;
  subtype: string;
  mapId: string;
  x: number;
  y: number;
  name: string;
  description: string;
  image: string;
  type: "local" | "feedback" | "uploaded";
  localType?: UserMarkerLocalType;
  status?: "pending" | "accepted" | "rejected" | "revision" | "deleted";
  reply?: string;
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

// ======================================================================
// Item / Crafting Data (RAW YAML TYPES)
// ======================================================================

// ------------------------
// Classes
// ------------------------

export type ClassMeta = {
  name: string;
  order: number;
};

export type RawClassesFile = {
  classes: ClassMeta[];
};

// ------------------------
// Items
// ------------------------

export type ItemMeta = {
  id: number;
  grade: string;
  icon: string;
  subtype: string;
};

export type RawItemsFile = {
  items: ItemMeta[];
};

// ------------------------
// Item Types (Categories / Subtypes)
// ------------------------

export type ItemTypeSubtype = {
  name: string;
};

export type ItemTypeCategory = {
  name: string;
  subtypes: ItemTypeSubtype[];
};

export type RawItemTypesFile = {
  categories: ItemTypeCategory[];
};

// ------------------------
// Grades
// ------------------------

export type GradeMeta = {
  name: string;
};

export type RawGradesFile = {
  grades: GradeMeta[];
};

// ------------------------
// Crafting
// ------------------------

export type CraftingMaterial = {
  id: number;
  count: number;
};

export type CraftingEntry = {
  id: number;
  splendent_id: number | null;
  materials: CraftingMaterial[];
  race?: "light" | "dark";
};

/**
 * crafting.yaml is a top-level array
 */
export type RawCraftingFile = {
  crafting: CraftingEntry[];
};

// ======================================================================
// Equipment Slots (RAW YAML TYPES)
// ======================================================================

export type EquipmentSlot = {
  key: string;
  name: string;

  /**
   * Values must match ItemMeta.subtype exactly, e.g. "Sword", "Ring", etc.
   */
  allowed_types: string[];

  icon: string;

  /**
   * Whether this slot should be treated as craftable in the crafting UI.
   */
  craftable: boolean;
};

export type RawSlotsFile = {
  slots: EquipmentSlot[];
};

export type TierMeta = {
  name: string;
  items: number[];
};

export type RawTiersFile = {
  tiers: TierMeta[];
};

// ------------------------
// Boards
// ------------------------

export type BoardNode = {
  id: number;
  skillId?: number;
  stats?: string[];
  grade?: string;
};

export type BoardMeta = {
  id: number;
  nodes: BoardNode[];
};

export type RawBoardsFile = {
  boards: BoardMeta[];
};

export type ServerMeta = {
  raceId: number;
  serverId: number;
  serverName: string;
  serverShortName: string;
};

export type RawServersFile = {
  servers?: ServerMeta[];
};

export type StatType = {
  type: string;
  icon: string;
  secondStats: Array<{
    type: string;
  }>;
};

export type BoardStat = {
  type: string;
  value: string;
};

export type StatsData = {
  mainStats: StatType[];
  lordStats: StatType[];
  secondStats: Array<{
    type: string;
  }>;
  boardStats?: BoardStat[];
};

export type SkillCategory = "Active" | "Passive" | "Dp";

export type SkillMeta = {
  category: SkillCategory;
  class: string;
  icon: string;
  id: number;
  needLevel: number;
};

export type RawSkillsFile = {
  skills?: SkillMeta[];
};

