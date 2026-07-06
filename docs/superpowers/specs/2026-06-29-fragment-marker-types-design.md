# Distinguish three fragment types (ground / air / water) — Design

**Date:** 2026-06-29
**Status:** Approved (brainstorming) — pending implementation plan

## Problem

God-fragment ("Monolith") markers are currently all rendered and described
identically. In the game, fragments come in three physical kinds — **ground**,
**air**, and **water** — which matters to players hunting them (you reach air
fragments by flying, water fragments by swimming/diving). We want to:

1. Show the fragment's type in the marker detail dialog.
2. Add a small green directional badge on the marker icon for air (up) and
   water (down). Ground markers are unchanged.

Additionally, fragments currently render with a **placeholder** icon
(`images/Monolith_Material_Light.webp`) and fake completion with a generic
dim + green-check overlay. The game uses dedicated marker assets —
`UT_Marker_MonolithFragment` (incomplete) and `UT_Marker_MonolithFragment_Complete`
(completed) — swapping the icon to show completion. We adopt the real assets and
the icon-swap convention, which also frees the icon's bottom-right corner for the
new air/water badge.

## Key discovery — the type is derivable from the raw export

The distinction is **not** in the parsed dataset today, but each god fragment's
`EnvObj` row in `Data/Table/EnvObjData.json` has a `Name` whose suffix encodes
the kind, e.g.:

- `E_L1_Verteron_fragment_Ground`
- `E_L1_Verteron_fragment_Air`
- `E_L1_Verteron_fragment_Water`

