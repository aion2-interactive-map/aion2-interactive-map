import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Select, 
  SelectItem, 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell,
  Spinner
} from "@heroui/react";
import { useLeaderboard } from "@/context/LeaderboardContext";
import { MAP_NAMES } from "@/types/game";
import type {ArtifactCount} from "@/types/leaderboard.ts";

const ArtifactRegionRanking: React.FC = () => {
  const { t } = useTranslation();
  const { 
    seasons,
    artifactCounts, 
    fetchArtifactCounts, 
    loadingArtifactCounts,
    serverMatchings,
    region,
    setRegion
  } = useLeaderboard();

  const [mapName, setMapName] = useState<string>(MAP_NAMES.ABYSS_A);

  const selectClassNames = {
    trigger: "!bg-character-card hover:!bg-character-card focus:!bg-character-card !transition-none border-crafting-border border-1 shadow-none rounded-sm group-data-[hover=true]:!bg-character-card group-data-[focus=true]:!bg-character-card group-data-[focus-visible=true]:!bg-character-card",
    innerWrapper: "h-10 py-0",
    popoverContent: "rounded-none p-0"
  };

  const commonListboxProps = {
    itemClasses: {
      base: "rounded-none",
    },
  };

  const regionSeasonId = useMemo(() => {
    // Find the latest season number across all seasons
    if (seasons.length === 0) return null;
    const latestSeasonNumber = Math.max(...seasons.map(s => s.number));
    
    const season = seasons.find(s => s.serverRegion.toLowerCase() === region.toLowerCase() && s.number === latestSeasonNumber);
    return season?.id || null;
  }, [seasons, region]);

  useEffect(() => {
    if (regionSeasonId) {
      fetchArtifactCounts(regionSeasonId, mapName);
    }
  }, [regionSeasonId, mapName, fetchArtifactCounts]);

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
    <Card className="bg-transparent shadow-none">
      <CardHeader className="flex flex-col items-start gap-3 px-0">
        <p className="text-[22px] text-default-800 pb-4">{t("common:leaderboard.artifactRegionRanking")}</p>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            size="sm"
            selectedKeys={[region]}
            onSelectionChange={(keys) => setRegion(Array.from(keys)[0] as string)}
            className="min-w-[100px]"
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
            selectedKeys={[mapName]}
            onSelectionChange={(keys) => setMapName(Array.from(keys)[0] as string)}
            className="min-w-[150px]"
            disallowEmptySelection
            classNames={selectClassNames}
            popoverProps={{
              radius: "none",
            }}
            listboxProps={commonListboxProps}
          >
            <SelectItem key={MAP_NAMES.ABYSS_A}>
              {t(`maps:${MAP_NAMES.ABYSS_A}.description`)}
            </SelectItem>
            <SelectItem key={MAP_NAMES.ABYSS_B}>
              {t(`maps:${MAP_NAMES.ABYSS_B}.description`)}
            </SelectItem>
          </Select>
        </div>
      </CardHeader>
      <CardBody className="px-0">
        <Table 
          aria-label="Artifact Region Ranking"
          removeWrapper
          className="min-w-full"
          classNames={{
            table: "border-separate border-spacing-y-[10px] -mt-[10px]",
            thead: "[&>tr]:first:shadow-none",
            th: "bg-transparent text-foreground font-bold text-[16px] h-auto py-0",
            // tr: "",
            td: "bg-character-equipment h-[44px] text-[16px] font-normal text-default-800 border-y-1 border-crafting-border first:border-l-1 last:border-r-1 first:rounded-l-md last:rounded-r-md"
          }}
        >
          <TableHeader>
            <TableColumn>{t("common:leaderboard.rank")}</TableColumn>
            <TableColumn>{t("common:server.server")}</TableColumn>
            <TableColumn align="center">{t("common:leaderboard.artifactCount")}</TableColumn>
          </TableHeader>
          <TableBody 
            emptyContent={loadingArtifactCounts ? <Spinner /> : t("common:leaderboard.inContention")}
            items={sortedData}
          >
            {(item) => {
              return (
                <TableRow key={item.serverId}>
                  <TableCell>
                    <div className="flex items-center justify-center w-6 h-6">
                      {item.rank}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span>{getServerName(item.serverId)}</span>
                  </TableCell>
                  <TableCell align="center">
                    <span>{item.artifactCount}</span>
                  </TableCell>
                </TableRow>
              );
            }}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
};

export default ArtifactRegionRanking;
