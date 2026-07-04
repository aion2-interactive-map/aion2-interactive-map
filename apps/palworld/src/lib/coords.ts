// Pixel (DATA-space) → Palworld in-game map coordinates (the integer "map"
// readout the game shows at the bottom-left of the world map).
//
// Palworld's in-game coordinate is a linear rescale of the UE world position
// with the axes SWAPPED (game-x ← worldY, game-y ← worldX), a fixed scale of
// 459 world-units per in-game unit, and a shift by the landscape midpoint
// (palworld-coord library constants). Our markers are stored in image-pixel
// space, so we compose the per-map inverse of the tools' world→pixel transform
// with that world→game formula. Both are linear ⇒ the net pixel→game map is a
// single affine per map.
//
// Verified 2026-07-04 against 6 tower entrances (5/6 within eyeball error of
// scraped guide coords; the 6th — Free Pal Alliance — is a mislocated marker in
// the source data, not a transform error). See
// docs/superpowers/specs/2026-07-04-palworld-ingame-coordinates-design.md.

/** Linear map: gameX = ax*px + bx, gameY = ay*py + by. */
type Affine = { ax: number; bx: number; ay: number; by: number }

/**
 * Source constants for a square map: `size` = pixel grid side
 * (tilesCount*tileSize), `range` = world units across (X and Y equal),
 * `minX/minY` = world bounds min (landScapeRealPositionMin), `scale` =
 * world-units per in-game unit, `shiftX/shiftY` = Paldex midpoint shift.
 *
 *   worldY = px/size*range + minY
 *   worldX = (size-py)/size*range + minX
 *   gameX  = (worldY - shiftX) / scale
 *   gameY  = (worldX + shiftY) / scale
 */
function affineFrom(s: {
  size: number
  range: number
  minX: number
  minY: number
  scale: number
  shiftX: number
  shiftY: number
}): Affine {
  const k = s.range / s.size / s.scale
  return {
    ax: k,
    bx: (s.minY - s.shiftX) / s.scale,
    ay: -k,
    by: (s.range + s.minX + s.shiftY) / s.scale,
  }
}

// Per-map pixel→game affine. Maps without an entry fall back to identity (raw
// pixel coords) — e.g. WorldTree, whose in-game coordinate grid is unconfirmed.
const AFFINE: Record<string, Affine> = {
  MainWorld: affineFrom({
    size: 8192,
    range: 1448800,
    minX: -1099400,
    minY: -724400,
    scale: 459,
    shiftX: 158000,
    shiftY: 123888,
  }),
}

/** DATA-space (x, y) → Palworld in-game coords. Identity for unmapped maps. */
export function toGameCoords(
  mapId: string,
  x: number,
  y: number,
): { x: number; y: number } {
  const a = AFFINE[mapId]
  if (!a) return { x, y }
  return { x: a.ax * x + a.bx, y: a.ay * y + a.by }
}
