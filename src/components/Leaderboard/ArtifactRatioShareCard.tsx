import React from "react";
import { useTranslation } from "react-i18next";
import { getStaticUrl } from "@/utils/url";
import { MAP_NAMES } from "@/types/game";
import { getLastScheduledTime } from "@/utils/artifactTime";

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
  isMobile?: boolean;
}

const ArtifactRatioShareCard = React.forwardRef<HTMLDivElement, ArtifactRatioShareCardProps>(({ 
  server = "Unknown Server", 
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
  },
  isMobile = false
}, ref) => {
  const { t } = useTranslation(["common", "markers/AbyssA", "markers/AbyssB", "maps"]);

  const getArtifactIcon = (matching: any, artifact: any) => {
    const stateData = artifactStateMap[matching.id]?.[artifact.id];
    const state = stateData?.state;
    const hasContributors = !!(stateData?.contributors && stateData.contributors.length > 0);

    let isContention = false;
    if (stateData?.recordTime && hasContributors) {
      const recordTime = new Date(stateData.recordTime).getTime();
      const compareTime = isAutoUpdate ? Date.now() : (selectedDate?.toDate?.().getTime() || Date.now());
      const lastRefresh = getLastScheduledTime(compareTime);
      if (recordTime < lastRefresh) isContention = true;
    } else {
      isContention = true;
    }

    if (!isContention) {
      if (state === 1) return icons.light;
      if (state === 2) return icons.dark;
    }
    return icons.neutral;
  };

  const renderServerNameRow = (serverData: any, isServer1: boolean) => {
    const serverAbbr = isServer1 ? t("common:server.lightAbbr") : t("common:server.darkAbbr");
    const bgGradient = isServer1
      ? "linear-gradient(90deg, #F9FCFF 0%, #58ACFF 100%)"
      : "linear-gradient(90deg, #FFFFFF 0%, #A468FF 100%)";

    return (
      <div className={`w-full ${isMobile ? "h-12" : "h-[42px]"} flex items-center justify-center rounded-lg border border-white/20 relative bg-white/10`}>
        <div className="flex items-center justify-center w-full px-1">
          <span 
            className={`${isMobile ? "text-[28px]" : "text-lg"} font-bold bg-clip-text text-transparent leading-none`}
            style={{ backgroundImage: bgGradient }}
          >
            {serverData.serverName}
          </span>
          <span className={`${isMobile ? "text-xl" : "text-sm"} font-normal text-white whitespace-nowrap`}>（{serverAbbr}{serverData.serverId % 1000}）</span>
        </div>
      </div>
    );
  };

  const renderArtifactRow = (matching: any, artifacts: any[], mapName: string) => {
    return (
      <div className={`flex items-center justify-center ${isMobile ? "h-12" : "h-9"} gap-1 w-full`}>
        <span className={`${isMobile ? "text-[28px]" : "text-sm"} text-white/80 whitespace-nowrap leading-none`}>
          {t(`maps:${mapName}.description`) as string}
        </span>
        <div className="flex gap-0.5">
          {artifacts.map((artifact) => (
            <img
              key={artifact.id}
              src={getArtifactIcon(matching, artifact)}
              alt={t(`markers/${mapName}:${artifact.markerId}.name`, artifact.marker.name) as string}
              className={`${isMobile ? "w-12 h-12" : "w-9 h-9"} object-contain`}
            />
          ))}
        </div>
      </div>
    );
  };

  const FactionHeader = () => (
    <div className={`${isMobile ? "h-12" : "h-9"} flex items-center shrink-0 ${isMobile ? "rounded-t-lg" : ""}`}>
      <div className="flex-1 flex items-center justify-center">
        <span className={`${isMobile ? "text-[36px]" : "text-base"} font-normal text-white`}>{t("common:race.light")}</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <span className={`${isMobile ? "text-[36px]" : "text-base"} font-normal text-white`}>{t("common:race.dark")}</span>
      </div>
    </div>
  );

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}年${month}月${day}日${hours}:${minutes} GMT+8`;
  };

  const displayTime = selectedDate ? formatDate(selectedDate.toDate()) : formatDate(new Date());

  const cardWidth = isMobile ? "w-[750px]" : "w-[1680px]";

  return (
    <div 
      ref={ref}
      className={`relative flex flex-col overflow-hidden ${cardWidth} h-fit bg-[#4C2C7E] ${isMobile ? "p-[25px]" : "p-5"} gap-2.5`}
    >
      {/* Background Image */}
      <img 
        src={getStaticUrl(isMobile ? "/images/Leaderboards/ExportBackgroundMobile.webp" : "/images/Leaderboards/ExportBackground.webp")} 
        alt="Background" 
        className="absolute inset-x-0 top-0 w-full h-auto object-contain pointer-events-none"
      />

      {/* Top Header */}
      <div 
        className={`relative z-10 flex ${isMobile ? "flex-col gap-10 h-auto pb-2.5" : "items-center gap-6 h-[110px] px-2.5 pb-1"} shrink-0`}
      >
        {isMobile ? (
          <>
            {/* First line: Logos */}
            <div className="flex items-center gap-4 h-[120px]">
              <img 
                src={getStaticUrl("/images/Logo.webp")} 
                alt="Logo" 
                className="h-[120px] w-auto object-contain"
              />
              <img 
                src={getStaticUrl("/images/GroupLogoDark.webp")} 
                alt="Group Logo" 
                className="h-[76px] w-auto object-contain"
              />
            </div>
            {/* Second line: Title and Info */}
            <div className="flex flex-col gap-[20px]">
              <div className="text-[36px] font-bold text-white leading-none">
                实时神器占比
              </div>
              <div className="text-[28px] text-white/80 leading-tight bg-black/20 rounded-lg px-2 h-[48px] flex items-center w-fit">
                {server} | {displayTime}
              </div>
            </div>
          </>
        ) : (
          <>
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
            <div className="flex flex-col justify-center gap-1.5">
              <div className="text-3xl font-bold text-white leading-tight">
                实时神器占比
              </div>
              <div className="text-sm text-white/80 leading-tight bg-black/20 rounded-lg px-2 py-0.5 w-fit">
                {server} | {displayTime}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Legend Area */}
      <div className="relative z-10 w-full h-fit bg-black/40 p-2.5 rounded-2xl">
        <div className="flex flex-row gap-2.5">
          <div className="flex-1 min-h-[56px] bg-white/10 border border-white/20 rounded-lg p-2.5 flex flex-col items-center justify-center gap-2">
            <span className={`${isMobile ? "text-[32px]" : "text-lg"} font-bold text-white/90`}>
              {t(`maps:${MAP_NAMES.ABYSS_A}.description`) as string}
            </span>
            <div className={`flex ${isMobile ? "flex-col gap-0" : "flex-row gap-4 flex-wrap"} justify-center`}>
              {artifactsA.map((artifact) => (
                <div key={artifact.id} className={`flex items-center gap-2 ${isMobile ? "h-12" : ""}`}>
                  <img src={icons.neutral} alt="" className={`${isMobile ? "w-12 h-12" : "w-9 h-9"} object-contain`} />
                  <span className={`${isMobile ? "text-2xl" : "text-sm"} font-normal text-white/90`}>
                    {t(`markers/AbyssA:${artifact.markerId}.name`, artifact.marker.name) as string}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[56px] bg-white/10 border border-white/20 rounded-lg p-2.5 flex flex-col items-center justify-center gap-2">
            <span className={`${isMobile ? "text-[32px]" : "text-lg"} font-bold text-white/90`}>
              {t(`maps:${MAP_NAMES.ABYSS_B}.description`) as string}
            </span>
            <div className={`flex ${isMobile ? "flex-col gap-0" : "flex-row gap-4 flex-wrap"} justify-center`}>
              {artifactsB.map((artifact) => (
                <div key={artifact.id} className={`flex items-center gap-2 ${isMobile ? "h-12" : ""}`}>
                  <img src={icons.neutral} alt="" className={`${isMobile ? "w-12 h-12" : "w-9 h-9"} object-contain`} />
                  <span className={`${isMobile ? "text-2xl" : "text-sm"} font-normal text-white/90`}>
                    {t(`markers/AbyssB:${artifact.markerId}.name`, artifact.marker.name) as string}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Content Area: Grid of 3 columns (Desktop) or 1 column (Mobile) */}
      <div className="relative z-10 w-full h-fit bg-black/40 p-2.5 rounded-2xl">
        <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-3"} gap-2.5`}>
          {isMobile ? (
            <div className="flex flex-col gap-2.5">
              <FactionHeader />
              {matchings.map((matching) => (
                <div key={matching.id} className="bg-white/10 border border-white/20 p-2.5 rounded-lg flex flex-col items-stretch h-fit gap-2.5">
                  {/* First Row: Server Names and VS */}
                  <div className="flex items-center justify-between h-12">
                    <div className="flex-1">
                      {renderServerNameRow(matching.server1, true)}
                    </div>
                    {/* Middle: VS */}
                    <div className="flex items-center px-2">
                      <img src={getStaticUrl("/images/Leaderboards/VS.webp")} alt="VS" className="w-12 h-12 object-contain"/>
                    </div>
                    <div className="flex-1">
                      {renderServerNameRow(matching.server2, false)}
                    </div>
                  </div>

                  {/* Second Row: Maps and Artifacts with Divider */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {renderArtifactRow(matching, artifactsA, MAP_NAMES.ABYSS_A)}
                    </div>
                    {/* Vertical Divider */}
                    <div className="flex flex-col items-center px-2">
                      <div className={`w-px ${isMobile ? "h-12" : "h-5"} bg-white/20`} />
                    </div>
                    <div className="flex-1">
                      {renderArtifactRow(matching, artifactsB, MAP_NAMES.ABYSS_B)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
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
                <div key={matching.id} className="flex flex-col">
                  <div className="bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg flex flex-col items-stretch h-fit">
                    {/* First Row: Server Names and VS */}
                    <div className="flex items-center justify-between h-12">
                      <div className="flex-1">
                        {renderServerNameRow(matching.server1, true)}
                      </div>
                      {/* Middle: VS */}
                      <div className="flex items-center px-2">
                        <img src={getStaticUrl("/images/Leaderboards/VS.webp")} alt="VS" className="w-12 h-12 object-contain"/>
                      </div>
                      <div className="flex-1">
                        {renderServerNameRow(matching.server2, false)}
                      </div>
                    </div>

                    {/* Second Row: Maps and Artifacts with Divider */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {renderArtifactRow(matching, artifactsA, MAP_NAMES.ABYSS_A)}
                      </div>
                      {/* Vertical Divider */}
                      <div className="flex flex-col items-center px-2">
                        <div className="w-px h-5 bg-white/20" />
                      </div>
                      <div className="flex-1">
                        {renderArtifactRow(matching, artifactsB, MAP_NAMES.ABYSS_B)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      {isMobile ? (
        <div className="relative z-10 mt-2.5 flex flex-col items-center gap-2.5 text-white text-[28px]">
          <span>神器交流群：1073046733</span>
          <div className="flex items-center gap-5">
            <span>https://tc-imba.com</span>
            <div className="w-px h-[28px] bg-white" />
            <span>© 2025-2026 星狐攻略组</span>
          </div>
        </div>
      ) : (
        <div className="relative z-10 mt-2.5 flex justify-center items-center gap-5 text-white text-sm">
          <span>https://tc-imba.com</span>
          <div className="w-px h-4 bg-white" />
          <span>© 2025-2026 星狐攻略组</span>
          <div className="w-px h-4 bg-white" />
          <span>神器交流群：1073046733</span>
        </div>
      )}
    </div>
  );
});

export default ArtifactRatioShareCard;