Classification across all 575 `MapData.json` files (matching the spawned
fragment's first `EnvObjId` back to its `EnvObjData` `Name`):

| type    | count |
|---------|-------|
| ground  | 1000  |
| air     | 351   |
| water   | 67    |
| untyped | 2     |

The 2 untyped fragments are the "HQ" spawns `E_D1_HQ_GodFragment_02_001` and
`E_L1_HQ_GodFragment_01` (no suffix). **Decision: fold untyped → `ground`.**

## Approach

Derive the type in **`tools`** (the only layer that sees the raw export) and
persist it as a `fragmentType` field on the emitted marker in
`data/markers/*.json`. The frontend stays a pure renderer.

Rejected alternatives:
- *Derive in the frontend* — impossible; the frontend never sees the `EnvObj`
  name.
- *Ship the raw `EnvObj` name and parse the suffix client-side* — pushes parsing
  and noisy data into the UI; the canonical dataset should already be clean.

This keeps the existing data-flow contract intact: `tools` own the
world→dataset transform and classification; the frontend renders what it's given.

## Changes

### 1. tools — derive & emit the type

`tools/aion2/tools/maps/extract.py`, god-fragment loop (~L444–458):

- Add a cached `EnvObjId → Name` lookup (reuse `_table("EnvObjData.json")`).
- For each fragment, classify by the `Name` suffix, case-insensitive:
  - ends with `_air`  → `"air"`
  - ends with `_water` → `"water"`
  - otherwise          → `"ground"` (covers `_ground` **and** the untyped HQ
    fragments)
- Add `"Type": <classification>` to each entry appended to `fragments`.

`tools/aion2/tools/maps/emit_frontend.py`, `build_markers` fragments block
(~L341–352):

- Add `"fragmentType": f.get("Type", "ground")` to the emitted marker dict.

**Regeneration:** run the extract step then the emit step to rewrite
`data/markers/*.json`. `tools/` and `data/` are independent git repos and are
committed separately.

### 2. tools — real fragment icons (incomplete + completed)

`tools/aion2/data_src/types.yaml`, `fragments` subtype (~L73):

- Replace the placeholder `icon: images/Monolith_Material_Light.webp` with the
  real game asset `icon: UI/Resource/Texture/Icon/UT_Marker_MonolithFragment.webp`.
- Add a completed-variant field:
  `iconComplete: UI/Resource/Texture/Icon/UT_Marker_MonolithFragment_Complete.webp`.

`iconComplete` is copied verbatim into `data/types.json` because `emit_frontend.py`
emits `types.yaml` as-is (`yaml.safe_load(TYPES_SRC)`). This is a generic,
optional per-subtype field; only `fragments` sets it today.

### 3. frontend — type model

`frontend/src/types/game.ts`:

- `MarkerInstance`:
  ```ts
  /** For fragment markers: which physical kind (drives dialog text + icon badge). */
  fragmentType?: "ground" | "air" | "water";
  ```
- `MarkerTypeSubtype`:
  ```ts
  /** Optional icon shown when a marker of this subtype is completed (icon-swap
   *  completion, e.g. the game's MonolithFragment_Complete asset). */
  iconComplete?: string;
  ```

### 4. frontend — dialog (append to meta line)

`frontend/src/features/map/popup/MarkerPopupContent.tsx`:

- When `marker.fragmentType` is present, append a localized label to the
  existing category/subtype meta line with a middot separator, before the
  coordinates. Example rendered line:

  `Collection / Monolith · Air (4708, 3924)`

- Label via `t(\`common:fragmentType.${marker.fragmentType}\`)`. Text only — no
  glyph in the dialog.

### 5. frontend — completion via icon swap + air/water badge

**Completion (icon swap, matches the game).**
`frontend/src/features/map/canvas/GameMarker.tsx`:

- When `isCompleted` **and** `sub.iconComplete` is set, resolve the inner icon
  from `sub.iconComplete` and call `createPinIcon` with `completed=false` — so
  the icon itself conveys completion with **no 0.4 dim and no green check**
  (the game's behavior). For fragments this is the `MonolithFragment_Complete`
  asset.
- When `isCompleted` and there's no `iconComplete` (every other subtype),
  behavior is unchanged (dim + green check on the base icon).
- The completion *state* is still tracked in `completedBySubtype` exactly as
  before; only the rendering differs. Fragments remain `canComplete: true`.

**Air/water badge.**
`frontend/src/features/map/canvas/markerIcons.tsx`, `createPinIcon`:

- Add an optional param `fragmentType?: "ground" | "air" | "water"`.
- Include it in `cacheKey` so distinct badges don't share a cached `DivIcon`.
- In the relative-positioned 40×40 wrapper, render:
  - `air`   → `<ChevronUp>` (lucide), `size={12}`, `color="#22c55e"`,
    `position:absolute; right:-2px; bottom:-2px`
  - `water` → `<ChevronDown>` same placement/color
  - `ground` / unset → nothing
- The badge renders independent of the `completed` flag. No overlap rule is
  needed: fragments never pass `completed=true` (they icon-swap instead), so the
  green `CheckCircle` and the chevron never coincide. The chevron therefore shows
  on **both** incomplete and completed fragments.

`frontend/src/features/map/canvas/GameMarker.tsx`:

- Fragments render through the `image` branch. Pass `marker.fragmentType` into
  that `createPinIcon(...)` call. Non-fragment markers have no `fragmentType`, so
  other branches are unaffected.

### 6. locales — static enum labels

Hand-authored UI strings (not per-marker data), so they go in the app's own
namespace `common` under `frontend/public/locales/<lng>/common.yaml`:

```yaml
fragmentType:
  ground: "Ground"   # zh-CN/zh-TW: 地面
  air: "Air"         # zh-CN/zh-TW: 空中
  water: "Water"     # zh-CN/zh-TW: 水中
```

Add to `en`, `zh-CN`, and `zh-TW`. The Chinese labels (地面 / 空中 / 水中) are
UI-invented (the game L10N has no direct string for these) and were approved for
review.

## Out of scope (YAGNI)

- No sidebar/legend filter by fragment type.
- No badge for ground (explicitly unchanged).
- No change to fragment grouping, LOD tier, or the Monolith achievement-group
  linkage.

## Verification

- **tools:** after regeneration, spot-check `data/markers/World_L_A.json` (or any
  L-map with Verteron fragments) contains `fragmentType` on every `fragments`
  marker, with a plausible ground/air/water mix and no missing values.
- **frontend:** load a map with air + water fragments; confirm the dialog meta
  line shows the localized type; air markers show a green up-chevron, water a
  green down-chevron, ground none; incomplete fragments use the
  `UT_Marker_MonolithFragment` icon; marking one completed swaps it to the
  `_Complete` icon with no dim/check; and the air/water chevron stays visible in
  both the incomplete and completed states.
