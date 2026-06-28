import React, {useMemo, useState, useEffect, useCallback, useRef} from "react";
import {useTranslation} from "react-i18next";
import {Card, CardBody, Button, DatePicker, Select, SelectItem, Modal, ModalContent, ModalBody, useDisclosure, CircularProgress, Switch} from "@heroui/react";
import {now, getLocalTimeZone} from "@internationalized/date";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faRotateRight,
  faShare,
  faDownload
} from "@fortawesome/free-solid-svg-icons";
import {toJpeg} from "html-to-image";
import {useLeaderboard} from "@/context/LeaderboardContext";
import {MAP_NAMES} from "@/types/game";
import {getStaticUrl} from "@/utils/url";
import {getNextScheduledTime, getLastScheduledTime} from "@/utils/artifactTime";
import {AdaptiveTooltip} from "@/components/AdaptiveTooltip";
import {I18nProvider} from "@react-aria/i18n";

import { useNavigate } from "@tanstack/react-router";
import ArtifactMatchupRow from "./ArtifactMatchupRow.tsx";
import ArtifactRatioShareCard from "./ArtifactRatioShareCard";
import ArtifactRatioShareCardWrapper from "./ArtifactRatioShareCardWrapper";

const RealtimeArtifactRatio: React.FC = () => {
  const navigate = useNavigate();
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
    setRegion,
    selectedSeasonId,
    selectedSeasonNumber,
    setSelectedSeasonNumber,
    selectedMatchingNumber,
    setSelectedMatchingNumber
  } = useLeaderboard();

  const isSeason3OrLater = selectedSeasonNumber !== null && selectedSeasonNumber >= 3;
  const abyssBOrC = isSeason3OrLater ? MAP_NAMES.ABYSS_C : MAP_NAMES.ABYSS_B;
  const ABYSS_MAPS = [MAP_NAMES.ABYSS_A, abyssBOrC];
  const markerNs = ABYSS_MAPS.map(x => `markers/${x}`);
  const {t, i18n} = useTranslation([...markerNs, "common"]);
  const STARRED_SERVERS_KEY = "starred_artifact_servers";
  const [selectedDate, setSelectedDate] = useState(now(getLocalTimeZone()));
  const [isAutoUpdate, setIsAutoUpdate] = useState(true);
  const [isMobileVersion, setIsMobileVersion] = useState(true);
  const [sortOrder, setSortOrder] = useState<"official" | "elyos" | "asmo">("official");

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
      const nextTargetTime = getNextScheduledTime(now.getTime());
      const nextTarget = new Date(nextTargetTime);

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
      // Starred servers always come first
      const aStarred = starredServerIds.includes(a.server1.serverId) || starredServerIds.includes(a.server2.serverId);
      const bStarred = starredServerIds.includes(b.server1.serverId) || starredServerIds.includes(b.server2.serverId);
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;

      // Apply specific sort order
      if (sortOrder === "elyos") {
        const isALight1 = a.server1.serverId < 2000;
        const isALight2 = a.server2.serverId < 2000;
        const isBLight1 = b.server1.serverId < 2000;
        const isBLight2 = b.server2.serverId < 2000;

        const aHasLight = isALight1 || isALight2;
        const bHasLight = isBLight1 || isBLight2;

        if (aHasLight && !bHasLight) return -1;
        if (!aHasLight && bHasLight) return 1;

        const aSortId = isALight1 && isALight2 ? Math.min(a.server1.serverId, a.server2.serverId) : 
                        isALight1 ? a.server1.serverId : 
                        isALight2 ? a.server2.serverId : 
                        Math.min(a.server1.serverId, a.server2.serverId);
        const bSortId = isBLight1 && isBLight2 ? Math.min(b.server1.serverId, b.server2.serverId) : 
                        isBLight1 ? b.server1.serverId : 
                        isBLight2 ? b.server2.serverId : 
                        Math.min(b.server1.serverId, b.server2.serverId);
        return aSortId - bSortId;
      }
      if (sortOrder === "asmo") {
        const isADark1 = a.server1.serverId >= 2000;
        const isADark2 = a.server2.serverId >= 2000;
        const isBDark1 = b.server1.serverId >= 2000;
        const isBDark2 = b.server2.serverId >= 2000;

        const aHasDark = isADark1 || isADark2;
        const bHasDark = isBDark1 || isBDark2;

        if (aHasDark && !bHasDark) return -1;
        if (!aHasDark && bHasDark) return 1;

        const aSortId = isADark1 && isADark2 ? Math.min(a.server1.serverId, a.server2.serverId) : 
                        isADark1 ? a.server1.serverId : 
                        isADark2 ? a.server2.serverId : 
                        Math.min(a.server1.serverId, a.server2.serverId);
        const bSortId = isBDark1 && isBDark2 ? Math.min(b.server1.serverId, b.server2.serverId) : 
                        isBDark1 ? b.server1.serverId : 
                        isBDark2 ? b.server2.serverId : 
                        Math.min(b.server1.serverId, b.server2.serverId);
        return aSortId - bSortId;
      }

      // Default/Official order: no additional sorting needed (already handled by server response or stars)
      return 0;
    });
  }, [serverMatchings, starredServerIds, sortOrder]);

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

  const regionSeasons = useMemo(() => {
    return seasons
      .filter(s => s.serverRegion.toLowerCase() === region.toLowerCase());
  }, [seasons, region]);

  const uniqueSeasonNumbers = useMemo(() => {
    const numbers = Array.from(new Set(regionSeasons.map(s => s.number)));
    return numbers.sort((a, b) => b - a);
  }, [regionSeasons]);

  const matchingNumbersForSeason = useMemo(() => {
    if (selectedSeasonNumber === null) return [];
    const matchingNumbers = Array.from(new Set(
      regionSeasons
        .filter(s => s.number === selectedSeasonNumber)
        .map(s => s.matchingNumber)
    ));
    return matchingNumbers.sort((a, b) => b - a);
  }, [regionSeasons, selectedSeasonNumber]);

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
    if (selectedSeasonId) {
      fetchServerMatchings(selectedSeasonId);
      if (isAutoUpdate) {
        debouncedFetchArtifactStates(selectedSeasonId);
      } else {
        const date = selectedDate.toDate();
        fetchArtifactStates(selectedSeasonId, date);
      }
      // Also fetch artifact counts here as it's needed by ArtifactRegionRanking
      // Doing it here centralizes the fetch for this season
      // fetchArtifactCounts(selectedSeasonId, ALL_MAPS_KEY); // Actually ArtifactRegionRanking might have different mapName
    }
  }, [selectedSeasonId, isAutoUpdate, isAutoUpdate ? null : selectedDate, fetchServerMatchings, debouncedFetchArtifactStates, fetchArtifactStates]);

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
    const compareTime = isAutoUpdate ? Date.now() : selectedDate.toDate().getTime();
    const lastRefresh = getLastScheduledTime(compareTime);

    if (recordTime < lastRefresh) {
      return t("common:leaderboard.inContention");
    }

    const nextRefresh = getNextScheduledTime(compareTime);
    const diff = nextRefresh - compareTime;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const {artifactsA, artifactsB} = useMemo(() => {
    const a = (artifactsByMap[MAP_NAMES.ABYSS_A] || []).sort((a, b) => a.order - b.order);
    const b = (artifactsByMap[abyssBOrC] || []).sort((a, b) => a.order - b.order);
    return {artifactsA: a, artifactsB: b};
  }, [artifactsByMap]);

  const seasonInfo = useMemo(() => {
    const seasonStr = selectedSeasonNumber !== null ? t("common:leaderboard.seasonN", { n: selectedSeasonNumber }) : "";
    const matchingStr = selectedMatchingNumber !== null ? t("common:leaderboard.matchingN", { n: selectedMatchingNumber }) : "";
    return `${seasonStr} ${matchingStr}`.trim();
  }, [selectedSeasonNumber, selectedMatchingNumber, t]);

  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const shareCardWrapperRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (shareCardRef.current === null) {
      return;
    }

    setIsDownloading(true);
    try {
      const date = selectedDate.toDate();
      const offset = -date.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(offset) / 60);
      const offsetSign = offset >= 0 ? "+" : "-";
      const gmtOffset = `GMT${offsetSign}${offsetHours}`;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      
      const formattedDate = `${year}_${month}_${day}_${hours}_${minutes}_${seconds}_${gmtOffset}`;

      const dataUrl = await toJpeg(shareCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        quality: 0.95,
        filter: (node: HTMLElement) => {
          // Skip any style/link tags that might cause SecurityError
          if (node.tagName === 'LINK' && (node as HTMLLinkElement).rel === 'stylesheet') {
            const href = (node as HTMLLinkElement).href;
            if (href.includes('fonts.googleapis.cn')) {
              return false;
            }
          }
          return true;
        }
      });
      const link = document.createElement("a");
      link.download = `artifact-${region}-${formattedDate}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download image", err);
    } finally {
      setIsDownloading(false);
    }
  }, [region, selectedDate]);

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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5 w-full">
        <div className="flex flex-col items-start gap-3 px-5 h-[62px] justify-center artifact-ratio-card-header shadow-[0px_3px_8px_0px_rgba(0,0,0,0.05)] rounded-[8px] border-1 border-solid">
          <div className="flex items-center gap-2 justify-between w-full">
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-default-900">{t("common:leaderboard.realtimeArtifactRatio")}</p>
              {globalCountdown && (
                <span className="text-base font-mono font-normal text-primary">
                  {globalCountdown}
                </span>
              )}
            </div>
            <AdaptiveTooltip content={t("common:leaderboard.share", "分享")}>
              <Button
                isIconOnly
                size="lg"
                variant="light"
                onPress={onOpen}
                className="text-primary"
              >
                <FontAwesomeIcon icon={faShare} />
              </Button>
            </AdaptiveTooltip>
          </div>
        </div>
        <div className="flex gap-2 w-full">
          <Select
            size="sm"
            selectedKeys={[region]}
            onSelectionChange={(keys) => setRegion(Array.from(keys)[0] as string)}
            className="min-w-[80px] w-[80px] md:hidden"
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
          <Select
            size="sm"
            selectedKeys={selectedSeasonNumber !== null ? [selectedSeasonNumber.toString()] : []}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as string;
              if (val) setSelectedSeasonNumber(parseInt(val));
            }}
            className="min-w-[105px] w-[105px] md:hidden"
            disallowEmptySelection
            classNames={selectClassNames}
            popoverProps={{
              radius: "none",
            }}
            listboxProps={commonListboxProps}
            isDisabled={uniqueSeasonNumbers.length === 0}
          >
            {uniqueSeasonNumbers.map((num) => (
              <SelectItem key={num.toString()}>
                {t("common:leaderboard.seasonN", { n: num })}
              </SelectItem>
            ))}
          </Select>
          <Select
            size="sm"
            selectedKeys={selectedMatchingNumber !== null ? [selectedMatchingNumber.toString()] : []}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as string;
              if (val) setSelectedMatchingNumber(parseInt(val));
            }}
            className="min-w-[120px] w-[120px] md:hidden"
            disallowEmptySelection
            classNames={selectClassNames}
            popoverProps={{
              radius: "none",
            }}
            listboxProps={commonListboxProps}
            isDisabled={matchingNumbersForSeason.length === 0}
          >
            {matchingNumbersForSeason.map((num) => (
              <SelectItem key={num.toString()}>
                {t("common:leaderboard.matchingN", { n: num })}
              </SelectItem>
            ))}
          </Select>
          <I18nProvider locale={i18n.language}>
            <div className="relative">
              <DatePicker
                className="w-[260px]"
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
                    <FontAwesomeIcon icon={faRotateRight} className="text-xs"/>
                  </Button>
                </AdaptiveTooltip>
              )}
            </div>
          </I18nProvider>
          <Select
            size="sm"
            selectedKeys={[sortOrder]}
            onSelectionChange={(keys) => setSortOrder(Array.from(keys)[0] as any)}
            className="min-w-[105px] w-[105px] ml-auto"
            disallowEmptySelection
            classNames={selectClassNames}
            popoverProps={{
              radius: "none",
            }}
            listboxProps={commonListboxProps}
          >
            <SelectItem key="official">官方顺序</SelectItem>
            <SelectItem key="elyos">天族顺序</SelectItem>
            <SelectItem key="asmo">魔族顺序</SelectItem>
          </Select>
        </div>
      </div>

      {loadingMatchings || loadingArtifacts ? (
        <p className="text-center py-4">{t("common:ui.loading")}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between h-9">
            <div className="flex-1 flex justify-center">
              <span className="font-normal text-default-900">{t(`maps:${MAP_NAMES.ABYSS_A}.description`)}</span>
            </div>
            <div className="flex-1 flex justify-center">
              <span className="font-normal text-default-900">{t(`maps:${abyssBOrC}.description`)}</span>
            </div>
          </div>
          {sortedMatchings.map((matching) => {
            const isStarred = starredServerIds.includes(matching.server1.serverId) || starredServerIds.includes(matching.server2.serverId);
            return (
              <Card key={matching.id}
                    isPressable
                    onClick={() => navigate({ to: `/leaderboard/artifacts/${matching.id}` })}
                    className={`bg-character-equipment shadow-none border-1 ${isStarred ? "border-primary" : "border-crafting-border"} p-2.5 relative group`}>
                <CardBody className="p-0">
                  <ArtifactMatchupRow
                    matching={matching}
                    artifactsA={artifactsA}
                    artifactsB={artifactsB}
                    mapNames={{A: MAP_NAMES.ABYSS_A, B: abyssBOrC}}
                    artifactStates={artifactStates.filter(s => s.serverMatchingId === matching.id)}
                    artifactStateMap={artifactStateMap}
                    isAutoUpdate={isAutoUpdate}
                    selectedDate={selectedDate}
                    starredServerIds={starredServerIds}
                    toggleStar={toggleStar}
                    formatCountdown={formatCountdown}
                    t={t}
                    icons={{neutral: neutralIcon, light: lightIcon, dark: darkIcon}}
                    vsImage={vsImage}
                  />
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="full" scrollBehavior="inside" hideCloseButton isDismissable={false}>
        <ModalContent className="bg-transparent shadow-none">
          {(onClose) => (
            <ModalBody className="p-0 flex items-center justify-center relative">
              <div className="absolute top-5 right-5 z-50 flex gap-2">
                <div className="flex items-center bg-black/50 hover:bg-black/70 rounded-full px-4 h-12 transition-colors">
                  <Switch
                    size="sm"
                    isSelected={isMobileVersion}
                    onValueChange={setIsMobileVersion}
                    classNames={{
                      label: "text-white text-sm font-medium ml-2",
                    }}
                  >
                    {isMobileVersion ? "竖版" : "横版"}
                  </Switch>
                </div>
                <div className="relative flex items-center justify-center">
                  {isDownloading && (
                    <CircularProgress
                      size="lg"
                      aria-label="Downloading..."
                      classNames={{
                      base: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0",
                      svg: "w-14 h-14 block",
                      indicator: "stroke-primary",
                      track: "stroke-white/10",
                    }}
                    />
                  )}
                  <Button
                    isIconOnly
                    variant="flat"
                    className="bg-black/50 hover:bg-black/70 text-white min-w-0 w-12 h-12 rounded-full z-10"
                    onPress={() => {
                      handleDownload();
                    }}
                    isLoading={isDownloading}
                  >
                    {!isDownloading && <FontAwesomeIcon icon={faDownload} className="text-xl" />}
                  </Button>
                </div>
                <Button
                  isIconOnly
                  variant="flat"
                  className="bg-black/50 hover:bg-black/70 text-white min-w-0 w-12 h-12 rounded-full"
                  onPress={onClose}
                >
                  <span className="text-2xl">&times;</span>
                </Button>
              </div>
              <ArtifactRatioShareCardWrapper 
                ref={shareCardWrapperRef}
                baseWidth={isMobileVersion ? 750 : 1680}
                baseHeight={isMobileVersion ? 1300 : 986}
                isMobile={isMobileVersion}
              >
                <ArtifactRatioShareCard 
                  ref={shareCardRef}
                  server={t(`common:server.${region}`)} 
                  seasonInfo={seasonInfo}
                  time={selectedDate.toDate().toLocaleString()}
                  matchings={sortedMatchings}
                  artifactsA={artifactsA}
                  artifactsB={artifactsB}
                  artifactStateMap={artifactStateMap}
                  isAutoUpdate={isAutoUpdate}
                  selectedDate={selectedDate}
                  icons={{neutral: neutralIcon, light: lightIcon, dark: darkIcon}}
                  isMobile={isMobileVersion}
                />
              </ArtifactRatioShareCardWrapper>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default RealtimeArtifactRatio;
