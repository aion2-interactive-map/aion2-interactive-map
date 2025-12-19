// src/components/GameMapView.tsx
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {MapContainer, Marker, Popup, useMap, useMapEvents} from "react-leaflet";
import L from "leaflet";

import GameMarker from "./GameMarker";

import type {MapRef, RegionInstance} from "../types/game";
import GameMapTiles from "./GameMapTiles.tsx";
import GameMapBorders from "@/components/GameMapBorders.tsx";
import {useTranslation} from "react-i18next";
import {getStaticUrl} from "@/utils/url.ts";
import DismissibleBanner from "@/components/DismissibleBanner.tsx";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {useMarkers} from "@/context/MarkersContext.tsx";
import {useGameData} from "@/context/GameDataContext.tsx";
import {useUserMarkers} from "@/context/UserMarkersContext.tsx";
import UserMarker from "@/components/UserMarker.tsx";
import MarkerPopupEdit from "@/components/MarkerPopupEdit.tsx";
import MarkerPopupContent from "@/components/MarkerPopupContent.tsx";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faMapPin} from "@fortawesome/free-solid-svg-icons";
import {renderToString} from "react-dom/server";


type CursorTrackerProps = {
  onUpdate: (x: number, y: number) => void;
};

type ContextMenuState = {
  x: number;      // screen coords (relative to map container)
  y: number;
  mapX: number;   // map coords (your [x, y] system)
  mapY: number;
};

const CursorTracker: React.FC<CursorTrackerProps> = ({onUpdate}) => {
  useMapEvents({
    mousemove(e) {
      const {lat, lng} = e.latlng;
      // CRS.Simple: lat = y, lng = x
      onUpdate(lng, lat);
    },
  });

  return null;
};

type Props = {
  mapRef: React.RefObject<MapRef>;
  onSelectMarker: (markerId: string | null) => void;
  selectedMarkerId: string | null;
  selectedPosition: { x: number, y: number } | null;
};

const MapContextMenuHandler: React.FC<{
  onOpenMenu: (state: ContextMenuState) => void;
  onCloseMenu: () => void;
}> = ({onOpenMenu, onCloseMenu}) => {
  const {setPickMode, pickMode} = useUserMarkers();

  const map = useMapEvents({
    contextmenu(e) {
      // Right-click on map
      e.originalEvent.preventDefault();
      if (pickMode) {
        setPickMode(false);
        return;
      }

      // Leaflet CRS.Simple: lat = y, lng = x
      const mapX = e.latlng.lng;
      const mapY = e.latlng.lat;

      const containerPoint = map.latLngToContainerPoint(e.latlng);

      onOpenMenu({
        x: containerPoint.x,
        y: containerPoint.y,
        mapX,
        mapY,
      });
    },
    click() {
      // Left-click anywhere on map closes menu
      onCloseMenu();
    },
    movestart() {
      onCloseMenu();
    },
    zoomstart() {
      onCloseMenu();
    },
  });
  return null;
};

const MapCursorController: React.FC = () => {
  const map = useMap();
  const {pickMode} = useUserMarkers();

  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = pickMode ? `url(${getStaticUrl("images/CursorAdd.png")}) 22 63, crosshair` : "grab";
    // console.log(pickMode, container);
  }, [map, pickMode]);

  return null;
};

// 🆕 Left-click picker for pickMode
const MapClickPicker: React.FC<{
  createMarker: (mapX: number, mapY: number) => void;
}> = ({createMarker}) => {
  const {pickMode} = useUserMarkers();

  useMapEvents({
    click(e) {
      if (!pickMode) return;

      const mapX = e.latlng.lng;
      const mapY = e.latlng.lat;

      createMarker(mapX, mapY);
    },
  });

  return null;
};

function createFocusIcon(): L.DivIcon {
  const html = renderToString(
    <div
      style={{
        color: "#df1414",
        fontSize: "32px",
        transform: "translate(-50%, -100%)",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
      }}
    >
      <FontAwesomeIcon icon={faMapPin} />
    </div>
  );

  return L.divIcon({
    html,
    className: "", // IMPORTANT: avoid Leaflet default styles
    iconSize: [24, 24],
    iconAnchor: [12, 24], // bottom-center
  });
}

function MarkerFocusController({selectedMarkerId, selectedPosition}: {
  selectedMarkerId: string | null | undefined,
  selectedPosition: { x: number, y: number } | null | undefined
}) {
  const map = useMap();
  const {markersById} = useMarkers();

  useEffect(() => {
    if (!map) return;
    if (!selectedMarkerId) return;

    const marker = markersById[selectedMarkerId];
    if (!marker) return;

    // Leaflet uses [lat, lng]; assuming y=lat, x=lng:
    const latLng: [number, number] = [marker.y, marker.x];

    map.flyTo(latLng, map.getZoom(), {duration: 0.5});
  }, [map, selectedMarkerId, markersById]);

  useEffect(() => {
    console.log(selectedPosition);
    if (!map) return;
    if (!selectedPosition) return;
    const latLng: [number, number] = [selectedPosition.y, selectedPosition.x];
    map.flyTo(latLng, map.getZoom(), {duration: 0.5});
  }, [map, selectedPosition]);

  if (selectedPosition) {
    return (
      <Marker
        position={new L.LatLng(selectedPosition.y, selectedPosition.x)}
        icon={createFocusIcon()}
        interactive={false}
      >
      </Marker>
    )
  }

  return null;
}

function SelectedMarkerPopup({onSelectMarker, selectedMarkerId}: {
  onSelectMarker: (markerId: string | null) => void,
  selectedMarkerId: string | null | undefined
}) {
  const {markersById} = useMarkers();
  useMapEvents({
    click() {
      onSelectMarker(null);
    },
  });

  if (!selectedMarkerId) return null;

  const marker = markersById[selectedMarkerId];
  if (!marker) return null;

  return (
    <Popup
      position={[marker.y + 10, marker.x]}
      maxWidth={360} minWidth={360}
      autoPan={true} closeButton={false}
    >
      <MarkerPopupContent
        marker={marker}
        onSelectMarker={onSelectMarker}
      />
    </Popup>
  );
}

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
        <MapContextMenuHandler
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

        {hideUserMarkers ? userMarkers.filter(marker => marker.type !== "feedback").map((m) => (
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
          imageUrl={getStaticUrl("images/QiyouMiddle.webp")}
          width={800}
          height={120}
          position="bottom-center"
          nextBannerImageUrl={getStaticUrl("images/QiyouRight.webp")}
          nextBannerPosition="bottom-right"
          nextBannerDelay={0}
          nextBannerHeight={80}
          nextBannerWidth={180}
          href="https://www.qiyou.cn"
        />
      }
    </div>
  );
};

export default GameMapView;
