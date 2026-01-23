import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardBody, Divider, Button } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarRegular } from "@fortawesome/free-regular-svg-icons";
import { useLeaderboard } from "@/context/LeaderboardContext";
import { useGameMap } from "@/context/GameMapContext";
import { MAP_NAMES } from "@/types/game";
import { getStaticUrl } from "@/utils/url";
import { AdaptiveTooltip } from "@/components/AdaptiveTooltip";

const RealtimeArtifactRatio: React.FC = () => {
  const ABYSS_MAPS = [MAP_NAMES.ABYSS_A, MAP_NAMES.ABYSS_B];
  const STARRED_SERVERS_KEY = "starred_artifact_servers";
  
  const markerNs = ABYSS_MAPS.map(x => `markers/${x}`);
  const { t } = useTranslation([...markerNs, "common"]);
  const { seasons, serverMatchings, loadingMatchings, artifacts, loadingArtifacts, artifactStates, fetchServerMatchings, fetchArtifactStates, region } = useLeaderboard();
  const { maps } = useGameMap();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [starredServerIds, setStarredServerIds] = useState<number[]>(() => {
    const saved = localStorage.getItem(STARRED_SERVERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const toggleStar = useCallback((serverId: number) => {
    setStarredServerIds(prev => {
      const next = prev.includes(serverId)
        ? prev.filter(id => id !== serverId)
        : [...prev, serverId];
      localStorage.setItem(STARRED_SERVERS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const sortedMatchings = useMemo(() => {
    return [...serverMatchings].sort((a, b) => {
      const aStarred = starredServerIds.includes(a.server1.serverId) || starredServerIds.includes(a.server2.serverId);
      const bStarred = starredServerIds.includes(b.server1.serverId) || starredServerIds.includes(b.server2.serverId);
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      return 0;
    });
  }, [serverMatchings, starredServerIds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const neutralIcon = getStaticUrl("UI/Resource/Texture/Icon/UT_Marker_AbyssArtifact_Neutral.webp");
  const lightIcon = getStaticUrl("UI/Resource/Texture/Icon/UT_Marker_AbyssArtifact_Light.webp");
  const darkIcon = getStaticUrl("UI/Resource/Texture/Icon/UT_Marker_AbyssArtifact_Dark.webp");
  const vsImage = getStaticUrl("images/Leaderboards/VS.webp");

  // Find the latest season number across all seasons
  const latestSeasonNumber = useMemo(() => {
    if (seasons.length === 0) return null;
    return Math.max(...seasons.map(s => s.number));
  }, [seasons]);

  // Find the season ID for the selected region and latest season number
  const targetSeasonId = useMemo(() => {
    if (!latestSeasonNumber) return null;
    const season = seasons.find(s => s.serverRegion === region && s.number === latestSeasonNumber);
    return season?.id || null;
  }, [region, latestSeasonNumber, seasons]);

  useEffect(() => {
    if (targetSeasonId) {
      fetchServerMatchings(targetSeasonId);
      fetchArtifactStates(targetSeasonId);
    }
  }, [targetSeasonId, fetchServerMatchings, fetchArtifactStates]);

  const artifactStateMap = useMemo(() => {
    const map: Record<string, Record<string, { state: number; recordTime: string }>> = {};
    artifactStates.forEach(s => {
      if (!map[s.serverMatchingId]) {
        map[s.serverMatchingId] = {};
      }
      map[s.serverMatchingId][s.abyssArtifactId] = { state: s.state, recordTime: s.recordTime };
    });
    return map;
  }, [artifactStates]);

  const formatCountdown = (recordTimeStr: string | undefined) => {
    if (!recordTimeStr) return "--:--:--";
    const recordTime = new Date(recordTimeStr).getTime();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const diff = recordTime + fortyEightHours - currentTime.getTime();

    if (diff <= 0) {
      return t("common:leaderboard.inContention", "数据待上传");
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const { artifactsA, artifactsB } = useMemo(() => {
    const mapA = maps.find(m => m.name === MAP_NAMES.ABYSS_A);
    const mapB = maps.find(m => m.name === MAP_NAMES.ABYSS_B);

    const a = artifacts
      .filter((art) => art.marker.mapId === mapA?.id)
      .sort((a, b) => a.order - b.order);
    const b = artifacts
      .filter((art) => art.marker.mapId === mapB?.id)
      .sort((a, b) => a.order - b.order);
    return { artifactsA: a, artifactsB: b };
  }, [artifacts, maps]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-transparent shadow-none">
        <CardHeader className="flex flex-col items-start gap-3 px-0">
          <p className="text-[22px] text-default-800">{t("common:leaderboard.realtimeArtifactRatio")}</p>
        </CardHeader>
      </Card>

      {loadingMatchings || loadingArtifacts ? (
        <p className="text-center py-4">{t("common:ui.loading")}</p>
      ) : (
        sortedMatchings.map((matching) => (
          <Card key={matching.id} className="bg-character-equipment shadow-none border-1 border-crafting-border p-4 relative group">
            <CardBody className="p-0">
              <div className="flex items-stretch justify-between">
                {/* Left Column: Server 1 */}
                <div className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full h-[38px] flex items-center justify-center rounded-md relative"
                    style={{ background: "linear-gradient(135deg, #DBEDFF 0%, #F3FBFF 100%)" }}
                  >
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="absolute left-1 z-10 text-default-400 hover:text-warning data-[starred=true]:text-warning"
                      data-starred={starredServerIds.includes(matching.server1.serverId)}
                      onClick={() => toggleStar(matching.server1.serverId)}
                    >
                      <FontAwesomeIcon 
                        icon={starredServerIds.includes(matching.server1.serverId) ? faStarSolid : faStarRegular} 
                        className="text-[16px]"
                      />
                    </Button>
                    <span className="text-lg font-bold text-[#1D3557]">{matching.server1.serverName}</span>
                    <span className="text-[14px] font-normal text-default-700">（天{matching.server1.serverId % 1000}）</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] text-foreground max-w-[40px] sm:max-w-none whitespace-normal">
                        {t(`maps:${MAP_NAMES.ABYSS_A}.description`)}
                      </span>
                      <div className="flex gap-1">
                        {artifactsA.map((artifact) => {
                          const artifactName = t(`markers/${MAP_NAMES.ABYSS_A}:${artifact.markerId}.name`, artifact.marker.name);
                          const stateData = artifactStateMap[matching.id]?.[artifact.id];
                          const state = stateData?.state;
                          
                          let isContention = false;
                          if (stateData?.recordTime) {
                            const recordTime = new Date(stateData.recordTime).getTime();
                            const fortyEightHours = 48 * 60 * 60 * 1000;
                            const diff = recordTime + fortyEightHours - currentTime.getTime();
                            if (diff <= 0) isContention = true;
                          }

                          let icon = neutralIcon;
                          if (!isContention) {
                            if (state === 1) icon = lightIcon;
                            else if (state === 2) icon = darkIcon;
                          }

                          return (
                            <AdaptiveTooltip key={artifact.id} content={artifactName}>
                              <img 
                                src={icon} 
                                alt={artifactName} 
                                className="w-7 h-7 sm:w-12 sm:h-12"
                              />
                            </AdaptiveTooltip>
                          );
                        })}
                      </div>
                    </div>
                    {/* Third Line: Countdown */}
                    <div className="text-[20px] text-default-800 font-mono">
                      {formatCountdown(artifactsA.length > 0 ? artifactStateMap[matching.id]?.[artifactsA[0].id]?.recordTime : undefined)}
                    </div>
                  </div>
                </div>

                {/* Middle: VS */}
                <div className="flex flex-col items-center px-2 h-full">
                  <div className="h-[38px] flex items-center">
                    <img src={vsImage} alt="VS" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="flex-1 flex items-center mt-2">
                    <Divider orientation="vertical" className="h-[60px] sm:h-[80px] bg-default-500" />
                  </div>
                </div>

                {/* Right Column: Server 2 */}
                <div className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full h-[38px] flex items-center justify-center rounded-md relative"
                    style={{ background: "linear-gradient(225deg, #EFE5FF 0%, #F3FBFF 100%)" }}
                  >
                    <span className="text-lg font-bold text-[#4B0082]">{matching.server2.serverName}</span>
                    <span className="text-[14px] font-normal text-default-700">（魔{matching.server2.serverId % 1000}）</span>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="absolute right-1 z-10 text-default-400 hover:text-warning data-[starred=true]:text-warning"
                      data-starred={starredServerIds.includes(matching.server2.serverId)}
                      onClick={() => toggleStar(matching.server2.serverId)}
                    >
                      <FontAwesomeIcon 
                        icon={starredServerIds.includes(matching.server2.serverId) ? faStarSolid : faStarRegular} 
                        className="text-[16px]"
                      />
                    </Button>
                  </div>
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] text-foreground max-w-[40px] sm:max-w-none whitespace-normal">
                        {t(`maps:${MAP_NAMES.ABYSS_B}.description`)}
                      </span>
                      <div className="flex gap-1">
                        {artifactsB.map((artifact) => {
                          const artifactName = t(`markers/${MAP_NAMES.ABYSS_B}:${artifact.markerId}.name`, artifact.marker.name);
                          const stateData = artifactStateMap[matching.id]?.[artifact.id];
                          const state = stateData?.state;
                          
                          let isContention = false;
                          if (stateData?.recordTime) {
                            const recordTime = new Date(stateData.recordTime).getTime();
                            const fortyEightHours = 48 * 60 * 60 * 1000;
                            const diff = recordTime + fortyEightHours - currentTime.getTime();
                            if (diff <= 0) isContention = true;
                          }

                          let icon = neutralIcon;
                          if (!isContention) {
                            if (state === 1) icon = lightIcon;
                            else if (state === 2) icon = darkIcon;
                          }

                          return (
                            <AdaptiveTooltip key={artifact.id} content={artifactName}>
                              <img 
                                src={icon} 
                                alt={artifactName} 
                                className="w-7 h-7 sm:w-12 sm:h-12"
                              />
                            </AdaptiveTooltip>
                          );
                        })}
                      </div>
                    </div>
                    {/* Third Line: Countdown */}
                    <div className="text-[20px] text-default-800 font-mono">
                      {formatCountdown(artifactsB.length > 0 ? artifactStateMap[matching.id]?.[artifactsB[0].id]?.recordTime : undefined)}
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
};

export default RealtimeArtifactRatio;
