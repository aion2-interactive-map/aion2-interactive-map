import React, { memo, useMemo } from "react";
import { LayerGroup, Polyline, Polygon } from "react-leaflet";
import { useMarkers } from "@/context/MarkersContext";
import type { RegionInstance } from "@/types/game";
import { useGameData } from "@/context/GameDataContext";

type Props = {
  hoveredRegion?: RegionInstance;
  setHoveredRegion: (hoveredRegion?: RegionInstance) => void;
};

const xyToLatLng = ([x, y]: number[]): [number, number] => [y, x];

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
}: {
  regions: RegionInstance[];
  visibleRegions?: Set<string>;
  setHoveredRegion: (region?: RegionInstance) => void;
}) {
  return (
    <LayerGroup>
      {regions
        .filter((region) => !visibleRegions || visibleRegions.has(region.name))
        .map((region) =>
          region.borders.map((polygon, idx) => (
            <Polygon
              key={`${region.name}-base-${idx}`}
              positions={polygon.map(xyToLatLng)}
              pathOptions={{
                color: "var(--primary)",
                weight: 1,
                fillOpacity: 0.05,
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
}: {
  region?: RegionInstance;
}) {
  if (!region) return null;
  return (
    <LayerGroup>
      {region.borders.map((polygon, idx) => (
        <Polygon
          key={`${region.name}-hl-${idx}`}
          positions={polygon.map(xyToLatLng)}
          pathOptions={{
            color: "var(--primary)",
            weight: 1,
            fillOpacity: 0.2,
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

  // De-duplicate shared edges so a border drawn between two regions renders once.
  const segments = useMemo(() => {
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
          const pos: [number, number][] = [xyToLatLng(a), xyToLatLng(b)];

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
  }, [regions]);

  return (
    <LayerGroup>
      <BaseRegions
        regions={regions}
        visibleRegions={visibleRegions}
        setHoveredRegion={setHoveredRegion}
      />
      <HoverHighlight region={hoveredRegion} />
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
