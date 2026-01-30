import React from "react";
import {Trans} from "react-i18next";
import {Button} from "@heroui/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faStar as faStarSolid,
  faThumbsUp,
  faThumbsDown
} from "@fortawesome/free-solid-svg-icons";
import {faStar as faStarRegular} from "@fortawesome/free-regular-svg-icons";
import {AdaptiveTooltip} from "@/components/AdaptiveTooltip";

interface ServerArtifactColumnProps {
  matching: any;
  server: any;
  isServer1: boolean;
  artifacts: any[];
  mapName: string;
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
}

const ServerArtifactColumn: React.FC<ServerArtifactColumnProps> = ({
  matching,
  server,
  isServer1,
  artifacts,
  mapName,
  artifactStates,
  artifactStateMap,
  isAutoUpdate,
  selectedDate,
  starredServerIds,
  toggleStar,
  formatCountdown,
  t,
  icons
}) => {
  const isStarred = starredServerIds.includes(server.serverId);
  const serverAbbr = isServer1 ? t("common:server.lightAbbr") : t("common:server.darkAbbr");
  const bgGradient = isServer1
    ? "linear-gradient(135deg, #DBEDFF 0%, #F3FBFF 100%)"
    : "linear-gradient(225deg, #EFE5FF 0%, #F3FBFF 100%)";
  const textColor = isServer1 ? "#1D3557" : "#4B0082";

  return (
    <div className="flex-1 flex flex-col items-center">
      <div
        className="w-full h-[38px] flex items-center justify-center rounded-md relative"
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
            className="text-[16px]"
          />
        </Button>
        <span className="text-lg font-bold" style={{color: textColor}}>{server.serverName}</span>
        <span className="text-[14px] font-normal text-default-700">（{serverAbbr}{server.serverId % 1000}）</span>
      </div>
      <div className="flex flex-col items-center gap-2 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-foreground max-w-[40px] sm:max-w-none whitespace-normal">
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
                const fortyEightHours = 48 * 60 * 60 * 1000;
                const compareTime = isAutoUpdate ? Date.now() : selectedDate.toDate().getTime();
                const diff = recordTime + fortyEightHours - compareTime;
                if (diff <= 0) isContention = true;
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
        {/* Third Line: Countdown */}
        <div
          className="text-[20px] text-default-800 font-mono text-center"
        >
          {(() => {
            const state = artifactStates[0];
            const hasContributors = !!(state?.contributors && state.contributors.length > 0);
            return formatCountdown(state?.recordTime, hasContributors);
          })()}
        </div>

        {/* Contributor Line */}
        <div className="w-full mt-1 min-h-[18px]">
          {(() => {
            const state = artifactStates[0];
            const hasContributors = !!(state?.contributors && state.contributors.length > 0);
            let isContention = false;
            if (state?.recordTime && hasContributors) {
              const recordTime = new Date(state.recordTime).getTime();
              const fortyEightHours = 48 * 60 * 60 * 1000;
              const compareTime = isAutoUpdate ? Date.now() : selectedDate.toDate().getTime();
              const diff = recordTime + fortyEightHours - compareTime;
              if (diff <= 0) isContention = true;
            } else {
              isContention = true;
            }

            if (isContention) {
              return (
                <div className="flex justify-center w-full">
                  <span className="text-primary hover:underline text-sm font-bold cursor-pointer">
                    {t("common:leaderboard.submitData")}
                  </span>
                </div>
              );
            }

            if (hasContributors) {
              return (
                <div className="flex items-center justify-between w-full" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[12px] text-default-800">
                    <Trans
                      t={t}
                      i18nKey="common:leaderboard.providedBy"
                      values={{username: state.contributors[0].user.name}}
                      components={{
                        emph: <span className="text-primary font-medium"/>
                      }}
                    />
                  </span>
                  <div className="flex gap-2 text-default-400">
                    <FontAwesomeIcon icon={faThumbsUp} className="cursor-pointer hover:text-primary transition-colors"/>
                    <FontAwesomeIcon icon={faThumbsDown} className="cursor-pointer hover:text-danger transition-colors"/>
                  </div>
                </div>
              );
            }

            return null;
          })()}
        </div>
      </div>
    </div>
  );
};

export default ServerArtifactColumn;
