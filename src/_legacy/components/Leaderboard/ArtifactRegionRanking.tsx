import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { 
  Table,
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell,
  Spinner,
  Select,
  SelectItem,
  Button,
  Modal,
  ModalContent,
  ModalBody,
  useDisclosure,
  Switch,
  CircularProgress
} from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShare, faDownload } from "@fortawesome/free-solid-svg-icons";
import { toJpeg } from "html-to-image";
import { useLeaderboard, ALL_MAPS_KEY } from "@/context/LeaderboardContext";
import type {ArtifactCount} from "@/types/leaderboard.ts";
import { MAP_NAMES } from "@/types/game";
import { AdaptiveTooltip } from "@/components/AdaptiveTooltip";
import ArtifactRankingShareCard from "./ArtifactRankingShareCard";
import ArtifactRatioShareCardWrapper from "./ArtifactRatioShareCardWrapper";

interface ArtifactRegionRankingProps {
  mapName: string;
  setMapName: (mapName: string) => void;
}

const ArtifactRegionRanking: React.FC<ArtifactRegionRankingProps> = ({ mapName, setMapName }) => {
  const { t } = useTranslation();
  const {
    seasons,
    artifactCounts,
    fetchArtifactCounts,
    loadingArtifactCounts,
    serverMatchings,
    loadingMatchings,
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

  useEffect(() => {
    if (selectedSeasonId) {
      fetchArtifactCounts(selectedSeasonId, mapName);
    }
  }, [selectedSeasonId, mapName, fetchArtifactCounts]);

  const sortedData = useMemo(() => {
    const sorted = [...artifactCounts]
      .sort((a, b) => b.artifactCount - a.artifactCount || a.serverId - b.serverId);
    
    // Calculate rankings with ties
    const results: (ArtifactCount & { rank: number })[] = [];
    let lastCount = -1;
    let lastRank = 0;

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      if (item.artifactCount !== lastCount) {
        lastRank = i + 1;
        lastCount = item.artifactCount;
      }
      results.push({ ...item, rank: lastRank });
    }

    return results;
  }, [artifactCounts]);

  const getServerName = (serverId: number) => {
    const matching = serverMatchings.find(
      m => m.server1.serverId === serverId || m.server2.serverId === serverId
    );
    if (matching) {
      const server = matching.server1.serverId === serverId ? matching.server1 : matching.server2;
      const raceAbbr = server.raceId === 1 ? t("common:server.lightAbbr") : t("common:server.darkAbbr");
      const displayId = server.serverId % 1000;
      return `${server.serverName}（${raceAbbr}${displayId}）`;
    }
    
    // Default fallback if no matching is found
    const raceAbbr = serverId < 2000 ? t("common:server.lightAbbr") : t("common:server.darkAbbr");
    const displayId = serverId % 1000;
    return `${t("common:server.server")}（${raceAbbr}${displayId}）`;
  };

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isMobileVersion, setIsMobileVersion] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    if (shareCardRef.current === null) return;

    setIsDownloading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const formattedDate = `${year}_${month}_${day}_${hours}_${minutes}`;

      const dataUrl = await toJpeg(shareCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        quality: 0.95,
      });
      const link = document.createElement("a");
      link.download = `artifact-ranking-${region}-${formattedDate}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download image", err);
    } finally {
      setIsDownloading(false);
    }
  }, [region]);

  const seasonInfo = useMemo(() => {
    const seasonStr = selectedSeasonNumber !== null ? t("common:leaderboard.seasonN", { n: selectedSeasonNumber }) : "";
    const matchingStr = selectedMatchingNumber !== null ? t("common:leaderboard.matchingN", { n: selectedMatchingNumber }) : "";
    return `${seasonStr} ${matchingStr}`.trim();
  }, [selectedSeasonNumber, selectedMatchingNumber, t]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5 w-full">
        <div className="flex flex-col items-start gap-3 px-5 h-[62px] justify-center artifact-ratio-card-header shadow-[0px_3px_8px_0px_rgba(0,0,0,0.05)] rounded-[8px] border-1 border-solid w-full">
          <div className="flex items-center justify-between w-full">
            <p className="text-xl font-bold text-default-900">{t("common:leaderboard.artifactRegionRanking")}</p>
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
        <div className="flex gap-2 w-full ">
          <Select
            size="sm"
            selectedKeys={[region]}
            onSelectionChange={(keys) => setRegion(Array.from(keys)[0] as string)}
            className="min-w-[80px] w-[80px]"
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
            className="min-w-[105px] w-[105px]"
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
            className="min-w-[120px] w-[120px]"
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
          <Select
            size="sm"
            selectedKeys={[mapName]}
            onSelectionChange={(keys) => setMapName(Array.from(keys)[0] as string)}
            className="min-w-[100px] flex-1"
            disallowEmptySelection
            classNames={selectClassNames}
            popoverProps={{
              radius: "none",
            }}
            listboxProps={commonListboxProps}
          >
            <SelectItem key={ALL_MAPS_KEY}>
              {t("common:leaderboard.allMaps", "全部地图")}
            </SelectItem>
            <SelectItem key={MAP_NAMES.ABYSS_A}>
              {t(`maps:${MAP_NAMES.ABYSS_A}.description`)}
            </SelectItem>
            <SelectItem key={abyssBOrC}>
              {t(`maps:${abyssBOrC}.description`)}
            </SelectItem>
          </Select>
        </div>
      </div>
      <div>
        {loadingArtifactCounts || loadingMatchings || serverMatchings.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <Spinner />
          </div>
        ) : (
          <Table 
            aria-label="Artifact Region Ranking"
            removeWrapper
            className="min-w-full"
            classNames={{
              table: "border-separate border-spacing-y-[10px] -mt-[10px]",
              thead: "[&>tr[aria-hidden=true]]:hidden",
              th: "bg-transparent text-default-900 font-normal text-base h-[36px] py-0",
              // tr: "",
              td: "bg-character-equipment h-[44px] text-base font-normal text-default-900 border-y-1 border-crafting-border first:border-l-1 last:border-r-1 first:rounded-l-md last:rounded-r-md"
            }}
          >
            <TableHeader>
              <TableColumn>{t("common:leaderboard.rank")}</TableColumn>
              <TableColumn>{t("common:server.server")}</TableColumn>
              <TableColumn align="center">{t("common:leaderboard.artifactCount")}</TableColumn>
            </TableHeader>
            <TableBody 
              emptyContent={t("common:ui.noData")}
              items={sortedData}
            >
              {(item) => {
                return (
                  <TableRow key={item.serverId}>
                    <TableCell>
                      <div className="flex items-center justify-center w-full h-full">
                        <div className="w-5 h-5 rounded-sm border-1 border-crafting-border rotate-45 flex items-center justify-center bg-transparent">
                          <span className="-rotate-45 text-sm font-normal text-default-900">
                            {item.rank}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span>{getServerName(item.serverId)}</span>
                    </TableCell>
                    <TableCell align="center" className="font-bold">
                      <span>{item.artifactCount}</span>
                    </TableCell>
                  </TableRow>
                );
              }}
            </TableBody>
          </Table>
        )}
      </div>

  <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange} 
        size="full" 
        scrollBehavior="inside" 
        hideCloseButton 
        isDismissable={false}
      >
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
                isMobile={isMobileVersion}
                baseWidth={isMobileVersion ? 750 : 1680}
                baseHeight={isMobileVersion ? 1300 : 900}
              >
                <ArtifactRankingShareCard 
                  ref={shareCardRef}
                  data={sortedData}
                  serverMatchings={serverMatchings}
                  isMobile={isMobileVersion}
                  region={region}
                  seasonInfo={seasonInfo}
                  selectedSeasonNumber={selectedSeasonNumber}
                />
              </ArtifactRatioShareCardWrapper>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ArtifactRegionRanking;
