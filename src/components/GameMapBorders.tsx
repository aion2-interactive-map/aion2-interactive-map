// src/components/map/GameMapBorders.tsx
import React, {useMemo} from "react";
import {LayerGroup, Polyline, Polygon} from "react-leaflet";
import {useMarkers} from "@/context/MarkersContext.tsx";
import type {RegionInstance} from "@/types/game.ts";

type Props = {
  hoveredRegion?: RegionInstance;
  setHoveredRegion: (hoveredRegion?: RegionInstance) => void;
}

// Same idea as backend palette; adjust to your theme
const REGION_COLORS = ["#ff3c3c", "#3cd23c", "#3c78ff", "#ffd200"];

// Simple deterministic hash → 0..3 so the same region always gets same color
function colorIndexFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % REGION_COLORS.length;
}

const xyToLatLng = ([x, y]: number[]): [number, number] => [y, x];


const GameMapBorders: React.FC<Props> = ({ hoveredRegion, setHoveredRegion }) => {
  const {regions} = useMarkers();
  // const [hoveredRegion, setHoveredRegion] = useState<RegionInstance | undefined>(undefined);


  /*  const polylines = useMemo(
      () =>
        regions.flatMap((regionEntry) => {
          const idx = colorIndexFromName(regionEntry.name);
          const color = REGION_COLORS[idx];

          return regionEntry.borders.map((poly, polyIdx) => ({
            key: `${regionEntry.name}-${polyIdx}`,
            color,
            positions: poly.map(xyToLatLng)
          }));
        }),
      [regions]
    );*/

  function edgeKey(a: number[], b: number[]) {
    const A = `${a}`, B = `${b}`;
    return A < B ? `${A}|${B}` : `${B}|${A}`;
  }

  /** 🟡 FIX — store all regions that share same edge */
  const segments = useMemo(() => {
    const edgeMap = new Map<string,{positions:[number,number][],regions:string[]}>();

    regions.forEach(region => {
      region.borders.forEach((poly) => {
        for(let i=0; i<poly.length-1; i++){
          const a = poly[i], b = poly[i+1];
          const key = edgeKey(a,b);
          const pos:[number,number][] = [xyToLatLng(a),xyToLatLng(b)];

          if(!edgeMap.has(key)){
            edgeMap.set(key,{positions:pos,regions:[region.name]});
          } else {
            edgeMap.get(key)!.regions.push(region.name);
          }
        }
      });
    });

    return [...edgeMap.entries()].map(([key,val])=>({
      key,
      positions:val.positions,
      regions:val.regions,
      color:REGION_COLORS[colorIndexFromName(val.regions[0])] // use first region’s color OR compute blended later
    }));

  },[regions]);

  return (
    <LayerGroup>
      {regions.map(region =>
        region.borders.map((polygon, idx) => (
          <Polygon
            key={`${region.name}-hit-${idx}`}
            positions={polygon.map(xyToLatLng)}
            pathOptions={{color: "transparent", fillOpacity: 0}}
            eventHandlers={{
              mouseover: () => setHoveredRegion(region),
              mouseout: () => setHoveredRegion(undefined)
            }}
          />
        ))
      )}

      {segments.map((seg) => (
        <Polyline
          key={seg.key}
          positions={seg.positions}
          pathOptions={
            hoveredRegion && seg.regions.includes(hoveredRegion.name)
              ? {color: "#ffffff", weight: 3, opacity: 1, dashArray: "1 0"}
              : {color: "#ffffff", weight: 3, opacity: 0.5, dashArray: "8 5"}
          }
          interactive={false}
        />
      ))}
    </LayerGroup>
  );
};

export default GameMapBorders;