import React from "react";
import {Trans} from "react-i18next";
import {Button} from "@heroui/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faStar as faStarSolid,
} from "@fortawesome/free-solid-svg-icons";
import {faStar as faStarRegular} from "@fortawesome/free-regular-svg-icons";
import {AdaptiveTooltip} from "@/components/AdaptiveTooltip";
import {getLastScheduledTime} from "@/utils/artifactTime";

interface ArtifactMatchupRowProps {
  matching: any;
  artifactsA: any[];
  artifactsB: any[];
  mapNames: {
    A: string;
    B: string;
  };
  artifactStates: any[];
  artifactStateMap: Record<string, Record<string, any>>;
  isAutoUpdate: boolean;
  selectedDate: any;
  starredServerIds: number[];
  toggleStar: (serverId: number) => void;
  formatCountdown: (recordTimeStr: string | undefined, hasContributors: boolean) => string;
  t: any;
  icons: {
    neutral: string;
    light: string;
    dark: string;
  };
  vsImage: string;
}

const ArtifactMatchupRow: React.FC<ArtifactMatchupRowProps> = ({
  matching,
  artifactsA,
  artifactsB,
  mapNames,
  artifactStates,
  artifactStateMap,
  isAutoUpdate,
  selectedDate,
  starredServerIds,
  toggleStar,
  t,
  icons,
  vsImage
}) => {
  const renderServerHeader = (server: any, isServer1: boolean) => {
    const isStarred = starredServerIds.includes(server.serverId);
    const serverAbbr = isServer1 ? t("common:server.lightAbbr") : t("common:server.darkAbbr");
    const bgGradient = isServer1
      ? "linear-gradient(135deg, #DBEDFF 0%, #F3FBFF 100%)"
      : "linear-gradient(225deg, #EFE5FF 0%, #F3FBFF 100%)";
    const textColor = isServer1 ? "text-primary" : "text-secondary";

    return (
      <div
        className="flex-1 h-[38px] flex items-center justify-center rounded-md relative"
        style={{background: bgGradient}}
      >
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className={`absolute ${isServer1 ? "left-1" : "right-1"} z-10 text-default-400 hover:text-star data-[starred=true]:text-star`}
          data-starred={isStarred}
          onClick={(e) => {
            e.stopPropagation();
            toggleStar(server.serverId);
          }}
        >
          <FontAwesomeIcon
            icon={isStarred ? faStarSolid : faStarRegular}
            className="text-base"
          />
        </Button>
        <span className={`text-lg font-bold ${textColor}`}>{server.serverName}</span>
        <span className="text-sm font-normal text-default-800">（{serverAbbr}{server.serverId % 1000}）</span>
      </div>
    );
  };

  const renderArtifactIcons = (artifacts: any[], mapName: string) => {
    return (
      <div className="flex-1 flex items-center justify-center gap-2">
        <span className="text-sm text-foreground max-w-[40px] sm:max-w-none whitespace-normal">
          {t(`maps:${mapName}.description`)}
        </span>
        <div className="flex gap-1">
          {artifacts.map((artifact) => {
            const artifactName = t(`markers/${mapName}:${artifact.markerId}.name`, artifact.marker.name);
            const stateData = artifactStateMap[matching.id]?.[artifact.id];
            const state = stateData?.state;
            const hasContributors = !!(stateData?.contributors && stateData.contributors.length > 0);

            let isContention = false;
            if (stateData?.recordTime && hasContributors) {
              const recordTime = new Date(stateData.recordTime).getTime();
              const compareTime = isAutoUpdate ? Date.now() : selectedDate.toDate().getTime();
              const lastRefresh = getLastScheduledTime(compareTime);
              if (recordTime < lastRefresh) isContention = true;
            } else {
              isContention = true;
            }

            let icon = icons.neutral;
            if (!isContention) {
              if (state === 1) icon = icons.light;
              else if (state === 2) icon = icons.dark;
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
    );
  };

  const renderContributorLine = (mapName: string) => {
    const states = artifactStates.filter(s => s.mapName === mapName);
    return (
      <div className="flex-1 flex items-center h-full bg-[rgba(82,82,82,0.04)]">
        {(() => {
          const state = states[0];
          const hasContributors = !!(state?.contributors && state.contributors.length > 0);
          let isContention = false;
          if (state?.recordTime && hasContributors) {
            const recordTime = new Date(state.recordTime).getTime();
            const compareTime = isAutoUpdate ? Date.now() : selectedDate.toDate().getTime();
            const lastRefresh = getLastScheduledTime(compareTime);
            if (recordTime < lastRefresh) isContention = true;
          } else {
            isContention = true;
          }

          if (isContention) {
            return (
              <div className="flex justify-center px-2 w-full">
                <span className="text-primary hover:underline text-sm font-bold cursor-pointer">
                  {t("common:leaderboard.submitData")}
                </span>
              </div>
            );
          }

          if (hasContributors) {
            return (
              <div className="flex items-center justify-start px-2 w-full" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-default-800">
                  <Trans
                    t={t}
                    i18nKey="common:leaderboard.providedBy"
                    values={{username: state.contributors[0].user.name}}
                    components={{
                      emph: <span className="text-primary font-medium"/>
                    }}
                  />
                </span>
              </div>
            );
          }

          return null;
        })()}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full gap-1">
      {/* First Row */}
      <div className="h-12 flex items-center justify-between w-full gap-2.5">
        {renderServerHeader(matching.server1, true)}
        <div className="w-12 h-12 flex items-center justify-center shrink-0">
          <img src={vsImage} alt="VS" className="w-full h-full object-contain"/>
        </div>
        {renderServerHeader(matching.server2, false)}
      </div>

      {/* Artifacts Icon Row */}
      <div className="flex items-center justify-between w-full h-[48px] my-[10px]">
        {renderArtifactIcons(artifactsA, mapNames.A)}
        <div className="flex flex-col items-center px-2 h-full justify-center">
          <div className="h-full w-px bg-default-500"/>
        </div>
        {renderArtifactIcons(artifactsB, mapNames.B)}
      </div>

      {/* Contributor Row */}
      <div className="flex items-center justify-between w-full h-[28px] gap-1">
        {renderContributorLine(mapNames.A)}
        {renderContributorLine(mapNames.B)}
      </div>
    </div>
  );
};

export default ArtifactMatchupRow;
