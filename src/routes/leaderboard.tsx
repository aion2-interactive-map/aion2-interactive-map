import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Footer from "@/components/Footer.tsx";
import ArtifactRegionRanking from "@/components/Leaderboard/ArtifactRegionRanking";
import RealtimeArtifactRatio from "@/components/Leaderboard/RealtimeArtifactRatio";
import LeaderboardSelectors from "@/components/Leaderboard/LeaderboardSelectors";
import { MAP_NAMES } from "@/types/game";

export const Route = createFileRoute("/leaderboard")({
  component: Page,
});

function Page() {
  const [mapName, setMapName] = useState<string>(MAP_NAMES.ABYSS_A);

  return (
    <div className="h-full overflow-y-auto flex flex-col bg-leaderboard-page">
      <div className="flex-1 flex flex-col items-center p-4">
        <div className="w-full max-w-[1074px] flex flex-col gap-4">
          {/* Mobile Selectors */}
          <LeaderboardSelectors 
            mapName={mapName} 
            setMapName={setMapName} 
            className="flex sm:hidden mb-2" 
          />

          <div className="flex flex-col-reverse lg:flex-row justify-center gap-4 lg:gap-8">
            {/* Left Column (ArtifactRegionRanking) - comes second on mobile */}
            <div className="w-full lg:w-[428px] flex flex-col gap-4">
              <ArtifactRegionRanking mapName={mapName} setMapName={setMapName} />
            </div>

            {/* Right Column (RealtimeArtifactRatio) - comes first on mobile */}
            <div className="w-full lg:w-[632px] flex flex-col gap-4">
              <RealtimeArtifactRatio />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
