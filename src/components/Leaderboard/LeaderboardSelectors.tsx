import React from "react";
import { useTranslation } from "react-i18next";
import { Select, SelectItem } from "@heroui/react";
import { useLeaderboard, ALL_MAPS_KEY } from "@/context/LeaderboardContext";
import { MAP_NAMES } from "@/types/game";

interface LeaderboardSelectorsProps {
  mapName: string;
  setMapName: (mapName: string) => void;
  className?: string;
}

const LeaderboardSelectors: React.FC<LeaderboardSelectorsProps> = ({ mapName, setMapName, className }) => {
  const { t } = useTranslation();
  const { region, setRegion } = useLeaderboard();

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

  return (
    <div className={`flex gap-2 w-full ${className}`}>
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
      <Select
        size="sm"
        selectedKeys={[mapName]}
        onSelectionChange={(keys) => setMapName(Array.from(keys)[0] as string)}
        className="min-w-[150px] flex-[2] sm:flex-none sm:w-[200px]"
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
  );
};

export default LeaderboardSelectors;
