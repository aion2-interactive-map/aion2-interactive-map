import { createFileRoute } from "@tanstack/react-router";
import UnderConstruction from "@/components/UnderConstruction.tsx";
import Footer from "@/components/Footer.tsx";

export const Route = createFileRoute("/enhancement")({
  component: Page,
});

function Page() {
  return (
    <div className="h-full overflow-y-auto flex flex-col">
      <div className="flex-1">
        <UnderConstruction />
      </div>
      <Footer />
    </div>
  );
}


