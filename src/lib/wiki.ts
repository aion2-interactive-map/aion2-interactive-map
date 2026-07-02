import { loadGameData } from "@/lib/data";
import type {
  ItemEntity,
  LText,
  NpcEntity,
  QuestEntity,
  WikiIndexDoc,
  WikiTaxonomy,
} from "@/types/wiki";

export const loadTaxonomy = () =>
  loadGameData<WikiTaxonomy>("data/wiki/taxonomy.json");

export const loadWikiIndex = (type: string) =>
  loadGameData<{ docs: WikiIndexDoc[] }>(`data/wiki/index/${type}.json`);

export const loadQuest = (id: string | number) =>
  loadGameData<QuestEntity>(`data/wiki/quest/${id}.json`);

export const loadNpc = (id: string | number) =>
  loadGameData<NpcEntity>(`data/wiki/npc/${id}.json`);

export const loadItem = (id: string | number) =>
  loadGameData<ItemEntity>(`data/wiki/item/${id}.json`);

/** Pick the current-language variant of an inline localized string. */
export function lt(text: LText | undefined, lang: string): string {
  if (!text) return "";
  if (lang.startsWith("zh-TW")) return text.zhTW || text.zhCN || text.en;
  if (lang.startsWith("zh")) return text.zhCN || text.en;
  return text.en || text.zhCN;
}

export const isNumericSlug = (slug: string) => /^\d+$/.test(slug);
