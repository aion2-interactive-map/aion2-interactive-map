import {createFileRoute} from "@tanstack/react-router";
import React, {useCallback, useRef, useState} from "react";
import GameMapView from "@/components/GameMapView";
import LeftSidebar from "@/components/SideBar/LeftSidebar";
import RightSidebar from "@/components/SideBar/RightSidebar";
import {Spinner} from "@heroui/react";
import type {MapRef} from "@/types/game";
import DismissableAlert from "@/components/DismissableAlert.tsx";
import {useTranslation} from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {GameMapProvider, useGameMap} from "@/context/GameMapContext.tsx";
import DismissibleBanner from "@/components/DismissibleBanner.tsx";
import {getStaticUrl} from "@/utils/url.ts";
import {MarkersProvider, useMarkers} from "@/context/MarkersContext.tsx";
import {GameDataProvider} from "@/context/GameDataContext.tsx";
import {UserMarkersProvider} from "@/context/UserMarkersContext.tsx";
import {ThemeMapBridge} from "@/context/ThemeMapBridge.tsx";


const HomePage: React.FC = () => {

  const {t} = useTranslation();
  const {loading, selectedMap} = useGameMap();

  const mapRef = useRef<MapRef>(null);
  const {markersById} = useMarkers();

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
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{x: number, y: number} | null>(null);

  const handleSelectMarker = useCallback(
    (markerId: string | null) => {
      if (!markerId) {
        setSelectedMarkerId(null);
        return;
      }
      const m = markersById[markerId];
      if (!m) return;
      setSelectedMarkerId(markerId);
      setSelectedPosition(null);
    }, [markersById],
  );

  const handleSelectPosition = useCallback((x: number, y : number)=> {
    setSelectedPosition({x, y});
    setSelectedMarkerId(null);
    }, []
  )

  if (loading && !selectedMap) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Spinner label="Loading maps..."/>
      </div>
    );
  }

  return (
    <>
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

      {import.meta.env.VITE_REGION === "CHINA" && <>
        <DismissibleBanner
          imageUrl={getStaticUrl("images/PangXieMiddle.webp")}
          width={400}
          height={420}
          position="middle-center"
          href="https://www.pxb7.com/buy/175178554941486/1?channelId=184939419369543&activityCode=yhzt2sl"
        />
      </>}

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar onSelectMarker={handleSelectMarker} onSelectPosition={handleSelectPosition}/>

        <GameMapView
          mapRef={mapRef}
          onSelectMarker={handleSelectMarker}
          selectedMarkerId={selectedMarkerId}
          selectedPosition={selectedPosition}
        />

        <RightSidebar/>

      </div>
    </>

  );
};

const HomePageWrapper: React.FC = () => {
  return (
    <GameMapProvider>
      <ThemeMapBridge />
      <MarkersProvider>
        <UserMarkersProvider>
          <GameDataProvider>
            <HomePage />
          </GameDataProvider>
        </UserMarkersProvider>
      </MarkersProvider>
    </GameMapProvider>
  );
};



export const Route = createFileRoute("/")({
  component: HomePageWrapper,
});
