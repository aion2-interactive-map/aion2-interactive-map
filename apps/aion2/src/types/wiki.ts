export type LText = { en: string; zhCN: string; zhTW: string; ko?: string };

export type ItemGrade =
  | "common"
  | "rare"
  | "legend"
  | "unique"
  | "epic"
  | "mythic"
  | "special";

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
  grade?: ItemGrade | number;
}

export interface WikiPoi {
  x: number;
  y: number;
}

export interface RegionRef {
  mapName: string;
  id: string;
}

export interface QuestObjective {
  type: string;
  label: LText;
  marker: boolean;
  optional: boolean;
  mapName: string | null;
  pois: WikiPoi[];
  resolved: boolean | null;
  target: { type: "npc"; id: number } | null;
  region: RegionRef | null;
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
  rewards: {
    exp: number;
    items: { id: number | null; name: LText; count: number }[];
  };
  chain: { next: number | null; prev: number[] };
}

export interface NpcEntity {
  id: number;
  type: "npc";
  name: LText;
  level: number;
  grade: number;
  named: boolean;
  npcType: string | null;
  subType: string | null;
  funcType: string | null;
  race: "light" | "dark" | "all";
  spawns: { mapName: string; pois: WikiPoi[] }[];
  quests: { id: number; role: "giver" | "target" }[];
  drops: { id: number; name: LText; grade: ItemGrade; icon: string | null }[];
}

export interface ItemEntity {
  id: number;
  type: "item";
  name: LText;
  desc: LText | null;
  grade: ItemGrade;
  tier: number;
  itemLevel: number;
  itemType: string | null;
  category: string | null;
  race: "light" | "dark" | "all";
  icon: string | null;
  stats: { key: string; value: number }[];
  sellPrice: number;
  maxStack: number;
  sources: {
    gather: boolean;
    craft: boolean;
    shop: boolean;
    quests: number[];
  };
  rewardFrom: number[];
  droppedBy: { id: number; name: LText; level: number }[];
}
