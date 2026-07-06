# Canonical World Coordinates in the Data Contract — Design

Date: 2026-07-04
Status: Draft (pending user review)
Scope: shared `data-contract`, both `tools` pipelines, both data repos,
`map-engine`, both apps. Rollout is **phased** (Palworld first, then AION2).

## Goal & motivation

Store the game's **raw UE world coordinates** as the canonical marker/region
coordinate, instead of the pre-transformed image-pixel coordinates stored today.
Chosen motivation: **source of truth / provenance** — the dataset should hold
the real game coordinates, not a lossy derivative tied to a specific tile
resolution, so data is auditable and mislocated markers (e.g. the Free Pal
Alliance outlier) are easier to diagnose.

Pixels are then **derived at load** by the frontend from per-map transform
params, which also removes the hardcoded per-map affine in Palworld's
`toGameCoords` (the in-game readout becomes a direct `world→game` map).

Non-goals: changing map art/tiles, changing the visual result on screen (markers
must land in exactly the same place), and backend/dynamic-data coordinates.

## Current state (baseline)

- **Data**: `markers/<Map>.json` and `regions/<Map>.json` store image-pixel
  `x,y` (y-down), range `0 … tilesCount*tileSize`. Contract:
  `packages/data-contract/src/types.ts` (`MarkerInstance`, `RegionInstance`).
- **tools**: each pipeline converts `world→pixel` and emits pixel. Palworld:
  `transform.mjs` (`bounds {min,max}`, `orientation {pxAxis, flipX, flipY}`,
  pixel size). AION2: `WorldMapTransform` (`WorldBoundBox`, `px_from=X`,
  `flip_x=false`, `flip_y=false`).
- **frontend**: `map-engine/coords.ts` maps pixel→Leaflet with a single vertical
  flip (`lat = mapHeight - y`); `latLngToData` is the inverse. Cursor store,
  context menu, marker projection, region borders, and subzone lookup all work
  in pixel space.
- **Known wart (AION2)**: `regions.yaml` was calibrated in Leaflet Y-up
  (`flip_y=true`) while the tools transform is image Y-down (`flip_y=false`) —
  one flip apart (see repo `CLAUDE.md`). This migration is a chance to
  standardize on one convention.

## Target design (Approach A: structured params)

### 1. Data contract (`CONTRACT_VERSION` 1 → 2)

- `MarkerInstance` / `RegionInstance`: `x,y` now hold **world** coordinates
  (game engine units). `z` remains the world height. Region `borders` hold world
  `[x,y]` pairs. Field names stay `x,y` (redefined as world) to minimize churn;
  the semantics are documented in the contract.
- `GameMapMeta` gains the params to reconstruct pixels:
  ```ts
  worldBounds: { min: { x: number; y: number }; max: { x: number; y: number } }
  orientation: { pxAxis: "X" | "Y"; flipX: boolean; flipY: boolean }
  ```
  Pixel size stays derived (`tilesCountX*tileWidth` × `tilesCountY*tileHeight`).

### 2. map-engine (`coords.ts`) — one conversion boundary

The engine becomes **world-native at its input** and converts at the projection
boundary; pixels remain an internal rendering detail only.

- `worldToPixel(map, x, y)` — mirrors `tools/transform.mjs` exactly (bounds +
  orientation).
- `worldToLatLng(map, x, y)` / `worldToLatLngTuple` — `worldToPixel` then the
  existing single vertical flip. Replaces `dataToLatLng`.
- `latLngToWorld(map, lat, lng)` — inverse, for the context menu + cursor store.

All engine consumers (`positionById`, `GameMapBorders`, `CursorTracker`,
`MapContextMenu`, `SelectedMarkerPopup`) switch to these. `EngineMarker.x/y` and
the cursor store now carry world coords; `displayCoords` therefore receives
**world** coords.

### 3. In-game readout (`displayCoords`)

- **Palworld**: `toGameCoords` becomes a direct `world→game` map — the real
  Paldex formula (`game_x=(worldY-158000)/459`, `game_y=(worldX+123888)/459`),
  no pixel round-trip, no per-map hardcoded affine. Per-map applicability stays
  (identity for maps without a game grid, e.g. WorldTree).
- **AION2**: currently shows pixel. With world input it would show raw world
  units; **decision — AION2 keeps identity `displayCoords` and shows world
  coords** (its readout was never game-native). Revisit only if a nicer AION2
  readout is wanted later.

### 4. tools (both pipelines)

Emit world `x,y,z` for markers and world `borders` for regions (i.e. stop
applying `world→pixel`), and emit `worldBounds` + `orientation` into `maps.json`.
The `world→pixel` math stays in tools only for calibration/QA renders. A shared
**round-trip test** (`world→pixel→world` within ε, and pixel positions identical
to the previous emitted values) guarantees tools and engine agree.

### 5. AION2-specific fixups

- **Regions**: re-express `regions.yaml`/borders in world coords, resolving the
  Y-flip discrepancy by adopting the image-space (no-flip) convention end-to-end.
  Re-verify against landmarks after migration.
- **Subzone lookup** (`useSubzoneLookup`): operates on pixel today; move it to
  world coords (it receives world from the engine).

## Migration & rollout (phased)

1. **Contract**: add v2 fields (bounds/orientation on `GameMapMeta`; document
   world semantics). Bump `CONTRACT_VERSION`. Hard cutover — the frontend reads
   v2; no dual-format support.
2. **Palworld first (proving ground)**: update palworld extractor → regenerate
   `data-palworld` → engine world-native → verify markers land identically +
   readout correct. Land this end-to-end before touching AION2.
3. **AION2**: same pattern + region/subzone fixups + re-calibration. Regenerate
   `data`.
4. Each phase is independently shippable because the contract carries the params
   per map and both data repos regenerate wholesale.

## Testing

- **Round-trip unit test** (tools + engine share fixtures): `world→pixel→world`
  within ε; and `worldToPixel(stored world)` equals the previously-emitted pixel
  for a sample of markers per map (guarantees "markers don't move").
- **Engine unit tests**: `worldToLatLng` / `latLngToWorld` inverse; per-map
  orientation cases.
- **Palworld `toGameCoords`**: world→game against the 6 tower references
  (reuse existing test, now fed world coords).
- **e2e**: existing map specs must pass unchanged (pixel/screen positions
  identical); add a check that a known marker projects to the same container
  point as before.

## Risks

- **Silent marker shift** if engine `worldToPixel` disagrees with tools by a
  sign/axis — mitigated by the shared round-trip + "same pixel as before" test.
- **AION2 re-calibration**: the region Y-flip cleanup can move regions if done
  wrong; verify against landmarks before shipping the AION2 phase.
- **Cross-repo coordination**: contract bump must land with both regenerated data
  repos or the frontend breaks; sequence carefully (contract + palworld data +
  frontend together; AION2 data in its own phase behind the same contract).

## Open decisions (flagged for review)

- **Field naming**: reuse `x,y` (redefined as world) vs. rename to
  `worldX/worldY`. Default: reuse `x,y` to limit churn.
- **AION2 readout**: show raw world coords (default) vs. build a nicer AION2
  coordinate readout.
- **Engine boundary**: world-native engine (this design) vs. converting
  world→pixel in each app adapter and leaving the engine pixel-native. Default:
  world-native engine (single conversion point, cleaner `displayCoords`).
