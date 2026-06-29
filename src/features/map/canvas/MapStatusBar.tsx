import React, { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { cursorStore } from "@/features/map/canvas/cursorStore";
import { useMarkers } from "@/context/MarkersContext";
import { useGameMap } from "@/context/GameMapContext";

const ICP = "沪ICP备2025152827号-1";

// Lanhu "1天族" footer: white text on the bottom-left of the map. The ICP record
// floats directly on the map (with a dark text-shadow); below it, the live
// cursor coords + the subzone under the cursor sit on a translucent grey pill.
// Both lines are left-aligned to the pill's left edge. Geometry follows the
// board (layout = logical px ×2).
const TEXT_SHADOW = "0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.6)";

/** Ray-casting point-in-polygon. Cursor + borders are both DATA image-space. */
function pointInPolygon(x: number, y: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    if (
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function polygonArea(poly: number[][]): number {
  let s = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    s += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
  }
  return Math.abs(s) / 2;
}

const MapStatusBar: React.FC = () => {
  const pos = useSyncExternalStore(
    cursorStore.subscribe,
    cursorStore.getSnapshot,
  );
  const { regions } = useMarkers();
  const { selectedMap } = useGameMap();
  const regionNs = `regions/${selectedMap?.name}`;
  const { t } = useTranslation([regionNs]);

  // Regions ordered smallest-area first so a cursor lookup returns the MOST
  // SPECIFIC subzone containing the point. Stable across mousemoves (depends
  // only on the region set).
  const byAreaAsc = useMemo(
    () =>
      [...regions]
        .map((r) => ({
          r,
          area: r.borders.reduce((a, p) => a + polygonArea(p), 0),
        }))
        .sort((a, b) => a.area - b.area)
        .map((x) => x.r),
    [regions],
  );

  // Smallest containing region that is a real, named subzone. Skips the
  // zone-wide catch-all (`*Subzonedefault`, e.g. VerteronSubzonedefault) so a
  // point that only belongs to the whole map shows NO region name, and skips
  // untranslated placeholder subzones (translated name === raw key).
  let subzone = "";
  if (pos) {
    for (const r of byAreaAsc) {
      if (/Subzonedefault$/i.test(r.name)) continue;
      if (!r.borders.some((p) => pointInPolygon(pos.x, pos.y, p))) continue;
      const name = t(`${regionNs}:${r.name}.name`);
      if (name && name !== r.name) {
        subzone = name;
        break;
      }
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] select-none">
      <div className="absolute bottom-[22px] left-5 flex flex-col items-start gap-[18px] text-white">
        <span
          className="text-[11px] leading-none text-white/80"
          style={{ textShadow: TEXT_SHADOW }}
        >
          {ICP}
        </span>
        <div
          data-testid="map-coords"
          className="flex items-baseline gap-2.5 rounded-[12px] bg-[rgba(216,216,216,0.7)] px-3 py-1.5 text-sm leading-none"
          style={{ textShadow: TEXT_SHADOW }}
        >
          <span className="tabular-nums">
            {pos ? `x:${Math.round(pos.x)},y:${Math.round(pos.y)}` : "x:--,y:--"}
          </span>
          {subzone && <span className="truncate">{subzone}</span>}
        </div>
      </div>
    </div>
  );
};

export default MapStatusBar;
