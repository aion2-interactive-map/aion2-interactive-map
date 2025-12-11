import { createFileRoute } from "@tanstack/react-router";
import UnderConstruction from "@/components/UnderConstruction.tsx";

export const Route = createFileRoute("/enhancement")({
  component: Page,
});

function Page() {
  return (
    <UnderConstruction />
  );
}


