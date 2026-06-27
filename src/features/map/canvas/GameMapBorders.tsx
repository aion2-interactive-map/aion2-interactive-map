import React, { useMemo } from "react";
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

const GameMapBorders: React.FC<Props> = ({ hoveredRegion, setHoveredRegion }) => {
  const { regions } = useMarkers();
  const { showBorders, visibleRegions } = useGameData();

  // De-duplicate shared edges so a border drawn between two regions is rendered once.
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
      {regions
        .filter((region) => !visibleRegions || visibleRegions.has(region.name))
        .map((region) =>
          region.borders.map((polygon, idx) => {
            const hovered = hoveredRegion?.name === region.name;
            return (
              <Polygon
                key={`${region.name}-hit-${idx}`}
                positions={polygon.map(xyToLatLng)}
                pathOptions={{
                  color: "var(--primary)",
                  weight: 1,
                  fillOpacity: hovered ? 0.2 : 0.05,
                }}
                eventHandlers={{
                  mouseover: () => setHoveredRegion(region),
                  mouseout: () => setHoveredRegion(undefined),
                }}
              />
            );
          }),
        )}

      {showBorders
        ? segments.map((seg) => {
            const hovered =
              hoveredRegion && seg.regions.includes(hoveredRegion.name);
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
          })
        : null}
    </LayerGroup>
  );
};

export default GameMapBorders;
