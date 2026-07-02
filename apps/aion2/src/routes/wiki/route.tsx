import { createFileRoute, Outlet } from "@tanstack/react-router";

import TopNavbar from "@/components/TopNavbar";

export const Route = createFileRoute("/wiki")({
  component: () => (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <TopNavbar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  ),
});
