import { createFileRoute } from "@tanstack/react-router";
import UnderConstruction from "@/components/UnderConstruction.tsx";

export const Route = createFileRoute("/crafting")({
  component: Page,
});

function Page() {
  return (
    <UnderConstruction />
  );
}

