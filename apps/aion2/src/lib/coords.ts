import L from "leaflet";
import type { GameMapMeta } from "@gamemap/data-contract";

/**
 * Coordinate conversion between DATA space and Leaflet `CRS.Simple`.
 *
 * The parsed dataset (markers/regions) and the map tiles use IMAGE space:
 * `y` increases DOWNWARD. Leaflet's `CRS.Simple` treats latitude as
 * increasing UPWARD. The tile layer (`GameMapTiles`) already renders the
 * image top-at-the-top, so to place data on the same canvas we must flip the
 * vertical axis exactly ONCE: `lat = mapHeight - y` (and the inverse,
 * `y = mapHeight - lat`). The horizontal axis is unchanged (`lng = x`).
 *
 * `mapHeight` is the pixel height of the full tile grid
 * (`tileHeight * tilesCountY`, e.g. 8192 for World_L_A).
 *
 * Keep all data↔Leaflet conversions going through these helpers so the single
 * flip is never duplicated (double-flip) or omitted.
 */

/** Pixel height of the full tile grid in image space. */
export function mapHeightOf(map: GameMapMeta): number {
  return map.tileHeight * map.tilesCountY;
}

/** DATA (x, y) → Leaflet `LatLng` (single vertical flip). */
export function dataToLatLng(map: GameMapMeta, x: number, y: number): L.LatLng {
  return new L.LatLng(mapHeightOf(map) - y, x);
}

/** DATA (x, y) → Leaflet `[lat, lng]` tuple (single vertical flip). */
export function dataToLatLngTuple(
  map: GameMapMeta,
  x: number,
  y: number,
): [number, number] {
  return [mapHeightOf(map) - y, x];
}

/** Leaflet (lat, lng) → DATA {x, y} (inverse vertical flip). */
export function latLngToData(
  map: GameMapMeta,
  lat: number,
  lng: number,
): { x: number; y: number } {
  return { x: lng, y: mapHeightOf(map) - lat };
}
