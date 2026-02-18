import React from "react";
import { useTranslation } from "react-i18next";
import { getStaticUrl } from "@/utils/url";
import { MAP_NAMES } from "@/types/game";

interface ArtifactRatioShareCardProps {
  server?: string;
  time?: string;
  matchings?: any[];
  artifactsA?: any[];
  artifactsB?: any[];
  artifactStateMap?: Record<string, Record<string, any>>;
  isAutoUpdate?: boolean;
  selectedDate?: any;
  icons?: {
    neutral: string;
    light: string;
    dark: string;
  };
}

const ArtifactRatioShareCard: React.FC<ArtifactRatioShareCardProps> = ({ 
  server = "Unknown Server", 
  time = new Date().toLocaleString(),
  matchings = [],
  artifactsA = [],
  artifactsB = [],
  artifactStateMap = {},
  isAutoUpdate = true,
  selectedDate,
  icons = {
    neutral: "",
    light: "",
    dark: ""
  }
}) => {
  const { t } = useTranslation(["common", "markers/AbyssA", "markers/AbyssB", "maps"]);

  const getArtifactIcon = (matching: any, artifact: any) => {
    const stateData = artifactStateMap[matching.id]?.[artifact.id];
    const state = stateData?.state;
    const hasContributors = !!(stateData?.contributors && stateData.contributors.length > 0);

    let isContention = false;
    if (stateData?.recordTime && hasContributors) {
      const recordTime = new Date(stateData.recordTime).getTime();
      const fortyEightHours = 48 * 60 * 60 * 1000;
      const compareTime = isAutoUpdate ? Date.now() : (selectedDate?.toDate?.().getTime() || Date.now());
      const diff = recordTime + fortyEightHours - compareTime;
      if (diff <= 0) isContention = true;
    } else {
      isContention = true;
    }

    if (!isContention) {
      if (state === 1) return icons.light;
      if (state === 2) return icons.dark;
    }
    return icons.neutral;
  };

  const renderServerColumn = (matching: any, serverData: any, isServer1: boolean, artifacts: any[], mapName: string) => {
    const serverAbbr = isServer1 ? t("common:server.lightAbbr") : t("common:server.darkAbbr");

    const bgGradient = isServer1
      ? "linear-gradient(90deg, #F9FCFF 0%, #58ACFF 100%)"
      : "linear-gradient(90deg, #FFFFFF 0%, #A468FF 100%)";

    return (
      <div className="flex-1 flex flex-col items-center">
        {/* First Line: Server Name (42px height, centered vertically in its container) */}
        <div className="h-12 w-full flex items-center justify-center">
          <div
            className="w-full h-[42px] flex items-center justify-center rounded-lg border border-white/20 relative bg-white/10"
          >
            <div className="flex items-center justify-center w-full px-1">
              <span 
                className="text-lg font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: bgGradient }}
              >
                {serverData.serverName}
              </span>
              <span className="text-sm font-normal text-default-700 whitespace-nowrap">（{serverAbbr}{serverData.serverId % 1000}）</span>
            </div>
          </div>
        </div>
        {/* Second Line: Map and Icons (44px height, all centered vertically) */}
        <div className="flex items-center justify-center h-11 gap-1">
          <span className="text-sm text-white/80 whitespace-nowrap">
            {t(`maps:${mapName}.description`) as string}
          </span>
          <div className="flex gap-0.5">
            {artifacts.map((artifact) => (
              <img
                key={artifact.id}
                src={getArtifactIcon(matching, artifact)}
                alt={t(`markers/${mapName}:${artifact.markerId}.name`, artifact.marker.name) as string}
                className="w-9 h-9 object-contain"
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const FactionHeader = () => (
    <div className="h-9 flex items-center shrink-0">
      <div className="flex-1 flex items-center justify-center">
        <span className="text-base font-normal text-white">天族</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <span className="text-base font-normal text-white">魔族</span>
      </div>
    </div>
  );

  return (
    <div 
      className="relative flex flex-col overflow-hidden w-[1680px] h-[986px] bg-[#4C2C7E] p-5 gap-2.5"
    >
      {/* Background Image */}
      <img 
        src={getStaticUrl("/images/Leaderboards/ExportBackground.webp")} 
        alt="Background" 
        className="absolute inset-x-0 top-0 w-full h-auto object-contain pointer-events-none"
      />

      {/* Top Header */}
      <div 
        className="relative z-10 flex items-center gap-6 h-[110px] pb-1 px-2.5 shrink-0"
      >
        <img 
          src={getStaticUrl("/images/Logo.webp")} 
          alt="Logo" 
          className="h-full w-auto object-contain"
        />
        <img 
          src={getStaticUrl("/images/GroupLogoDark.webp")} 
          alt="Group Logo" 
          className="h-[69px] w-auto object-contain"
        />
        <div className="flex flex-col justify-center gap-2.5">
          <div className="text-3xl font-bold text-white leading-tight">
            实时神器占比
          </div>
          <div className="text-sm text-white/80 leading-tight bg-black/20 rounded-lg px-2 py-0.5 w-fit">
            {server} | {time}
          </div>
        </div>
      </div>

      {/* Placeholder Area */}
      <div className="relative z-10 w-full h-fit bg-black/40 p-2.5 rounded-2xl">
        <div className="flex gap-2.5">
          <div className="flex-1 min-h-[56px] bg-white/10 border border-white/20 rounded-lg p-2.5 flex items-center justify-center gap-4 flex-wrap">
            <span className="text-lg font-bold text-white/90">
              {t(`maps:${MAP_NAMES.ABYSS_A}.description`) as string}
            </span>
            <div className="flex gap-4 flex-wrap justify-center">
              {artifactsA.map((artifact) => (
                <div key={artifact.id} className="flex items-center gap-1">
                  <img src={icons.neutral} alt="" className="w-9 h-9 object-contain" />
                  <span className="text-sm font-normal text-white/90">
                    {t(`markers/AbyssA:${artifact.markerId}.name`, artifact.marker.name) as string}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[56px] bg-white/10 border border-white/20 rounded-lg p-2.5 flex items-center justify-center gap-4 flex-wrap">
            <span className="text-lg font-bold text-white/90">
              {t(`maps:${MAP_NAMES.ABYSS_B}.description`) as string}
            </span>
            <div className="flex gap-4 flex-wrap justify-center">
              {artifactsB.map((artifact) => (
                <div key={artifact.id} className="flex items-center gap-1">
                  <img src={icons.neutral} alt="" className="w-9 h-9 object-contain" />
                  <span className="text-sm font-normal text-white/90">
                    {t(`markers/AbyssB:${artifact.markerId}.name`, artifact.marker.name) as string}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Content Area: Grid of 3 columns */}
      <div className="relative z-10 w-full h-fit max-h-[760px] bg-black/40 p-2.5 rounded-2xl overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-3 gap-2.5">
          {/* Faction Headers for each column */}
          <div className="flex flex-col gap-2.5">
            <FactionHeader />
          </div>
          <div className="flex flex-col gap-2.5">
            <FactionHeader />
          </div>
          <div className="flex flex-col gap-2.5">
            <FactionHeader />
          </div>

          {matchings.map((matching) => (
            <div key={matching.id} className="bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg flex items-stretch justify-between h-fit">
              {renderServerColumn(matching, matching.server1, true, artifactsA, MAP_NAMES.ABYSS_A)}
              
              {/* Middle: VS */}
              <div className="flex flex-col items-center px-2 h-full justify-center">
                <div className="h-12 flex items-center">
                  <img src={getStaticUrl("/images/Leaderboards/VS.webp")} alt="VS" className="w-12 h-12 object-contain"/>
                </div>
              </div>

              {renderServerColumn(matching, matching.server2, false, artifactsB, MAP_NAMES.ABYSS_B)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArtifactRatioShareCard;
