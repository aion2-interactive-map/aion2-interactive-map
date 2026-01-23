import { createFileRoute } from "@tanstack/react-router";
import Footer from "@/components/Footer.tsx";
import ArtifactRegionRanking from "@/components/Leaderboard/ArtifactRegionRanking";
import RealtimeArtifactRatio from "@/components/Leaderboard/RealtimeArtifactRatio";

export const Route = createFileRoute("/leaderboard")({
  component: Page,
});

function Page() {
  return (
    <div className="h-full overflow-y-auto flex flex-col bg-leaderboard-page">
      <div className="flex-1 flex justify-center gap-4 p-4">
        {/* Left Column */}
        <div style={{ width: "428px" }} className="flex flex-col gap-4">
          <ArtifactRegionRanking />
        </div>

        {/* Right Column */}
        <div style={{ width: "632px" }} className="flex flex-col gap-4">
          <RealtimeArtifactRatio />
        </div>
      </div>
      <Footer />
    </div>
  );
}
