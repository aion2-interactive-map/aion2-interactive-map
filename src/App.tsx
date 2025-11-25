// src/App.tsx
import React, { useRef, useState } from "react";

import TopNavbar from "./components/TopNavbar";
import GameMapView from "./components/GameMapView";

import LeftSidebar from "@/components/SideBar/LeftSidebar";
import RightSidebar from "@/components/SideBar/RightSidebar";


import {Spinner} from "@heroui/react";

import { useGameData } from "@/context/GameDataContext.tsx";
import { useMarkers } from "@/context/MarkersContext.tsx";

import type {MapRef} from "./types/game";
import DismissableAlert from "./components/DismissableAlert.tsx";
import {useTranslation} from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {useGameMap} from "@/context/GameMapContext.tsx";
import DismissibleBanner from "@/components/DismissibleBanner.tsx";
import {getStaticUrl} from "@/utils/url.ts";

const App: React.FC = () => {

  const { t } = useTranslation();
  const { loading, selectedMap, types } = useGameMap();
  const { visibleSubtypes, allSubtypes } = useGameData();
  const { markers, completedSet, toggleMarkerCompleted, showLabels } = useMarkers();

  const mapRef = useRef<MapRef>(null);

  // const handleMapChange = (mapId: string) => {
  //   setSelectedMapId(mapId);
  //   const map = mapRef.current;
  //   const meta = maps.find((m) => m.name === mapId);
  //   if (map && meta) {
  //     const height = meta.tileWidth * meta?.tilesCountY;
  //     const width = meta.tileWidth * meta?.tilesCountX;
  //       map.setView(
  //       [height / 2, width / 2],
  //       map.getZoom(),
  //     );
  //   }
  // };

  // const [isIntroOpen, setIsIntroOpen] = useState<boolean>(true);
  const [isAlertOpen, setIsAlertOpen] = useState(true);

  if (loading && !selectedMap) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Spinner label="Loading maps..." />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      <TopNavbar
        // onOpenIntroModal={() => setIsIntroOpen(true)}
      />

      {/*<IntroModal
        isOpen={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
      />*/}


      {isAlertOpen && (
        <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-[9999] h-[52px]">
          <DismissableAlert
            color="warning"
            onClose={() => setIsAlertOpen(false)}
          >
            <div className="text-xs prose prose-xs max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{t("introModal.alert")}</ReactMarkdown>
            </div>
            </DismissableAlert>
        </div>
      )}

      { import.meta.env.VITE_REGION === "CHINA" && <>
        <DismissibleBanner
          imageUrl={getStaticUrl("images/qiyou.webp")}
          width={800}
          height={120}
          position="bottom-center"
        />

        <DismissibleBanner
          imageUrl={getStaticUrl("images/PangXieMiddle.webp")}
          width={400}
          height={420}
          position="middle-center"
          href="https://www.pxb7.com/buy/175178554941486/1?channelId=184939419369543&activityCode=yhzt2sl"
        />
      </>}

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />

        <RightSidebar />

        {/*<MapSidebar
          maps={maps}
          regions={regions}
          types={types}
          selectedMapId={selectedMapId}
          onMapChange={handleMapChange}
          loadingMarkers={loadingMarkers}
          subtypeCounts={subtypeCounts}
          completedCounts={completedCounts}
          visibleSubtypes={visibleSubtypes || new Set()}
          onToggleSubtype={handleToggleSubtype}
          visibleRegions={visibleRegions || new Set()}
          onToggleRegion={handleToggleRegion}
          showLabels={showLabels}
          onToggleShowLabels={setShowLabels}
          onShowAllSubtypes={handleShowAllSubtypes}
          onHideAllSubtypes={handleHideAllSubtypes}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
          onClearMarkerCompleted={clearMarkerCompleted}
        />*/}

        <GameMapView
          selectedMap={selectedMap}
          markers={markers}
          mapRef={mapRef}
          visibleSubtypes={visibleSubtypes || new Set()}
          types={types}
          subtypes={allSubtypes}
          showLabels={showLabels}
          completedSet={completedSet}
          toggleMarkerCompleted={toggleMarkerCompleted}
        />

      </div>
    </div>
  );
};

export default App;
