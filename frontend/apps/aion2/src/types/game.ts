// src/types/game.ts — APP-ONLY types.
//
// The data-format types (GameMapMeta, MarkerInstance, RegionInstance, the
// *File shapes, ...) live in `@gamemap/data-contract`; import them from there.
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

// `MapRef` (Leaflet map-instance ref) moved into `@gamemap/map-engine`
// together with the engine components.
