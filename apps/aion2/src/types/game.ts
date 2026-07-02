// src/types/game.ts — APP-ONLY types.
//
// The data-format types (GameMapMeta, MarkerInstance, RegionInstance, the
// *File shapes, ...) live in `@gamemap/data-contract`; import them from there.
import type L from "leaflet";
import type { MarkerInstance } from "@gamemap/data-contract";

export const MAP_NAMES = {
  ABYSS_A: "Abyss_Reshanta_A",
  ABYSS_B: "Abyss_Reshanta_B",
  ABYSS_C: "Abyss_Reshanta_C",
} as const;

export type MarkerWithTranslations = MarkerInstance & {
  localizedName: string;
  localizedDescription?: string;
};

export interface CommentInstance {
  id: string;
  content: string;
  replyToId?: string;
  rootIs?: string;
  createdAt: string;
}

/**
 * Reference to the Leaflet map instance.
 * Allow null so useRef<Map | null>(null) matches React.RefObject<MapRef>.
 */
export type MapRef = L.Map | null;
