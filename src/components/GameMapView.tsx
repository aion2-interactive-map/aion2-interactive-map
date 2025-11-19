// src/components/GameMapView.tsx
import React, {useCallback, useState} from "react";
import { MapContainer, ImageOverlay, useMapEvents } from "react-leaflet";
import L from "leaflet";

import GameMarker from "./GameMarker";

import type {
  GameMapMeta,
  MapRef,
  MarkerInstance,
  MarkerTypeCategory,
} from "../types/game";


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
  selectedMap: GameMapMeta | null;
  markers: MarkerInstance[];
  mapRef: React.RefObject<MapRef>;
  visibleSubtypes: Set<string>;
  types: MarkerTypeCategory[];
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

  const center: [number, number] = [
    height / 2,
    width / 2,
  ];

  const base = import.meta.env.BASE_URL ?? "/";

  const tileOverlays = [];
  for (let row = 0; row < selectedMap.tilesCountY; row++) {
    for (let col = 0; col < selectedMap.tilesCountX; col++) {
      const y0 = (selectedMap.tilesCountY - row - 1) * selectedMap.tileHeight;
      const x0 = col * selectedMap.tileWidth;
      const y1 = (selectedMap.tilesCountY - row) * selectedMap.tileHeight;
      const x1 = (col + 1) * selectedMap.tileWidth;
      const tileBounds: L.LatLngBoundsExpression = [
        [y0, x0],
        [y1, x1],
      ];
      const rowStr = row.toString().padStart(2, "0");
      const colStr = col.toString().padStart(2, "0");
      const relPath = `UI/Map/WorldMap/${selectedMap.id}/Res/${selectedMap.id}_${colStr}_${rowStr}.png`;
      const url = base + relPath.replace(/^\//, "");
      tileOverlays.push(
        <ImageOverlay
          key={`tile-${row}-${col}`}
          url={url}
          bounds={tileBounds}
        />,
      );

    }
  }





  return (
    <div className="flex-1 relative" onClick={() => setContextMenu(null)}>
      <MapContainer
        key={selectedMap.id}
        center={center}
        zoom={0}
        minZoom={-3}
        maxZoom={2}
        zoomAnimation={false}
        zoomSnap={0.2}
        zoomDelta={0.2}
        crs={L.CRS.Simple}
        className="w-full h-full"
        attributionControl={false}
        ref={mapRef as any}
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

        {tileOverlays}

        {markers
          .filter((m) =>
            visibleSubtypes.has(
              `${m.categoryId}::${m.subtypeId}`,
            ),
          )
          .map((m) => (
            <GameMarker
              key={`${m.categoryId}-${m.subtypeId}-${m.id}`}
              mapId={selectedMap.id}
              marker={m}
              types={types}
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
