import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Tooltip } from "react-leaflet";

import { useGameMap } from "@/context/GameMapContext";
import GameMapTiles from "@/features/map/canvas/GameMapTiles";
import { createPinIcon } from "@/features/map/canvas/markerIcons";
import { dataToLatLng } from "@/lib/coords";
import "@/lib/leaflet-smooth-wheel-zoom";
import type { WikiPoi } from "@/types/wiki";

export type EmbeddedPoi = WikiPoi & { label?: string };

type Props = {
  mapName: string;
  pois: EmbeddedPoi[];
  className?: string;
};

export default function EmbeddedMap({ mapName, pois, className }: Props) {
  const { maps } = useGameMap();
  const map = maps.find((m) => m.name === mapName);

  const { bounds, fit } = useMemo(() => {
    if (!map) return { bounds: null, fit: null };
    const width = map.tileWidth * map.tilesCountX;
    const height = map.tileHeight * map.tilesCountY;
    const full: L.LatLngBoundsExpression = [
      [0, 0],
      [height, width],
    ];
    if (!pois.length) return { bounds: full, fit: full };

    const pts = pois.map((p) => dataToLatLng(map, p.x, p.y));
    return { bounds: full, fit: L.latLngBounds(pts).pad(0.35) };
  }, [map, pois]);

  if (!map || !bounds) return null;

  const firstPoi = pois[0];
  const href = `/?map=${encodeURIComponent(map.name)}${
    firstPoi
      ? `&pos=${Math.round(firstPoi.x)},${Math.round(firstPoi.y)}`
      : ""
  }`;

  return (
    <div
      className={`relative isolate overflow-hidden rounded-lg border border-border ${className ?? "h-72"}`}
      data-testid="embedded-map"
    >
      <MapContainer
        key={`${map.id}:${pois.length}`}
        bounds={fit ?? bounds}
        maxBounds={bounds}
        crs={L.CRS.Simple}
        minZoom={-3}
        maxZoom={2}
        zoomSnap={0}
        zoomDelta={0.25}
        scrollWheelZoom={false}
        smoothWheelZoom={true}
        smoothSensitivity={4}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <GameMapTiles selectedMap={map} />
        {pois.map((p, i) => (
          <Marker
            key={i}
            position={dataToLatLng(map, p.x, p.y)}
            icon={createPinIcon("", 1, false, "pin", "#2E97FF", false)}
          >
            {p.label && <Tooltip direction="top">{p.label}</Tooltip>}
          </Marker>
        ))}
      </MapContainer>
      <a
        href={href}
        className="absolute top-2 right-2 z-[500] rounded bg-background/80 px-2 py-1 text-xs hover:bg-background"
        data-testid="embed-open-full"
      >
        Open
      </a>
    </div>
  );
}
