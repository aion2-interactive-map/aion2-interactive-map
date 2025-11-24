// src/components/GameMapView.tsx
import React, {useCallback, useState} from "react";
import { MapContainer, useMapEvents } from "react-leaflet";
import L from "leaflet";

import GameMarker from "./GameMarker";

import type {
  GameMapMeta,
  MapRef,
  MarkerInstance,
  MarkerTypeCategory, MarkerTypeSubtype,
} from "../types/game";
import GameMapTiles from "./GameMapTiles.ts";


type CursorTrackerProps = {
  onUpdate: (x: number, y: number) => void;
};

type ContextMenuState = {
  x: number;      // screen coords (relative to map container)
  y: number;
  mapX: number;   // map coords (your [x, y] system)
  mapY: number;
};

const CursorTracker: React.FC<CursorTrackerProps> = ({ onUpdate }) => {
  useMapEvents({
    mousemove(e) {
      const { lat, lng } = e.latlng;
      // CRS.Simple: lat = y, lng = x
      onUpdate(lng, lat);
    },
  });

  return null;
};

type Props = {
  selectedMap?: GameMapMeta;
  markers: MarkerInstance[];
  mapRef: React.RefObject<MapRef>;
  visibleSubtypes: Set<string>;
  types: MarkerTypeCategory[];
  subtypes: Map<string, MarkerTypeSubtype>;
  showLabels: boolean;
  completedSet: Set<string>;
  toggleMarkerCompleted: (marker: MarkerInstance) => void;
};

const MapContextMenuHandler: React.FC<{
  onOpenMenu: (state: ContextMenuState) => void;
  onCloseMenu: () => void;
}> = ({ onOpenMenu, onCloseMenu }) => {
  const map = useMapEvents({
    contextmenu(e) {
      // Right-click on map
      e.originalEvent.preventDefault();

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

const GameMapView: React.FC<Props> = ({
                                        selectedMap,
                                        markers,
                                        mapRef,
                                        visibleSubtypes,
                                        types,
                                        subtypes,
                                        showLabels,
                                        completedSet,
                                        toggleMarkerCompleted,
                                      }) => {
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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
    <div className="flex-1 relative" onClick={() => setContextMenu(null)}>
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
            setCursorPos({ x, y });
          }}
        />

        {/* Handle right-click events */}
        <MapContextMenuHandler
          onOpenMenu={(state) => setContextMenu(state)}
          onCloseMenu={() => setContextMenu(null)}
        />

        <GameMapTiles selectedMap={selectedMap}/>

        {markers
          .filter((m) =>
            visibleSubtypes.has(m.subtype),
          )
          .map((m) => (
            <GameMarker
              key={m.id}
              map={selectedMap}
              marker={m}
              types={types}
              subtypes={subtypes}
              showLabel={showLabels}
              completedSet={completedSet}
              toggleMarkerCompleted={toggleMarkerCompleted}
            />
          ))}
      </MapContainer>

      {cursorPos && (
        <div className="absolute bottom-3 left-3 z-[1000] rounded bg-black/80 text-white text-sm px-3 py-1.5 pointer-events-none shadow-lg backdrop-blur-sm">
          x: {cursorPos.x.toFixed(0)}, y: {cursorPos.y.toFixed(0)}
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
    </div>
  );
};

export default GameMapView;
