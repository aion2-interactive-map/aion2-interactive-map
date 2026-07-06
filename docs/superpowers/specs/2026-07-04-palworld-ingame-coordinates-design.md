# Palworld In-Game Coordinate Readout — Design

Date: 2026-07-04
Status: Draft (pending user review)
Scope: `frontend/` (map-engine + palworld app). No data regen, no backend, no tools change.

## Goal

On the **Palworld** map, show coordinates that match the numbers Palworld shows
in its own world map ("in-game" / Paldex coordinates), so players can
cross-reference locations. **Display-only**: the cursor footer readout and the
right-click "Copy position" value. Stored marker data, tiles, and the Leaflet
coordinate space stay exactly as they are.

Explicitly out of scope: rewriting emitted marker/region data, changing the
map-engine coordinate space, backend, and the AION2 app (which keeps its current
pixel readout).

## Background — three coordinate spaces

1. **DATA / pixel space** — what markers are stored in and what the readout shows
   today. Range `0 .. tilesCount*tileSize` (MainWorld = 8192×8192).
2. **UE world space (a.k.a. `.sav`)** — raw engine coords (cm), the pipeline's
   input. The tools transform maps world→pixel linearly per map
   (`palworld/src/transform.mjs`): for MainWorld/WorldTree `pxAxis:'Y'`,
   `flipX:false`, `flipY:true`, over extracted bounds
   `landScapeRealPositionMin/Max`. MainWorld bounds: `X∈[-1099400, 349400]`,
   `Y∈[-724400, 724400]` (both ranges = 1448800).
3. **Paldex / in-game readout** — the numbers the game overlays on its map. A
   fixed linear rescale of world space with an **axis swap** (game-x ← worldY,
   game-y ← worldX). This is why the community says "south is east" in Palworld.

Because pixel→world and world→Paldex are both linear, **pixel→Paldex is a single
affine map per map**, applied only at display time.

## The Paldex formula (authoritative)

From the palworld-coord library, pinned via its worked example
`map_to_sav(373, -359) = (savX -288669, savY 329207)`, which solves to scale
**exactly 459** and midpoint shift `(-123888, 158000)`:

```
game_x = (worldY - 158000) / 459
game_y = (worldX + 123888) / 459
```

Cross-check `sav_to_map(-167230, 96430)`: `game_x=(96430-158000)/459=-134.1→-134`,
`game_y=(-167230+123888)/459=-94.4→-94` ✓ (matches library output `(-134,-94)`).

This formula is a property of Palworld's map UI and is **independent of our tile
bounds** — the earlier "our bounds are ~1.6× wider than published" concern does
not affect it (that width is just ocean margin in our tiles).

## Composed pixel→Paldex (MainWorld)

Inverting the tools transform for MainWorld:
```
worldY = px/8192 * 1448800 - 724400
worldX = (8192 - py)/8192 * 1448800 - 1099400
```
Substituting into the Paldex formula:
```
game_x ≈ 0.38531 * px - 1922.4
game_y ≈ 1031.1 - 0.38531 * py
```
Spot check (first fast-travel statue, px≈4543.4, py≈2590.1) → ≈ **(-172, 33)**, a
plausible in-game coordinate.

## Design

### 1. map-engine: one optional, game-agnostic prop

Add to `GameMapView`:
```ts
/** Map DATA (pixel) coords to the coords shown in the readout. Default: identity. */
displayCoords?: (x: number, y: number) => { x: number; y: number }
```
Thread it into the only two places that print coordinates:
- **`MapStatusBar`** (cursor footer) — apply before rounding.
- **Context menu** — the "Copy position (x, y)" label and `handleCopyPosition`
  clipboard text.

Default is identity, so **AION2 is byte-for-byte unchanged**. Tiles, marker
projection (`dataToLatLng`), regions, CRS, and search are untouched.

### 2. palworld app: the transform

New `apps/palworld/src/lib/coords.ts`:
```ts
export function toGameCoords(mapId: string, x: number, y: number): { x: number; y: number }
```
Holds a per-map affine (scale + offset per axis). `App.tsx` passes
`displayCoords={(x, y) => toGameCoords(currentMapId, x, y)}` to `GameMapView`.

- **MainWorld**: `game_x = 0.38531*x - 1922.4`, `game_y = 1031.1 - 0.38531*y`
  (constants finalized after verification below).
- **WorldTree**: **identity (pixel) for v1.** It's a separate sub-area and it is
  not yet confirmed to share the Paldex grid. Revisit if it has its own readout.

### 3. Formatting

In-game coords are integers → round and drop decimals: `x:NNN, y:NNN` (and the
same in the copied string). Matches the game.

## Verification (done 2026-07-04)

Validated the composed formula against **6 tower entrances** (published in-game
coords vs our marker pixels → affine):

| Tower | formula | published | Δ |
|---|---|---|---|
| Feybreak | (−1288, −1665) | (−1294, −1669) | ~5 |
| PIDF | (542, 335) | (561, 334) | ~19 |
| PAL Genetic | (−138, 465) | (−148, 447) | ~15 |
| Eternal Pyre | (−595, −531) | (−587, −517) | ~12 |
| Rayne Syndicate | (118, −422) | (113, −431) | ~8 |
| Free Pal Alliance | (34, −308) | (181, 29) | **outlier** |

5/6 match within the eyeball error of scraped guide coords (the readout only
needs approximate agreement). **Free Pal Alliance is a data-quality outlier**:
our `MainWorld-fastTravel-2` marker is mislocated relative to the real tower —
a separate data issue, NOT a transform error. The library constants
(scale **459**, shift `(158000, 123888)`) are therefore correct for our export.

Final **MainWorld** pixel→game constants:
```
game_x = 0.3853059 * px - 1922.444
game_y = 1031.128   - 0.3853059 * py
```
(Both round to integers for display.)

Regression: AION2 readout must stay unchanged (identity default).

## Files touched

- `packages/map-engine/src/components/GameMapView.tsx` — new prop, thread to
  status bar + context menu.
- `packages/map-engine/src/components/MapStatusBar.tsx` — apply `displayCoords`.
- `apps/palworld/src/lib/coords.ts` — **new**, `toGameCoords`.
- `apps/palworld/src/App.tsx` — pass `displayCoords`.
- Tests: unit test `toGameCoords` against the verification points; keep existing
  AION2 coord tests green.

## Open decisions (flagged for review)

- **Calibration source**: default is "I look up 2–3 points from community maps";
  alternative is you provide in-game readings.
- **WorldTree**: default is "keep pixels"; alternatives are calibrate it or apply
  the same formula to its bounds unverified.
```
