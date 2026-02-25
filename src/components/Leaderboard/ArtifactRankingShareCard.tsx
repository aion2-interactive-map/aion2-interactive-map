import React from "react";
import { useTranslation } from "react-i18next";
import ShareCardLayout from "./ShareCardLayout";
import type { ArtifactCount } from "@/types/leaderboard.ts";

interface ArtifactRankingShareCardProps {
  data: (ArtifactCount & { rank: number })[];
  isMobile?: boolean;
  region: string;
  seasonInfo: string;
  serverMatchings: any[];
}

const ArtifactRankingShareCard = React.forwardRef<HTMLDivElement, ArtifactRankingShareCardProps>(({
  data,
  isMobile = false,
  region,
  seasonInfo,
  serverMatchings,
}, ref) => {
  const { t } = useTranslation(["common"]);

  const getServerRaceInfo = (serverId: number) => {
    const matching = serverMatchings.find(
      m => m.server1.serverId === serverId || m.server2.serverId === serverId
    );
    if (matching) {
      const server = matching.server1.serverId === serverId ? matching.server1 : matching.server2;
      return {
        serverName: server.serverName,
        isLight: server.raceId === 1,
        displayId: server.serverId % 1000
      };
    }
    
    return {
      serverName: t("common:server.server"),
      isLight: serverId < 2000,
      displayId: serverId % 1000
    };
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}年${month}月${day}日${hours}:${minutes} GMT+8`;
  };

  const displayTime = formatDate(new Date());

  const columns = 4;
  const displayData = React.useMemo(() => {
    if (isMobile) return data;
    
    const reordered: (ArtifactCount & { rank: number })[] = [];
    const rows = Math.ceil(data.length / columns);
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const index = c * rows + r;
        if (index < data.length) {
          reordered.push(data[index]);
        } else {
          // Push a null placeholder to keep the grid structure if necessary
          // But here we just check if it exists
        }
      }
    }
    return reordered;
  }, [data, isMobile, columns]);

  return (
    <ShareCardLayout
      ref={ref}
      isMobile={isMobile}
      title={t("common:leaderboard.artifactRegionRanking")}
      subtitle={`${t(`common:server.${region.toLowerCase()}`)} | ${seasonInfo} | ${displayTime}`}
    >
      <div className="relative z-10 w-full h-fit bg-black/40 p-5 rounded-2xl">
        <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-4"} gap-x-10 gap-y-2`}>
          {/* Header */}
          {!isMobile && (
            Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="flex items-center px-4 py-2 border-b border-white/20">
                <span className="w-16 text-white text-lg">{t("common:leaderboard.rank")}</span>
                <span className="flex-1 text-white text-lg">{t("common:server.server")}</span>
                <span className="w-24 text-center text-white text-lg">{t("common:leaderboard.artifactCount")}</span>
              </div>
            ))
          )}

          {displayData.map((item, index) => {
            const raceInfo = item ? getServerRaceInfo(item.serverId) : null;
            const serverAbbr = raceInfo ? (raceInfo.isLight ? t("common:server.lightAbbr") : t("common:server.darkAbbr")) : "";
            const bgGradient = raceInfo ? (raceInfo.isLight
              ? "linear-gradient(90deg, #F9FCFF 0%, #58ACFF 100%)"
              : "linear-gradient(90deg, #FFFFFF 0%, #A468FF 100%)") : "";

            return (
              <div key={item?.serverId || index} className={`flex items-center px-4 py-3 bg-white/5 border border-white/10 rounded-lg mb-1 ${!item ? "opacity-0 pointer-events-none" : ""}`}>
                {item && raceInfo && (
                  <>
                    <div className="w-16 flex items-center">
                      <div className={`w-8 h-8 rounded-sm border border-white/20 rotate-45 flex items-center justify-center bg-white/10`}>
                        <span className={`-rotate-45 ${isMobile ? "text-lg font-bold text-white" : "text-base font-normal text-white/80"}`}>
                          {item.rank}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center truncate mr-2">
                      <span 
                        className={`${isMobile ? "text-[28px]" : "text-lg"} font-bold bg-clip-text text-transparent leading-none shrink-0`}
                        style={{ backgroundImage: bgGradient }}
                      >
                        {raceInfo.serverName}
                      </span>
                      <span className={`${isMobile ? "text-xl" : "text-sm"} font-normal text-white whitespace-nowrap ml-1 truncate`}>
                        （{serverAbbr}{raceInfo.displayId}）
                      </span>
                    </div>
                    <span className={`${isMobile ? "text-3xl text-primary" : "text-lg text-white"} w-24 text-center font-bold`}>
                      {item.artifactCount}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ShareCardLayout>
  );
});

ArtifactRankingShareCard.displayName = "ArtifactRankingShareCard";

export default ArtifactRankingShareCard;
