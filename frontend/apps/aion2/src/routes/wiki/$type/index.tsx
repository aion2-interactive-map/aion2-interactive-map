import { createFileRoute } from "@tanstack/react-router";

import TypeHub from "@/features/wiki/TypeHub";

export const Route = createFileRoute("/wiki/$type/")({ component: Page });

function Page() {
  const { type } = Route.useParams();
  return <TypeHub type={type} />;
}
