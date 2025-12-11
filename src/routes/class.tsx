import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/class")({
  component: ClassPage,
});

function ClassPage() {
  return <div>Class Page</div>;
}


