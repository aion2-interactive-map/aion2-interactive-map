import React, {useMemo, useState, useEffect, useCallback} from "react";
import {useTranslation} from "react-i18next";
import {Card, CardHeader, CardBody, Divider, Button, DatePicker, Select, SelectItem} from "@heroui/react";
import {now, getLocalTimeZone} from "@internationalized/date";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faRotateRight
} from "@fortawesome/free-solid-svg-icons";
import {useLeaderboard} from "@/context/LeaderboardContext";
import {MAP_NAMES} from "@/types/game";
import {getStaticUrl} from "@/utils/url";
import {AdaptiveTooltip} from "@/components/AdaptiveTooltip";
import {I18nProvider} from "@react-aria/i18n";

import { useNavigate } from "@tanstack/react-router";
import ServerArtifactColumn from "./ServerArtifactColumn";

const RealtimeArtifactRatio: React.FC = () => {
  const navigate = useNavigate();
  const ABYSS_MAPS = [MAP_NAMES.ABYSS_A, MAP_NAMES.ABYSS_B];
  const STARRED_SERVERS_KEY = "starred_artifact_servers";

  const markerNs = ABYSS_MAPS.map(x => `markers/${x}`);
  const {t, i18n} = useTranslation([...markerNs, "common"]);
  const {
    seasons,
    serverMatchings,
    loadingMatchings,
    artifactsByMap,
    loadingArtifacts,
    artifactStates,
    fetchServerMatchings,
    fetchArtifactStates,
    region,
    setRegion
  } = useLeaderboard();
  const [selectedDate, setSelectedDate] = useState(now(getLocalTimeZone()));
  const [isAutoUpdate, setIsAutoUpdate] = useState(true);

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

  const [globalCountdown, setGlobalCountdown] = useState("");

  useEffect(() => {
    const updateGlobalCountdown = () => {
      const now = new Date();
      // Next Tuesday (2), Thursday (4), Saturday (6) at 11:00 UTC
      const targets = [2, 4, 6];
      let minDiff = Infinity;
      let nextTarget = null;

      for (const day of targets) {
        const target = new Date(now);
        target.setUTCHours(11, 0, 0, 0);
        let daysUntil = (day - now.getUTCDay() + 7) % 7;
        
        // If it's the target day but past 11:00 UTC, go to next week
        if (daysUntil === 0 && now.getTime() >= target.getTime()) {
          daysUntil = 7;
        }
        
        target.setUTCDate(now.getUTCDate() + daysUntil);
        const diff = target.getTime() - now.getTime();
        if (diff < minDiff) {
          minDiff = diff;
          nextTarget = target;
        }
      }

      if (nextTarget) {
        const diff = nextTarget.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const formatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        setGlobalCountdown(t("common:leaderboard.refreshIn", { time: formatted }));
      }
    };

    updateGlobalCountdown();
    const timer = setInterval(updateGlobalCountdown, 1000);
    return () => clearInterval(timer);
  }, [t]);

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
    const map: Record<string, Record<string, { state: number; recordTime: string; contributors: any[] }>> = {};
    artifactStates.forEach(s => {
      if (!map[s.serverMatchingId]) {
        map[s.serverMatchingId] = {};
      }
      s.states.forEach(artifact => {
        map[s.serverMatchingId][artifact.abyssArtifactId] = {
          state: artifact.state,
          recordTime: s.recordTime,
          contributors: s.contributors || []
        };
      });
    });
    return map;
  }, [artifactStates]);

  const formatCountdown = (recordTimeStr: string | undefined, hasContributors: boolean) => {
    if (!recordTimeStr || !hasContributors) return t("common:leaderboard.inContention");
    const recordTime = new Date(recordTimeStr).getTime();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const compareTime = isAutoUpdate ? Date.now() : selectedDate.toDate().getTime();
    const diff = recordTime + fortyEightHours - compareTime;

    if (diff <= 0) {
      const timeDiff = Math.abs(diff);
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      const formatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      return t("common:leaderboard.refreshedAgo", { time: formatted });
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const {artifactsA, artifactsB} = useMemo(() => {
    const a = (artifactsByMap[MAP_NAMES.ABYSS_A] || []).sort((a, b) => a.order - b.order);
    const b = (artifactsByMap[MAP_NAMES.ABYSS_B] || []).sort((a, b) => a.order - b.order);
    return {artifactsA: a, artifactsB: b};
  }, [artifactsByMap]);

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
            <div className="flex items-center gap-2">
              <p className="text-[22px] text-default-800">{t("common:leaderboard.realtimeArtifactRatio")}</p>
              {globalCountdown && (
                <span className="text-[16px] font-mono font-bold text-danger">
                  {globalCountdown}
                </span>
              )}
            </div>
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
                isPressable
                onClick={() => navigate({ to: `/leaderboard/artifacts/${matching.id}` })}
                className="bg-character-equipment shadow-none border-1 border-crafting-border p-4 relative group">
            <CardBody className="p-0">
              <div className="flex items-stretch justify-between">
                <ServerArtifactColumn
                  matching={matching}
                  server={matching.server1}
                  isServer1={true}
                  artifacts={artifactsA}
                  mapName={MAP_NAMES.ABYSS_A}
                  artifactStates={artifactStates.filter(s => s.serverMatchingId === matching.id && s.mapName === MAP_NAMES.ABYSS_A)}
                  artifactStateMap={artifactStateMap}
                  isAutoUpdate={isAutoUpdate}
                  selectedDate={selectedDate}
                  starredServerIds={starredServerIds}
                  toggleStar={toggleStar}
                  formatCountdown={formatCountdown}
                  t={t}
                  icons={{neutral: neutralIcon, light: lightIcon, dark: darkIcon}}
                />

                {/* Middle: VS */}
                <div className="flex flex-col items-center px-2 h-full">
                  <div className="h-[38px] flex items-center">
                    <img src={vsImage} alt="VS" className="w-10 h-10 object-contain"/>
                  </div>
                  <div className="flex-1 flex items-center mt-2">
                    <Divider orientation="vertical" className="h-[60px] sm:h-[80px] bg-default-500"/>
                  </div>
                </div>

                <ServerArtifactColumn
                  matching={matching}
                  server={matching.server2}
                  isServer1={false}
                  artifacts={artifactsB}
                  mapName={MAP_NAMES.ABYSS_B}
                  artifactStates={artifactStates.filter(s => s.serverMatchingId === matching.id && s.mapName === MAP_NAMES.ABYSS_B)}
                  artifactStateMap={artifactStateMap}
                  isAutoUpdate={isAutoUpdate}
                  selectedDate={selectedDate}
                  starredServerIds={starredServerIds}
                  toggleStar={toggleStar}
                  formatCountdown={formatCountdown}
                  t={t}
                  icons={{neutral: neutralIcon, light: lightIcon, dark: darkIcon}}
                />
              </div>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
};

export default RealtimeArtifactRatio;
