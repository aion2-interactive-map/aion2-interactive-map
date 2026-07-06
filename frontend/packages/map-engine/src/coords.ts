import L from "leaflet";
import type { GameMapMeta } from "@gamemap/data-contract";

/**
 * Coordinate conversion between DATA space and Leaflet `CRS.Simple`.
 *
 * DATA `(x, y)` on a marker/region is EITHER raw world coordinates (when the
 * map carries `worldBounds`+`orientation`) or already image-pixel coordinates
 * (legacy, no bounds). {@link worldToPixel} resolves that to a pixel position
 * (identity in the legacy case). From pixels we place data on the Leaflet
 * canvas with a single vertical flip: `lat = mapHeight - py` (image Y is DOWN,
 * Leaflet latitude is UP). Horizontal is unchanged (`lng = px`).
 *
 * `mapHeight`/`mapWidth` are the pixel size of the full tile grid
 * (`tile* × tilesCount*`, e.g. 8192 for World_L_A).
 *
 * Keep all data↔Leaflet conversions going through these helpers so the single
 * flip is never duplicated (double-flip) or omitted.
 */

/** Pixel width of the full tile grid. */
export function mapWidthOf(map: GameMapMeta): number {
  return map.tileWidth * map.tilesCountX;
}

/** Pixel height of the full tile grid in image space. */
export function mapHeightOf(map: GameMapMeta): number {
  return map.tileHeight * map.tilesCountY;
}

/**
 * DATA `(x, y)` → image-pixel `(x, y)`. When the map has no
 * `worldBounds`/`orientation`, DATA is already pixels and this is the identity.
 * Otherwise it mirrors the `tools` world→pixel transform (linear map from the
 * world bounding box to the pixel grid, with the map's axis/flip orientation).
 */
export function worldToPixel(
  map: GameMapMeta,
  x: number,
  y: number,
): { x: number; y: number } {
  const b = map.worldBounds;
  const o = map.orientation;
  if (!b || !o) return { x, y };
  const W = mapWidthOf(map);
  const H = mapHeightOf(map);
  const pyAxis = o.pxAxis === "X" ? "Y" : "X";
  const world = { X: x, Y: y };
  const min = { X: b.min.x, Y: b.min.y };
  const max = { X: b.max.x, Y: b.max.y };
  let px = ((world[o.pxAxis] - min[o.pxAxis]) / (max[o.pxAxis] - min[o.pxAxis])) * W;
  let py = ((world[pyAxis] - min[pyAxis]) / (max[pyAxis] - min[pyAxis])) * H;
  if (o.flipX) px = W - px;
  if (o.flipY) py = H - py;
  return { x: px, y: py };
}

/** Inverse of {@link worldToPixel} (identity for legacy pixel maps). */
export function pixelToWorld(
  map: GameMapMeta,
  px: number,
  py: number,
): { x: number; y: number } {
  const b = map.worldBounds;
  const o = map.orientation;
  if (!b || !o) return { x: px, y: py };
  const W = mapWidthOf(map);
  const H = mapHeightOf(map);
  const pyAxis = o.pxAxis === "X" ? "Y" : "X";
  const min = { X: b.min.x, Y: b.min.y };
  const max = { X: b.max.x, Y: b.max.y };
  let fx = px;
  let fy = py;
  if (o.flipX) fx = W - fx;
  if (o.flipY) fy = H - fy;
  const world = { X: 0, Y: 0 };
  world[o.pxAxis] = (fx / W) * (max[o.pxAxis] - min[o.pxAxis]) + min[o.pxAxis];
  world[pyAxis] = (fy / H) * (max[pyAxis] - min[pyAxis]) + min[pyAxis];
  return { x: world.X, y: world.Y };
}

/** DATA (x, y) → Leaflet `LatLng` (world→pixel, then single vertical flip). */
export function dataToLatLng(map: GameMapMeta, x: number, y: number): L.LatLng {
  const p = worldToPixel(map, x, y);
  return new L.LatLng(mapHeightOf(map) - p.y, p.x);
}

/** DATA (x, y) → Leaflet `[lat, lng]` tuple (world→pixel, then vertical flip). */
export function dataToLatLngTuple(
  map: GameMapMeta,
  x: number,
  y: number,
): [number, number] {
  const p = worldToPixel(map, x, y);
  return [mapHeightOf(map) - p.y, p.x];
}

/** Leaflet (lat, lng) → DATA {x, y} (inverse flip, then pixel→world). */
export function latLngToData(
  map: GameMapMeta,
  lat: number,
  lng: number,
): { x: number; y: number } {
  return pixelToWorld(map, lng, mapHeightOf(map) - lat);
}
