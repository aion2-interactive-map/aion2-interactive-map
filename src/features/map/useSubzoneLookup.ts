import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMarkers } from "@/context/MarkersContext";
import { useGameMap } from "@/context/GameMapContext";

/** Ray-casting point-in-polygon. Point + borders are both DATA image-space. */
function pointInPolygon(x: number, y: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
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

/**
 * Returns a `(x, y) => localizedSubzoneName` lookup for the current map.
 *
 * Picks the smallest-area region (DATA image-space) containing the point — the
 * most specific subzone — skipping the zone-wide catch-all (`*Subzonedefault`)
 * and untranslated placeholder subzones (translated name === raw key). Returns
 * "" when no named subzone covers the point.
 *
 * Shared by the map footer (MapStatusBar) and the search result cards.
 */
export function useSubzoneLookup(): (x: number, y: number) => string {
  const { regions } = useMarkers();
  const { selectedMap } = useGameMap();
  const regionNs = `regions/${selectedMap?.name}`;
  const { t } = useTranslation([regionNs]);

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

  return useMemo(
    () => (x: number, y: number) => {
      for (const r of byAreaAsc) {
        if (/Subzonedefault$/i.test(r.name)) continue;
        if (!r.borders.some((p) => pointInPolygon(x, y, p))) continue;
        const name = t(`${regionNs}:${r.name}.name`);
        if (name && name !== r.name) return name;
      }
      return "";
    },
    [byAreaAsc, t, regionNs],
  );
}
