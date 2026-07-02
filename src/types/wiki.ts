export type LText = { en: string; zhCN: string; zhTW: string };

export interface WikiTaxonomy {
  types: { slug: string; count: number; groups: WikiGroup[] }[];
}

export interface WikiGroup {
  slug: string;
  count: number;
  sections: { slug: string; count: number }[];
}

export interface WikiIndexDoc {
  id: number;
  group: string | null;
  section: string;
  race: "light" | "dark" | "all";
  level: number;
  mapId: string | null;
}

export interface WikiPoi {
  x: number;
  y: number;
}

export interface QuestObjective {
  type: string;
  label: LText;
  marker: boolean;
  optional: boolean;
  mapName: string | null;
  pois: WikiPoi[];
  resolved: boolean | null;
}

export interface QuestEntity {
  id: number;
  type: "quest";
  name: LText;
  questType: string;
  race: "light" | "dark" | "all";
  unlockLevel: number;
  recommendedLevel: number;
  repeatable: boolean;
  acquireMapName: string | null;
  steps: { order: number; objectives: QuestObjective[] }[];
  rewards: { exp: number; items: { name: LText; count: number }[] };
  chain: { next: number | null; prev: number[] };
}
