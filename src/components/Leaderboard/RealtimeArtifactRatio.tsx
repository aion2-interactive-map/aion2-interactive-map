import React, {useMemo, useState, useEffect, useCallback} from "react";
import {useTranslation} from "react-i18next";
import {Card, CardHeader, CardBody, Divider, Button, DatePicker, Select, SelectItem} from "@heroui/react";
import {now, getLocalTimeZone} from "@internationalized/date";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faStar as faStarSolid, faRotateRight} from "@fortawesome/free-solid-svg-icons";
import {faStar as faStarRegular} from "@fortawesome/free-regular-svg-icons";
import {useLeaderboard} from "@/context/LeaderboardContext";
import {useGameMap} from "@/context/GameMapContext";
import {MAP_NAMES} from "@/types/game";
import {getStaticUrl} from "@/utils/url";
import {AdaptiveTooltip} from "@/components/AdaptiveTooltip";
import {I18nProvider} from "@react-aria/i18n";

import {useUser} from "@/context/UserContext";
import ArtifactStateModal from "@/components/Leaderboard/ArtifactStateModal";

const RealtimeArtifactRatio: React.FC = () => {
  const ABYSS_MAPS = [MAP_NAMES.ABYSS_A, MAP_NAMES.ABYSS_B];
  const STARRED_SERVERS_KEY = "starred_artifact_servers";

  const markerNs = ABYSS_MAPS.map(x => `markers/${x}`);
  const {t, i18n} = useTranslation([...markerNs, "common"]);
  const {
    seasons,
    serverMatchings,
    loadingMatchings,
    artifacts,
    loadingArtifacts,
    artifactStates,
    fetchServerMatchings,
    fetchArtifactStates,
    region,
    setRegion
  } = useLeaderboard();
  const {isSuperUser} = useUser();
  const {maps} = useGameMap();
  const [selectedDate, setSelectedDate] = useState(now(getLocalTimeZone()));
  const [isAutoUpdate, setIsAutoUpdate] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMatching, setEditingMatching] = useState<any>(null);
  const [editingMapName, setEditingMapName] = useState<string | null>(null);
  const [editingInitialState, setEditingInitialState] = useState<any>(null);

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
    if (!isAutoUpdate) return;
    const timer = setInterval(() => {
      setSelectedDate(now(getLocalTimeZone()));
    }, 1000);
    return () => clearInterval(timer);
  }, [isAutoUpdate]);

  const neutralIcon = getStaticUrl("UI/Resource/Texture/Icon/UT_Marker_AbyssArtifact_Neutral.webp");
  const lightIcon = getStaticUrl("UI/Resource/Texture/Icon/UT_Marker_AbyssArtifact_Light.webp");
  const darkIcon = getStaticUrl("UI/Resource/Texture/Icon/UT_Marker_AbyssArtifact_Dark.webp");
  const vsImage = getStaticUrl("images/Leaderboards/VS.webp");

  // Find the season ID for the selected region and its latest season number
  const targetSeasonId = useMemo(() => {
    const regionSeasons = seasons.filter(s => s.serverRegion.toLowerCase() === region.toLowerCase());
    if (regionSeasons.length === 0) return null;
    const maxNumber = Math.max(...regionSeasons.map(s => s.number));
    const season = regionSeasons.find(s => s.number === maxNumber);
    return season?.id || null;
  }, [region, seasons]);

  // Create a memoized debounced version of fetchArtifactStates
  const debouncedFetchArtifactStates = useMemo(
    () => {
      let timeout: any;
      let isFirstCall = true;
      return (seasonId: string) => {
        if (timeout) clearTimeout(timeout);
        if (isFirstCall) {
          fetchArtifactStates(seasonId);
          isFirstCall = false;
          return;
        }
        timeout = setTimeout(() => {
          fetchArtifactStates(seasonId);
        }, 5000); // 5 second debounce when auto-updating
      };
    },
    [fetchArtifactStates]
  );

  useEffect(() => {
    if (targetSeasonId) {
      fetchServerMatchings(targetSeasonId);
      if (isAutoUpdate) {
        debouncedFetchArtifactStates(targetSeasonId);
      } else {
        const date = selectedDate.toDate();
        fetchArtifactStates(targetSeasonId, date);
      }
      // Also fetch artifact counts here as it's needed by ArtifactRegionRanking
      // Doing it here centralizes the fetch for this season
      // fetchArtifactCounts(targetSeasonId, ALL_MAPS_KEY); // Actually ArtifactRegionRanking might have different mapName
    }
  }, [targetSeasonId, isAutoUpdate, isAutoUpdate ? null : selectedDate, fetchServerMatchings, debouncedFetchArtifactStates, fetchArtifactStates]);

  const artifactStateMap = useMemo(() => {
    const map: Record<string, Record<string, { state: number; recordTime: string }>> = {};
    artifactStates.forEach(s => {
      if (!map[s.serverMatchingId]) {
        map[s.serverMatchingId] = {};
      }
      s.states.forEach(artifact => {
        map[s.serverMatchingId][artifact.abyssArtifactId] = {state: artifact.state, recordTime: s.recordTime};
      });
    });
    return map;
  }, [artifactStates]);

  const formatCountdown = (recordTimeStr: string | undefined) => {
    if (!recordTimeStr) return "--:--:--";
    const recordTime = new Date(recordTimeStr).getTime();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const compareTime = isAutoUpdate ? Date.now() : selectedDate.toDate().getTime();
    const diff = recordTime + fortyEightHours - compareTime;

    if (diff <= 0) {
      return t("common:leaderboard.inContention", "数据待上传");
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const {artifactsA, artifactsB} = useMemo(() => {
    const mapA = maps.find(m => m.name === MAP_NAMES.ABYSS_A);
    const mapB = maps.find(m => m.name === MAP_NAMES.ABYSS_B);

    const a = artifacts
      .filter((art) => art.marker.mapId === mapA?.id)
      .sort((a, b) => a.order - b.order);
    const b = artifacts
      .filter((art) => art.marker.mapId === mapB?.id)
      .sort((a, b) => a.order - b.order);
    return {artifactsA: a, artifactsB: b};
  }, [artifacts, maps]);

  const handleTimeClick = (matching: any, mapName: string) => {
    if (!isSuperUser) return;
    console.log("handleTimeClick", {matchingId: matching.id, mapName});
    console.log("artifactStates total count:", artifactStates.length);
    setEditingMatching(matching);
    setEditingMapName(mapName);
    // Find initial state for this matching and map
    const state = artifactStates.find(s => s.serverMatchingId === matching.id && s.mapName === mapName);
    console.log("Found state:", state);

    setEditingInitialState(state || null);
    setIsModalOpen(true);
  };

  const selectClassNames = {
    trigger: "!bg-character-card hover:!bg-character-card focus:!bg-character-card !transition-none border-crafting-border border-1 shadow-none rounded-sm group-data-[hover=true]:!bg-character-card group-data-[focus=true]:!bg-character-card group-data-[focus-visible=true]:!bg-character-card h-[36px] min-h-[36px]",
    innerWrapper: "h-[36px] py-0",
    popoverContent: "rounded-none p-0"
  };

  const commonListboxProps = {
    itemClasses: {
      base: "rounded-none",
    },
  };

  const datePickerClassNames = {
    inputWrapper: "!bg-character-card hover:!bg-character-card focus:!bg-character-card !transition-none border-crafting-border border-1 shadow-none rounded-sm group-data-[hover=true]:!bg-character-card group-data-[focus=true]:!bg-character-card group-data-[focus-visible=true]:!bg-character-card h-[36px] min-h-[36px]",
    popoverContent: "rounded-none p-0",
    segment: "text-foreground",
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-transparent shadow-none">
        <CardHeader className="flex flex-col items-start gap-3 px-0">
          <div className="flex flex-col w-full gap-3 pb-4">
            <p className="text-[22px] text-default-800">{t("common:leaderboard.realtimeArtifactRatio")}</p>
            <div className="flex gap-2 w-full">
              <Select
                size="sm"
                selectedKeys={[region]}
                onSelectionChange={(keys) => setRegion(Array.from(keys)[0] as string)}
                className="min-w-[100px] flex-1 sm:flex-none sm:w-[120px]"
                disallowEmptySelection
                classNames={selectClassNames}
                popoverProps={{
                  radius: "none",
                }}
                listboxProps={commonListboxProps}
              >
                <SelectItem key="tw">{t("common:server.tw")}</SelectItem>
                <SelectItem key="kr">{t("common:server.kr")}</SelectItem>
              </Select>
              <I18nProvider locale={i18n.language}>
                <div className="relative flex-[2] sm:flex-none sm:w-[280px]">
                  <DatePicker
                    className="w-full"
                    hideTimeZone
                    showMonthAndYearPickers
                    value={selectedDate}
                    onChange={(value) => {
                      if (value) {
                        setSelectedDate(value);
                        setIsAutoUpdate(false);
                      }
                    }}
                    classNames={datePickerClassNames}
                    granularity="second"
                  />
                  {!isAutoUpdate && (
                    <AdaptiveTooltip content={t("common:leaderboard.resetToNow", "重置到当前时间")}>
                      <Button
                        size="sm"
                        variant="flat"
                        isIconOnly
                        className="absolute right-10 top-1/2 -translate-y-1/2 z-20 h-6 w-6 min-w-0 bg-transparent"
                        onClick={() => {
                          setIsAutoUpdate(true);
                          setSelectedDate(now(getLocalTimeZone()));
                        }}
                      >
                        <FontAwesomeIcon icon={faRotateRight} className="text-[12px]"/>
                      </Button>
                    </AdaptiveTooltip>
                  )}
                </div>
              </I18nProvider>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loadingMatchings || loadingArtifacts ? (
        <p className="text-center py-4">{t("common:ui.loading")}</p>
      ) : (
        sortedMatchings.map((matching) => (
          <Card key={matching.id}
                className="bg-character-equipment shadow-none border-1 border-crafting-border p-4 relative group">
            <CardBody className="p-0">
              <div className="flex items-stretch justify-between">
                {/* Left Column: Server 1 */}
                <div className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full h-[38px] flex items-center justify-center rounded-md relative"
                    style={{background: "linear-gradient(135deg, #DBEDFF 0%, #F3FBFF 100%)"}}
                  >
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="absolute left-1 z-10 text-default-400 hover:text-star data-[starred=true]:text-star"
                      data-starred={starredServerIds.includes(matching.server1.serverId)}
                      onClick={() => toggleStar(matching.server1.serverId)}
                    >
                      <FontAwesomeIcon
                        icon={starredServerIds.includes(matching.server1.serverId) ? faStarSolid : faStarRegular}
                        className="text-[16px]"
                      />
                    </Button>
                    <span className="text-lg font-bold text-[#1D3557]">{matching.server1.serverName}</span>
                    <span
                      className="text-[14px] font-normal text-default-700">（{t("common:server.lightAbbr")}{matching.server1.serverId % 1000}）</span>
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
                            const compareTime = isAutoUpdate ? Date.now() : selectedDate.toDate().getTime();
                            const diff = recordTime + fortyEightHours - compareTime;
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
                    <div
                      className={`text-[20px] text-default-800 font-mono ${isSuperUser ? "cursor-pointer hover:text-primary" : ""}`}
                      onClick={() => handleTimeClick(matching, MAP_NAMES.ABYSS_A)}
                    >
                      {formatCountdown(artifactsA.length > 0 ? artifactStateMap[matching.id]?.[artifactsA[0].id]?.recordTime : undefined)}
                    </div>
                  </div>
                </div>

                {/* Middle: VS */}
                <div className="flex flex-col items-center px-2 h-full">
                  <div className="h-[38px] flex items-center">
                    <img src={vsImage} alt="VS" className="w-10 h-10 object-contain"/>
                  </div>
                  <div className="flex-1 flex items-center mt-2">
                    <Divider orientation="vertical" className="h-[60px] sm:h-[80px] bg-default-500"/>
                  </div>
                </div>

                {/* Right Column: Server 2 */}
                <div className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full h-[38px] flex items-center justify-center rounded-md relative"
                    style={{background: "linear-gradient(225deg, #EFE5FF 0%, #F3FBFF 100%)"}}
                  >
                    <span className="text-lg font-bold text-[#4B0082]">{matching.server2.serverName}</span>
                    <span
                      className="text-[14px] font-normal text-default-700">（{t("common:server.darkAbbr")}{matching.server2.serverId % 1000}）</span>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="absolute right-1 z-10 text-default-400 hover:text-star data-[starred=true]:text-star"
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
                            const compareTime = isAutoUpdate ? Date.now() : selectedDate.toDate().getTime();
                            const diff = recordTime + fortyEightHours - compareTime;
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
                    <div
                      className={`text-[20px] text-default-800 font-mono ${isSuperUser ? "cursor-pointer hover:text-primary" : ""}`}
                      onClick={() => handleTimeClick(matching, MAP_NAMES.ABYSS_B)}
                    >
                      {formatCountdown(artifactsB.length > 0 ? artifactStateMap[matching.id]?.[artifactsB[0].id]?.recordTime : undefined)}
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))
      )}

      {isSuperUser && editingMatching && targetSeasonId && editingMapName && (
        <ArtifactStateModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          matching={editingMatching}
          mapName={editingMapName}
          artifacts={editingMapName === MAP_NAMES.ABYSS_A ? artifactsA : artifactsB}
          initialState={editingInitialState}
          seasonId={targetSeasonId}
        />
      )}
    </div>
  );
};

export default RealtimeArtifactRatio;
