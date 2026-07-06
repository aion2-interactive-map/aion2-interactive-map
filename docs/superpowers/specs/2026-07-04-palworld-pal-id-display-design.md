# Palworld Pal ID (Paldeck number) in sidebar, popup, and search

**Date:** 2026-07-04
**Status:** Design — approved for planning
**Repos touched:** `frontend` (data-contract, apps/palworld, packages/map-shell),
`tools` (palworld extractor `emit.mjs`), `data-palworld` (regenerated output).

## Goal

Every catalogued pal shows its 3-digit Paldeck number:

- **Wild pals** (map spawns, one subtype per species): number in the **left
  sidebar** (badge on the right of the filter button), the **marker popup**, and
  **search**.
- **Alpha pals** (boss markers, one generic `alphaPal` subtype): number in the
  **popup** and **search** only — *not* in the sidebar (the sidebar has a single
  generic "Alpha Pal" toggle, so there is no per-species row to badge).

## Source of truth

The Paldeck number already exists in the extractor's parsed data as `palMeta`:

```
palMeta[palId] = { zukanIndex: number, zukanIndexSuffix: string }
```

- `zukanIndex` ranges **1–204** for catalogued pals; `-1`/`-2` for uncatalogued
  entries (raids, human NPC spawners) — these get **no id**.
- `zukanIndexSuffix` is `""` or `"B"` (elemental variants sharing a base number,
  e.g. Tentacle Turtle `037` vs its ground variant `037B`).

Today `emit.mjs` computes this only to **sort** pals by Paldeck order; it is
dropped before the dataset is written. This design carries it through to the
frontend.

### Display format

```
formatPalId(zukanIndex, suffix) =
  zukanIndex > 0  ->  "No." + String(zukanIndex).padStart(3, "0") + (suffix ?? "")
  else            ->  undefined   // not shown
```

Examples: `No.001`, `No.037`, `No.037B`, `No.204`.

The `"No."` prefix and zero-padding are **display concerns** and live in the
palworld app, not in the data or the shared shell. The data carries only the raw
`zukanIndex` (number) + `zukanIndexSuffix` (string).

## Two carriers, because the two pal kinds differ

| Pal kind   | Taxonomy shape                     | ID carrier            | Surfaces           |
|------------|------------------------------------|-----------------------|--------------------|
| Wild pal   | one subtype per species (`id`=palId) | **subtype** in `types.json` | sidebar, popup, search |
| Alpha pal  | one generic `alphaPal` subtype     | **marker row** in `markers/*.json` | popup, search |

Frontend resolves per marker: `zukanIndex = marker.zukanIndex ?? subtypeMeta.zukanIndex`
(alpha markers carry their own; wild-pal markers inherit from their subtype).

## Changes by repo

### 1. `frontend/packages/data-contract`

Add two optional fields, mirrored in the zod schemas, to:

- `MarkerTypeSubtype` (`types.ts` + `markerTypeSubtypeSchema` in `schemas.ts`)
- `MarkerInstance` (`types.ts` + `markerInstanceSchema` in `schemas.ts`)

```ts
/** Paldeck index (palworld). 1-based; absent/<=0 means uncatalogued. */
zukanIndex?: number;
/** Paldeck variant suffix, e.g. "B" for elemental variants. */
zukanIndexSuffix?: string;
```

### 2. `tools` (palworld extractor `src/emit.mjs`)

- **Wild-pal subtypes:** the `palSubtypes` array already holds `zukanIndex`/
  `zukanIndexSuffix`. The `types` builder currently emits only
  `{ id, name, icon?, color? }` per subtype — extend it to also emit
  `zukanIndex`/`zukanIndexSuffix` when present (`zukanIndex > 0`).
- **Alpha-pal markers:** in the boss loop, resolve `zForId(b.characterId)` and
  attach `zukanIndex`/`zukanIndexSuffix` to the candidate; carry them through the
  id-assignment step into the emitted marker row (only when `zukanIndex > 0`).
- Re-run the `emit` stage to regenerate `data-palworld/types.json` and
  `data-palworld/markers/*.json`. (No re-extract needed — `parsed/` already has
  `palMeta`, `palSpawns`, and `bosses`.)

### 3. `frontend/apps/palworld`

- `src/lib/data.ts`: add `zukanIndex?`/`zukanIndexSuffix?` to the local
  `MarkerRow` interface. `Taxonomy` subtypes are `MarkerTypeSubtype` from the
  contract and inherit the fields automatically.
- New helper (e.g. `src/lib/palId.ts`): `formatPalId(zukanIndex?, suffix?): string | undefined`.
- `src/App.tsx`:
  - `engineMarkers`: pass `zukanIndex`/`zukanIndexSuffix` from the marker row
    onto the `EngineMarker` object.
  - `filterCategories`: for pal-category subtypes, set
    `badge: formatPalId(subtype.zukanIndex, subtype.zukanIndexSuffix)`.
    `FilterSubtype.badge` already renders right-aligned in the button — no shell
    change. Alpha's generic subtype has no `zukanIndex`, so it gets no badge.
  - `searchItems`: set `idLabel = formatPalId(marker.zukanIndex ?? subtypeMeta.zukanIndex, ...)`.
  - `renderPopupContent`: pass the same resolved `idLabel` to `MarkerPopupCard`.

### 4. `frontend/packages/map-shell`

- `SearchPanel.tsx`:
  - `SearchItem`: add `idLabel?: string`.
  - Add `idLabel` to the MiniSearch `fields` so numeric queries match the pal.
  - Render `idLabel` as a small badge before the name in each result row.
- `MarkerPopupCard.tsx`: add `idLabel?: string`, rendered as a badge next to the
  name (right of / adjacent to the title).

Both props are game-neutral (`idLabel`), so the shell stays generic.

## Known caveat — numeric search precision

The shared search uses a per-character tokenizer (`tokenize: (s) => [...s]`) so
CJK queries match. A numeric query like `"37"` therefore tokenizes to `3`,`7`
and matches loosely. The target pal still ranks at/near the top because its
`idLabel` field contains exactly those digits, boosting relevance. This matches
the existing search behavior and is acceptable; precise whole-token numeric
search is out of scope.

## Testing

- **tools:** sanity check (existing test harness in `tools/.../test`) that emitted
  wild-pal subtypes carry `zukanIndex` and at least one alpha-pal marker row
  carries `zukanIndex`.
- **map-shell:** unit tests for `SearchPanel` — `idLabel` renders in the result
  row, and a numeric query surfaces the matching item. `MarkerPopupCard` renders
  the `idLabel` badge when provided and omits it when not.
- **app:** `formatPalId` unit test (`No.001`, `No.037B`, `undefined` for `<=0`).
- **e2e (optional):** open a wild-pal popup and assert a `No.0xx` badge; confirm
  the sidebar pal button shows the badge; search a number and select the result.

## Non-goals

- No new localization strings (`"No."` is universal; pal names already localized).
- No whole-token numeric search rework.
- Alpha pals do not gain a per-species sidebar row.
