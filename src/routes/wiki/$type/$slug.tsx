import { createFileRoute } from "@tanstack/react-router";

import GroupList from "@/features/wiki/GroupList";
import ItemPage from "@/features/wiki/ItemPage";
import NpcPage from "@/features/wiki/NpcPage";
import QuestPage from "@/features/wiki/QuestPage";
import { isNumericSlug } from "@/lib/wiki";

type FactionSearch = { faction?: "light" | "dark" };

function validateFactionSearch(search: Record<string, unknown>): FactionSearch {
  return search.faction === "light" || search.faction === "dark"
    ? { faction: search.faction }
    : {};
}

export const Route = createFileRoute("/wiki/$type/$slug")({
  validateSearch: validateFactionSearch,
  component: Page,
});

function Page() {
  const { type, slug } = Route.useParams();
  const { faction } = Route.useSearch();
  if (isNumericSlug(slug)) {
    if (type === "quest") return <QuestPage id={slug} />;
    if (type === "npc") return <NpcPage id={slug} />;
    if (type === "item") return <ItemPage id={slug} />;
  }
  return <GroupList type={type} group={slug} initialFaction={faction} />;
}
