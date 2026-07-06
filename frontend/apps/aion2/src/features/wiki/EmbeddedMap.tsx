import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polygon, Tooltip } from "react-leaflet";
import { useTranslation } from "react-i18next";

import { useGameMap } from "@/context/GameMapContext";
import { aionAssets } from "@/features/map/aionAssets";
// Importing the map-engine barrel also registers the smooth wheel-zoom handler.
import {
  GameMapTiles,
  createPinIcon,
  dataToLatLng,
  dataToLatLngTuple,
} from "@gamemap/map-engine";
import { loadGameData } from "@/lib/data";
import type { WikiPoi } from "@/types/wiki";

export type EmbeddedPoi = WikiPoi & { label?: string };

type EmbeddedRegion = {
  id: string;
  name: string;
  type: string;
  borders: number[][][];
};

type RegionsDoc = {
  regions: EmbeddedRegion[];
};

type Props = {
  mapName: string;
  pois: EmbeddedPoi[];
  highlightRegionIds?: string[];
  className?: string;
};

export default function EmbeddedMap({
  mapName,
  pois,
  highlightRegionIds,
  className,
}: Props) {
  const { t } = useTranslation(["wiki"]);
  const { maps } = useGameMap();
  const map = maps.find((m) => m.name === mapName);
  const highlightRegionKey = useMemo(
    () => (highlightRegionIds ?? []).join(","),
    [highlightRegionIds],
  );
  const [highlightRegions, setHighlightRegions] = useState<EmbeddedRegion[]>(
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const ids = highlightRegionKey.split(",").filter(Boolean);
    if (!ids.length) {
      setHighlightRegions([]);
      return;
    }

    const wanted = new Set(ids);
    loadGameData<RegionsDoc>(`data/regions/${mapName}.json`)
      .then((doc) => {
        if (!cancelled) {
          setHighlightRegions(
            doc.regions.filter((region) => wanted.has(region.id)),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setHighlightRegions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [mapName, highlightRegionKey]);

  const highlightRegionRenderKey = highlightRegions
    .map((region) => region.id)
    .join(",");

  const { bounds, fit } = useMemo(() => {
    if (!map) return { bounds: null, fit: null };
    const width = map.tileWidth * map.tilesCountX;
    const height = map.tileHeight * map.tilesCountY;
    const full: L.LatLngBoundsExpression = [
      [0, 0],
      [height, width],
    ];
    const poiPoints = pois.map((p) => dataToLatLng(map, p.x, p.y));
    const regionPoints = highlightRegions.flatMap((region) =>
      region.borders.flatMap((polygon) =>
        polygon.map(([x, y]) => dataToLatLng(map, x, y)),
      ),
    );
    const points = [...poiPoints, ...regionPoints];
    if (!points.length) return { bounds: full, fit: full };

    return { bounds: full, fit: L.latLngBounds(points).pad(0.35) };
  }, [map, pois, highlightRegions]);

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
        key={`${map.id}:${pois.length}:${highlightRegionKey}:${highlightRegionRenderKey}`}
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
        <GameMapTiles selectedMap={map} assets={aionAssets} />
        {highlightRegions.map((region) =>
          region.borders.map((polygon, idx) => (
            <Polygon
              key={`${region.id}-${idx}`}
              positions={polygon.map(([x, y]) =>
                dataToLatLngTuple(map, x, y),
              )}
              pathOptions={{
                color: "#2E97FF",
                weight: 1.5,
                dashArray: "4 4",
                fillOpacity: 0.15,
              }}
              interactive={false}
            />
          )),
        )}
        {pois.map((p, i) => (
          <Marker
            key={i}
            position={dataToLatLng(map, p.x, p.y)}
            icon={createPinIcon("", 1, false, { variant: "pin" })}
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
        {t("wiki:common.open")}
      </a>
    </div>
  );
}
