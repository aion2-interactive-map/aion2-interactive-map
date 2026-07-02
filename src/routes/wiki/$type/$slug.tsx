import { createFileRoute } from "@tanstack/react-router";

import GroupList from "@/features/wiki/GroupList";
import QuestPage from "@/features/wiki/QuestPage";
import { isNumericSlug } from "@/lib/wiki";

export const Route = createFileRoute("/wiki/$type/$slug")({ component: Page });

function Page() {
  const { type, slug } = Route.useParams();
  if (type === "quest" && isNumericSlug(slug)) return <QuestPage id={slug} />;
  return <GroupList type={type} group={slug} />;
}
