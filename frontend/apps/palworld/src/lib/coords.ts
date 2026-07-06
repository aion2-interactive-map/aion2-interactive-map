// Palworld in-game map coordinate readout.
//
// Markers and the cursor now carry RAW WORLD coordinates (x = worldX,
// y = worldY). Palworld's in-game readout is a fixed linear map of world
// position: the axes are SWAPPED (game-x ← worldY, game-y ← worldX), scaled by
// 459 world-units per in-game unit, and shifted by the landscape midpoint
// (palworld-coord library constants; verified against 6 tower entrances — see
// docs/superpowers/specs/2026-07-04-palworld-ingame-coordinates-design.md):
//
//   game_x = (worldY - 158000) / 459
//   game_y = (worldX + 123888) / 459
//
// Only MainWorld has a known in-game grid; other maps (e.g. WorldTree) return
// their coords unchanged.

const MAIN_WORLD = {
  scale: 459,
  shiftX: 158000, // subtracted from worldY → game x
  shiftY: 123888, // added to worldX → game y
}

/** RAW WORLD (x, y) → Palworld in-game coords. Identity for unmapped maps. */
export function toGameCoords(
  mapId: string,
  x: number,
  y: number,
): { x: number; y: number } {
  if (mapId !== 'MainWorld') return { x, y }
  return {
    x: (y - MAIN_WORLD.shiftX) / MAIN_WORLD.scale,
    y: (x + MAIN_WORLD.shiftY) / MAIN_WORLD.scale,
  }
}
