import { createFileRoute } from "@tanstack/react-router";
import UnderConstruction from "@/components/UnderConstruction.tsx";

export const Route = createFileRoute("/forum")({
  component: Page,
});

function Page() {
  return (
    <UnderConstruction />
  );
}

