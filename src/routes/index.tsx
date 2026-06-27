import { createFileRoute } from "@tanstack/react-router";
import MapRoute from "@/features/map/MapRoute";

export const Route = createFileRoute("/")({
  component: () => <MapRoute />,
});
