import React, { useEffect, useMemo } from "react";
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
  SelectItem
} from "@heroui/react";
import { useLeaderboard, ALL_MAPS_KEY } from "@/context/LeaderboardContext";
import type {ArtifactCount} from "@/types/leaderboard.ts";
import { MAP_NAMES } from "@/types/game";

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
    setSelectedSeasonId,
    selectedSeasonNumber,
    setSelectedSeasonNumber,
    selectedMatchingNumber,
    setSelectedMatchingNumber
  } = useLeaderboard();

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5 w-full">
        <div className="flex flex-col items-start gap-3 px-5 h-[62px] justify-center artifact-ratio-card-header shadow-[0px_3px_8px_0px_rgba(0,0,0,0.05)] rounded-[8px] border-1 border-solid w-full">
          <p className="text-xl font-normal text-default-900">{t("common:leaderboard.artifactRegionRanking")}</p>
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
            <SelectItem key={MAP_NAMES.ABYSS_B}>
              {t(`maps:${MAP_NAMES.ABYSS_B}.description`)}
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
    </div>
  );
};

export default ArtifactRegionRanking;
