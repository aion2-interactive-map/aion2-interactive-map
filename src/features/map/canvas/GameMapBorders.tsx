import React, { memo, useMemo } from "react";
import { LayerGroup, Polyline, Polygon } from "react-leaflet";
import { useMarkers } from "@/context/MarkersContext";
import type { RegionInstance } from "@/types/game";
import { useGameData } from "@/context/GameDataContext";
import { useGameMap } from "@/context/GameMapContext";

type Props = {
  hoveredRegion?: RegionInstance;
  setHoveredRegion: (hoveredRegion?: RegionInstance) => void;
};

// DATA (image-space) [x, y] → Leaflet [lat, lng] with the single vertical flip
// (`lat = mapHeight - y`). `mapHeight` is the full tile-grid pixel height.
const xyToLatLng =
  (mapHeight: number) =>
  ([x, y]: number[]): [number, number] => [mapHeight - y, x];

function edgeKey(a: number[], b: number[]) {
  const A = `${a}`;
  const B = `${b}`;
  return A < B ? `${A}|${B}` : `${B}|${A}`;
}

/**
 * Base region fills — independent of hover state, so moving the cursor (which
 * changes `hoveredRegion`) never repaints these. Memoized on the data only.
 * The hover highlight is drawn as a separate thin overlay (HoverHighlight)
 * for ONLY the hovered region, so a region crossing repaints a few polygons
 * instead of the whole overlay (the cause of the map "flicker").
 */
const BaseRegions = memo(function BaseRegions({
  regions,
  visibleRegions,
  setHoveredRegion,
  mapHeight,
}: {
  regions: RegionInstance[];
  visibleRegions?: Set<string>;
  setHoveredRegion: (region?: RegionInstance) => void;
  mapHeight: number;
}) {
  const toLatLng = xyToLatLng(mapHeight);
  return (
    <LayerGroup>
      {regions
        .filter((region) => !visibleRegions || visibleRegions.has(region.name))
        .map((region) =>
          region.borders.map((polygon, idx) => (
            <Polygon
              key={`${region.name}-base-${idx}`}
              positions={polygon.map(toLatLng)}
              pathOptions={{
                color: "var(--primary)",
                stroke: false,
                fillOpacity: 0,
              }}
              eventHandlers={{
                mouseover: () => setHoveredRegion(region),
                mouseout: () => setHoveredRegion(undefined),
              }}
            />
          )),
        )}
    </LayerGroup>
  );
});

/** Hovered-region fill highlight, drawn on top, non-interactive. */
const HoverHighlight = memo(function HoverHighlight({
  region,
  mapHeight,
}: {
  region?: RegionInstance;
  mapHeight: number;
}) {
  if (!region) return null;
  const toLatLng = xyToLatLng(mapHeight);
  return (
    <LayerGroup>
      {region.borders.map((polygon, idx) => (
        <Polygon
          key={`${region.name}-hl-${idx}`}
          positions={polygon.map(toLatLng)}
          pathOptions={{
            color: "var(--primary)",
            stroke: false,
            fillOpacity: 0,
          }}
          interactive={false}
        />
      ))}
    </LayerGroup>
  );
});

/** De-duplicated border polylines (drawn only when showBorders is on). */
const BorderSegments = memo(function BorderSegments({
  segments,
  hoveredRegionName,
}: {
  segments: { key: string; positions: [number, number][]; regions: string[] }[];
  hoveredRegionName?: string;
}) {
  return (
    <LayerGroup>
      {segments.map((seg) => {
        const hovered =
          !!hoveredRegionName && seg.regions.includes(hoveredRegionName);
        return (
          <Polyline
            key={seg.key}
            positions={seg.positions}
            pathOptions={
              hovered
                ? {
                    color: "var(--primary)",
                    weight: 3,
                    opacity: 1,
                    dashArray: "1 0",
                  }
                : {
                    color: "var(--primary)",
                    weight: 3,
                    opacity: 0.5,
                    dashArray: "8 5",
                  }
            }
            interactive={false}
          />
        );
      })}
    </LayerGroup>
  );
});

const GameMapBorders: React.FC<Props> = ({
  hoveredRegion,
  setHoveredRegion,
}) => {
  const { regions } = useMarkers();
  const { showBorders, visibleRegions } = useGameData();
  const { selectedMap } = useGameMap();
  const mapHeight = selectedMap
    ? selectedMap.tileHeight * selectedMap.tilesCountY
    : 0;

  // De-duplicate shared edges so a border drawn between two regions renders once.
  const segments = useMemo(() => {
    const toLatLng = xyToLatLng(mapHeight);
    const edgeMap = new Map<
      string,
      { positions: [number, number][]; regions: string[] }
    >();

    regions.forEach((region) => {
      region.borders.forEach((poly) => {
        for (let i = 0; i < poly.length - 1; i++) {
          const a = poly[i];
          const b = poly[i + 1];
          const key = edgeKey(a, b);
          const pos: [number, number][] = [toLatLng(a), toLatLng(b)];

          if (!edgeMap.has(key)) {
            edgeMap.set(key, { positions: pos, regions: [region.name] });
          } else {
            edgeMap.get(key)!.regions.push(region.name);
          }
        }
      });
    });

    return [...edgeMap.entries()].map(([key, val]) => ({
      key,
      positions: val.positions,
      regions: val.regions,
    }));
  }, [regions, mapHeight]);

  return (
    <LayerGroup>
      <BaseRegions
        regions={regions}
        visibleRegions={visibleRegions}
        setHoveredRegion={setHoveredRegion}
        mapHeight={mapHeight}
      />
      <HoverHighlight region={hoveredRegion} mapHeight={mapHeight} />
      {showBorders ? (
        <BorderSegments
          segments={segments}
          hoveredRegionName={hoveredRegion?.name}
        />
      ) : null}
    </LayerGroup>
  );
};

export default GameMapBorders;
