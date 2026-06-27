import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="flex h-full items-center justify-center bg-background text-foreground">
      <Button data-testid="boot-check">AION2 Map — rebuild boot OK</Button>
    </div>
  ),
});
