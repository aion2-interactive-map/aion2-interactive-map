// src/components/GameMapView.tsx
import React, {useCallback, useMemo, useState} from "react";
import {MapContainer} from "react-leaflet";
import L from "leaflet";

import GameMarker from "./GameMarker";

import type {MapRef, RegionInstance} from "../../types/game";
import GameMapTiles from "./GameMapTiles.tsx";
import GameMapBorders from "./GameMapBorders.tsx";
import {useTranslation} from "react-i18next";
import {getStaticUrl} from "@/utils/url.ts";
import DismissibleBanner from "./DismissibleBanner.tsx";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {useMarkers} from "@/context/MarkersContext.tsx";
import {useGameData} from "@/context/GameDataContext.tsx";
import {useUserMarkers} from "@/context/UserMarkersContext.tsx";
import UserMarker from "./UserMarker.tsx";
import MarkerPopupEdit from "./MarkerPopupEdit.tsx";
import CursorTracker from "./CursorTracker";
import MapCursorController from "./MapCursorController";
import MapClickPicker from "./MapClickPicker";
import MarkerFocusController from "./MarkerFocusController";
import SelectedMarkerPopup from "./SelectedMarkerPopup";
import MapContextMenu, { type ContextMenuState } from "./MapContextMenu";

type Props = {
  mapRef: React.RefObject<MapRef>;
  onSelectMarker: (markerId: string | null) => void;
  selectedMarkerId: string | null;
  selectedPosition: { x: number, y: number } | null;
};

const GameMapView: React.FC<Props> = ({
                                        mapRef,
                                        onSelectMarker,
                                        selectedMarkerId,
                                        selectedPosition,
                                      }) => {
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<RegionInstance | undefined>(undefined);

  const {selectedMap} = useGameMap();
  const {visibleSubtypes} = useGameData();
  const {markers} = useMarkers();
  const {pickMode, createMarker, userMarkers, hideUserMarkers} = useUserMarkers();


  const regionNs = `regions/${selectedMap?.name}`;
  const {t} = useTranslation([regionNs]);
  const regionLabel = hoveredRegion ? t(`${regionNs}:${hoveredRegion.name}.name`) : "";


  const handleCopyPosition = useCallback((x: number, y: number) => {
    const text = `${Math.round(x)}, ${Math.round(y)}`;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .catch((err) => console.error("Clipboard error", err));
    } else {
      // Fallback: just log to console
      console.log("Copied position:", text);
    }
  }, []);

  const renderedPopup = useMemo(() => {
    if (selectedMarkerId) {
      return <SelectedMarkerPopup selectedMarkerId={selectedMarkerId} onSelectMarker={onSelectMarker}/>;
    }
    return null;
  }, [selectedMarkerId, onSelectMarker]);


  if (!selectedMap) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-default-500">
        No map selected.
      </div>
    );
  }


  // Leaflet simple CRS uses [y, x] for bounds and center
  const width = selectedMap.tileWidth * selectedMap.tilesCountX;
  const height = selectedMap.tileHeight * selectedMap.tilesCountY;

  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [height, width],
  ];

  const center: [number, number] = [
    height / 2,
    width / 2,
  ];

  // console.log(bounds, center)


  return (
    <div
      className="flex-1 relative"
      onClick={() => setContextMenu(null)}
      style={{
        cursor: pickMode ? "crosshair" : "default",
      }}
    >
      <MapContainer
        key={selectedMap.id}
        center={center}
        bounds={bounds}
        zoom={0}
        minZoom={-3}
        maxZoom={2}
        // zoomAnimation={false}
        // fadeAnimation={false}
        zoomSnap={0.25}
        zoomDelta={0.25}
        crs={L.CRS.Simple}
        className="w-full h-full"
        attributionControl={false}
        ref={mapRef}
      >
        <CursorTracker
          onUpdate={(x, y) => {
            setCursorPos({x, y});
          }}
        />
        <MapCursorController/>
        <MapClickPicker createMarker={createMarker}/>

        {/* Handle right-click events */}
        <MapContextMenu
          onOpenMenu={(state) => setContextMenu(state)}
          onCloseMenu={() => setContextMenu(null)}
        />

        <GameMapTiles selectedMap={selectedMap}/>
        <GameMapBorders hoveredRegion={hoveredRegion} setHoveredRegion={setHoveredRegion}/>

        {markers
          .filter((m) =>
            selectedMarkerId === m.id || visibleSubtypes?.has(m.subtype),
          )
          .map((m) => (
            <GameMarker key={m.id} marker={m} onSelectMarker={onSelectMarker}/>
          ))}

        {!hideUserMarkers ? userMarkers.filter(marker => marker.type !== "feedback").map((m) => (
          <UserMarker key={m.id} marker={m}/>
        )) : null}

        <MarkerFocusController selectedMarkerId={selectedMarkerId} selectedPosition={selectedPosition}/>
        {renderedPopup}

      </MapContainer>

      {/* ICP record (always visible, above cursor info) */}
      <div
        className="
          absolute bottom-15 left-3 z-[1000]
          font-medium
          text-[15px]
          leading-[15px]
          text-white/80
          text-left
          not-italic
          normal-case
          drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]
        "
      >
        沪ICP备2025152827号-1
      </div>

      {cursorPos && (
        <div
          className="absolute bottom-3 left-3 z-[1000] rounded bg-black/80 text-white text-sm px-3 py-1.5 pointer-events-none shadow-lg backdrop-blur-sm">
          x: {cursorPos.x.toFixed(0)}, y: {cursorPos.y.toFixed(0)} {regionLabel}
        </div>
      )}

      {/* Context menu overlay */}
      {contextMenu && (
        <div
          className="absolute z-[5000]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="min-w-[190px] rounded-md border border-default-200 bg-content1 shadow-lg text-sm py-1">
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left hover:bg-default-100"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyPosition(contextMenu.mapX, contextMenu.mapY);
                setContextMenu(null);
              }}
            >
              Copy position ({Math.round(contextMenu.mapX)},{" "}
              {Math.round(contextMenu.mapY)})
            </button>
          </div>
        </div>
      )}

      <MarkerPopupEdit/>


      {import.meta.env.VITE_REGION === "CHINA" &&
        <DismissibleBanner
          imageUrl={getStaticUrl("images/PangXieMiddle.webp")}
          width={800}
          height={150}
          position="bottom-center"
          href="https://m1.pxb7.com/pages-active/assemble/index?activityId=199578373226565"
        />
      }
    </div>
  );
};

export default GameMapView;
