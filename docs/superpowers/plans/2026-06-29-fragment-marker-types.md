# Fragment Marker Types (ground / air / water) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distinguish the three god-fragment kinds (ground / air / water) — derive the kind in `tools`, carry it through `data/`, show it in the marker dialog, badge air/water markers with a green chevron, and render fragment completion with the real game icon-swap.

**Architecture:** `tools` classify each fragment from its `EnvObj` `Name` suffix and emit a `fragmentType` field plus real fragment icons (`UT_Marker_MonolithFragment` + `_Complete`). The frontend renders: appends the localized type to the dialog meta line, draws a green `ChevronUp`/`ChevronDown` badge for air/water, and swaps to the `_Complete` icon for completed fragments (no dim/check), which frees the corner so the badge shows in both states.

**Tech Stack:** Python (uv) for the `tools` pipeline + pytest assertions on the generated `data/` repo; React 19 / TypeScript / Leaflet / lucide-react / i18next (YAML) for the frontend. Frontend has no unit-test runner — verification is `tsc -b` + `eslint` + a manual visual check.

**Repos touched (each commits independently):** `tools/` (extract/emit/types/test), `data/` (regenerated artifacts), `frontend/` (types/render/locales). Run every `git` command inside the relevant sub-repo.

---

## File Structure

**`tools/` repo**
- Modify `tools/aion2/tools/maps/extract.py` — add `_envobj_name_by_id()` + `_fragment_type()`; tag each fragment with `"Type"`.
- Modify `tools/aion2/tools/maps/emit_frontend.py` — emit `fragmentType` on the fragment marker.
- Modify `tools/data_src/types.yaml` — `fragments` subtype: real icon + `iconComplete`.
- Modify `tools/aion2/tests/test_generated_maps_data.py` — assert on regenerated `fragmentType`.

**`data/` repo** (generated; do not hand-edit)
- Regenerated `data/markers/{World_L_A,World_D_A,Abyss_Reshanta_A,Abyss_Reshanta_B,Abyss_Reshanta_C}.json` and `data/types.json`.

**`frontend/` repo**
- Modify `frontend/src/types/game.ts` — `MarkerInstance.fragmentType`, `MarkerTypeSubtype.iconComplete`.
- Modify `frontend/src/features/map/canvas/markerIcons.tsx` — chevron badge param.
- Modify `frontend/src/features/map/canvas/GameMarker.tsx` — icon-swap completion + pass `fragmentType`.
- Modify `frontend/src/features/map/popup/MarkerPopupContent.tsx` — append type to meta line.
- Modify `frontend/public/locales/{en,zh-CN,zh-TW}/common.yaml` — `fragmentType` labels.

---

## Task 1: tools — classify each fragment by EnvObj name

**Files:**
- Modify: `tools/aion2/tools/maps/extract.py` (helpers after ~L85; fragments loop ~L450-456)

- [ ] **Step 1: Add the name lookup + classifier helpers**

In `tools/aion2/tools/maps/extract.py`, immediately after the `_godfragment_env_ids()` function (which ends around line 85), add:

```python
@lru_cache(maxsize=None)
def _envobj_name_by_id() -> dict:
    return {
        e["ID"]["Value"]: (e.get("Name", "") or "")
        for e in _table("EnvObjData.json")
    }


def _fragment_type(env_id: int) -> str:
    """Classify a god fragment by its EnvObj `Name` suffix.

    Names look like `E_L1_Verteron_fragment_Air` / `_Water` / `_Ground`. The
    untyped "HQ" fragments (no suffix) fold into `ground`.
    """
    name = _envobj_name_by_id().get(env_id, "").lower()
    if name.endswith("_air"):
        return "air"
    if name.endswith("_water"):
        return "water"
    return "ground"
```

- [ ] **Step 2: Tag each fragment with its type**

In the god-fragment loop (~L450), replace this block:

```python
        grp = spawn2grp.get(s["Name"])
        loc = s["Positions"][0]["Location"]
        loc3 = [round(loc["X"], 2), round(loc["Y"], 2), round(loc["Z"], 2)]
        fragments.append({
            "Name": s["Name"],
            "EnvObjId": _ids(s["EnvObjIdList"])[0],
            "GroupName": grp,
            "Location": loc3,
            "px": to_px(loc3),
        })
```

with:

```python
        grp = spawn2grp.get(s["Name"])
        loc = s["Positions"][0]["Location"]
        loc3 = [round(loc["X"], 2), round(loc["Y"], 2), round(loc["Z"], 2)]
        env_id = _ids(s["EnvObjIdList"])[0]
        fragments.append({
            "Name": s["Name"],
            "EnvObjId": env_id,
            "GroupName": grp,
            "Location": loc3,
            "px": to_px(loc3),
            "Type": _fragment_type(env_id),
        })
```

- [ ] **Step 3: Sanity-check the classifier compiles + runs**

Run (from `tools/`):

```bash
cd /g/NCSoft/aion2-map/tools && uv run python -c "from aion2.tools.maps.extract import _fragment_type, _envobj_name_by_id; print(_fragment_type(1200865), _fragment_type(1200868), _fragment_type(1200860), _fragment_type(1201290))"
```

Expected: `air water ground ground` (the last is the untyped HQ fragment `E_L1_HQ_GodFragment_01` → ground).

- [ ] **Step 4: Commit (tools repo)**

```bash
cd /g/NCSoft/aion2-map/tools && git add aion2/tools/maps/extract.py && git commit -m "feat(maps): classify god fragments as ground/air/water from EnvObj name"
```

---

## Task 2: tools — emit `fragmentType` on the marker

**Files:**
- Modify: `tools/aion2/tools/maps/emit_frontend.py` (fragments block ~L341-352)

- [ ] **Step 1: Add `fragmentType` to the emitted fragment marker**

In `build_markers`, the fragments block appends a marker dict (~L341). Replace:

```python
        markers.append({
            "id": mid,
            "category": "collection",
            "subtype": subtype,
            "region": region_key,
            "x": _round2(px[0]),
            "y": _round2(px[1]),
            "tier": FRAGMENTS_TIER,
            "images": [],
            "contributors": [],
            "indexInSubtype": idx,
        })
```

with:

```python
        markers.append({
            "id": mid,
            "category": "collection",
            "subtype": subtype,
            "region": region_key,
            "x": _round2(px[0]),
            "y": _round2(px[1]),
            "tier": FRAGMENTS_TIER,
            "images": [],
            "contributors": [],
            "indexInSubtype": idx,
            "fragmentType": f.get("Type", "ground"),
        })
```

- [ ] **Step 2: Commit (tools repo)**

```bash
cd /g/NCSoft/aion2-map/tools && git add aion2/tools/maps/emit_frontend.py && git commit -m "feat(maps): emit fragmentType on fragment markers"
```

---

## Task 3: tools — real fragment icons (incomplete + completed)

**Files:**
- Modify: `tools/data_src/types.yaml` (`fragments` subtype ~L70-77)

- [ ] **Step 1: Swap the placeholder icon for the real game assets**

In `tools/data_src/types.yaml`, the `fragments` subtype currently reads:

```yaml
  - canComplete: true
    color: '#000000'
    hideTooltip: true
    icon: images/Monolith_Material_Light.webp
    iconScale: 1.0
    id: 8c336fdf-a1cd-4d9c-8b76-f6466bbb726e
    name: fragments
    order: 0
```

Replace it with:

```yaml
  - canComplete: true
    color: '#000000'
    hideTooltip: true
    icon: UI/Resource/Texture/Icon/UT_Marker_MonolithFragment.webp
    iconComplete: UI/Resource/Texture/Icon/UT_Marker_MonolithFragment_Complete.webp
    iconScale: 1.0
    id: 8c336fdf-a1cd-4d9c-8b76-f6466bbb726e
    name: fragments
    order: 0
```

- [ ] **Step 2: Confirm the referenced assets exist**

Run:

```bash
ls /g/NCSoft/aion2-map/resource/UI/Resource/Texture/Icon/UT_Marker_MonolithFragment.webp /g/NCSoft/aion2-map/resource/UI/Resource/Texture/Icon/UT_Marker_MonolithFragment_Complete.webp
```

Expected: both paths listed, no "No such file".

- [ ] **Step 3: Commit (tools repo)**

```bash
cd /g/NCSoft/aion2-map/tools && git add data_src/types.yaml && git commit -m "feat(maps): use real MonolithFragment marker icons (incomplete + complete)"
```

---

## Task 4: tools + data — regenerate dataset and verify

**Files:**
- Modify: `tools/aion2/tests/test_generated_maps_data.py` (append a test)
- Regenerate: `data/markers/*.json`, `data/types.json`

- [ ] **Step 1: Write the failing test (asserts on generated data)**

Append to `tools/aion2/tests/test_generated_maps_data.py`:

```python
def test_fragments_have_valid_type():
    markers = json.loads(
        (DATA / "markers" / "World_L_A.json").read_text(encoding="utf-8")
    )["markers"]
    frags = [m for m in markers if m["subtype"] == "fragments"]
    assert frags, "expected fragment markers in World_L_A"
    assert all(m.get("fragmentType") in {"ground", "air", "water"} for m in frags)
    # World_L_A (Verteron) spawns all three kinds (ground 390 / air 120 / water 50).
    assert {"air", "water", "ground"} <= {m["fragmentType"] for m in frags}


def test_fragments_subtype_uses_real_icons():
    types = json.loads((DATA / "types.json").read_text(encoding="utf-8"))
    sub = next(
        s
        for c in types["categories"]
        for s in c["subtypes"]
        if s["name"] == "fragments"
    )
    assert sub["icon"] == "UI/Resource/Texture/Icon/UT_Marker_MonolithFragment.webp"
    assert sub["iconComplete"] == "UI/Resource/Texture/Icon/UT_Marker_MonolithFragment_Complete.webp"
```

- [ ] **Step 2: Run the test against the CURRENT (stale) data to confirm it fails**

Run (from `tools/`):

```bash
cd /g/NCSoft/aion2-map/tools && uv run pytest aion2/tests/test_generated_maps_data.py::test_fragments_have_valid_type aion2/tests/test_generated_maps_data.py::test_fragments_subtype_uses_real_icons -v
```

Expected: both FAIL (current `data/` has no `fragmentType` and still uses the placeholder icon).

- [ ] **Step 3: Regenerate the dataset**

Run (from `tools/`):

```bash
cd /g/NCSoft/aion2-map/tools && uv run python -m aion2.tools.maps.extract && uv run python -m aion2.tools.maps.emit_frontend
```

Expected: the extract table prints a row per map (with a `fragments` count); the emit step prints `Emitted FRONTEND data to .../data`.

- [ ] **Step 4: Run the test again to confirm it passes**

Run:

```bash
cd /g/NCSoft/aion2-map/tools && uv run pytest aion2/tests/test_generated_maps_data.py -v
```

Expected: all tests PASS (including the two new ones).

- [ ] **Step 5: Spot-check the regenerated data**

Run:

```bash
cd /g/NCSoft/aion2-map && python -c "import json,collections; m=json.load(open('data/markers/World_L_A.json',encoding='utf-8'))['markers']; f=[x for x in m if x['subtype']=='fragments']; print('fragments:',len(f)); print(collections.Counter(x['fragmentType'] for x in f))"
```

Expected: every fragment has a valid `fragmentType` — a ground-dominant mix with **both** air and water present (roughly `{'ground': ~390, 'air': ~120, 'water': ~50}`; exact counts come from the pipeline). If `water` is 0 or any value is missing/`None`, stop and investigate before committing.

- [ ] **Step 6: Commit the test (tools repo)**

```bash
cd /g/NCSoft/aion2-map/tools && git add aion2/tests/test_generated_maps_data.py && git commit -m "test(maps): assert fragmentType + real fragment icons in generated data"
```

- [ ] **Step 7: Commit the regenerated dataset (data repo)**

```bash
cd /g/NCSoft/aion2-map/data && git add markers types.json && git commit -m "data: regenerate with fragmentType + real fragment icons"
```

---

## Task 5: frontend — type model

**Files:**
- Modify: `frontend/src/types/game.ts` (`MarkerInstance` ~L66-84; `MarkerTypeSubtype` ~L29-41)

- [ ] **Step 1: Add `fragmentType` to `MarkerInstance`**

In `frontend/src/types/game.ts`, inside `interface MarkerInstance`, after the `tier?: number;` field's closing (just before the interface's closing `}` at ~L84), add:

```ts
  /** For fragment markers: which physical kind (drives dialog text + icon badge). */
  fragmentType?: "ground" | "air" | "water";
```

- [ ] **Step 2: Add `iconComplete` to `MarkerTypeSubtype`**

In the same file, inside `interface MarkerTypeSubtype`, after the `icon?: string;` line (~L34), add:

```ts
  /** Icon shown when a marker of this subtype is completed (icon-swap
   *  completion, e.g. the game's MonolithFragment_Complete asset). When set,
   *  the generic dim + green check are suppressed for completed markers. */
  iconComplete?: string;
```

- [ ] **Step 3: Typecheck**

Run:

```bash
cd /g/NCSoft/aion2-map/frontend && npx tsc -b
```

Expected: no errors.

- [ ] **Step 4: Commit (frontend repo)**

```bash
cd /g/NCSoft/aion2-map/frontend && git add src/types/game.ts && git commit -m "feat(types): add MarkerInstance.fragmentType + MarkerTypeSubtype.iconComplete"
```

---

## Task 6: frontend — green air/water chevron badge

**Files:**
- Modify: `frontend/src/features/map/canvas/markerIcons.tsx` (import ~L2; signature ~L45-52; cache key ~L53; wrapper ~L155-167)

- [ ] **Step 1: Import the chevron icons**

In `frontend/src/features/map/canvas/markerIcons.tsx`, replace:

```tsx
import { CheckCircle } from "lucide-react";
```

with:

```tsx
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
```

- [ ] **Step 2: Add the `fragmentType` parameter**

Replace the `createPinIcon` signature:

```tsx
export function createPinIcon(
  innerIcon: string,
  iconScale: number,
  completed: boolean,
  variant: PinVariant = "image",
  innerColor: string = LANHU_PIN_DOT,
  selected: boolean = false,
): L.DivIcon {
  const cacheKey = `${variant}|${innerIcon}|${iconScale}|${completed ? 1 : 0}|${innerColor}|${selected ? 1 : 0}`;
```

with:

```tsx
export function createPinIcon(
  innerIcon: string,
  iconScale: number,
  completed: boolean,
  variant: PinVariant = "image",
  innerColor: string = LANHU_PIN_DOT,
  selected: boolean = false,
  fragmentType?: "ground" | "air" | "water",
): L.DivIcon {
  const cacheKey = `${variant}|${innerIcon}|${iconScale}|${completed ? 1 : 0}|${innerColor}|${selected ? 1 : 0}|${fragmentType ?? ""}`;
```

- [ ] **Step 3: Render the chevron in the icon wrapper**

In the `renderToString(...)` wrapper, replace:

```tsx
      {content}

      {completed && (
        <CheckCircle
          size={12}
          style={{
            position: "absolute",
            right: "-2px",
            bottom: "-2px",
            color: "#22c55e",
          }}
        />
      )}
```

with:

```tsx
      {content}

      {completed && (
        <CheckCircle
          size={12}
          style={{
            position: "absolute",
            right: "-2px",
            bottom: "-2px",
            color: "#22c55e",
          }}
        />
      )}

      {/* Air/water badge for fragments. Air = up, water = down; ground = none.
          Fragments use icon-swap completion (no green check), so this never
          collides with the CheckCircle above. */}
      {(fragmentType === "air" || fragmentType === "water") &&
        (fragmentType === "air" ? (
          <ChevronUp
            size={12}
            style={{
              position: "absolute",
              right: "-2px",
              bottom: "-2px",
              color: "#22c55e",
            }}
          />
        ) : (
          <ChevronDown
            size={12}
            style={{
              position: "absolute",
              right: "-2px",
              bottom: "-2px",
              color: "#22c55e",
            }}
          />
        ))}
```

- [ ] **Step 4: Typecheck**

Run:

```bash
cd /g/NCSoft/aion2-map/frontend && npx tsc -b
```

Expected: no errors. (`fragmentType` is optional, so existing callers still compile.)

- [ ] **Step 5: Commit (frontend repo)**

```bash
cd /g/NCSoft/aion2-map/frontend && git add src/features/map/canvas/markerIcons.tsx && git commit -m "feat(map): green up/down chevron badge for air/water fragments"
```

---

## Task 7: frontend — icon-swap completion + pass `fragmentType`

**Files:**
- Modify: `frontend/src/features/map/canvas/GameMarker.tsx` (icon resolution ~L60-85)

- [ ] **Step 1: Resolve the icon with completion-swap, and pass the fragment type**

In `frontend/src/features/map/canvas/GameMarker.tsx`, replace this block:

```tsx
  const rawIcon = marker.icon || sub?.icon || "";
  const innerIcon = parseIconUrl(rawIcon, selectedMap);
  let icon: L.DivIcon;
  if (category === "creature") {
    icon = createPinIcon(innerIcon, 0.9, isCompleted, "circular", undefined, selected);
  } else if (!rawIcon) {
    // No game icon for this subtype: fall back to the circular dot. Use the
    // subtype color as the inner dot when provided (non-black); otherwise the
    // default Lanhu blue is used.
    const dot =
      sub?.color && sub.color !== "#000000" ? sub.color : undefined;
    icon = createPinIcon(innerIcon, iconScale, isCompleted, "pin", dot, selected);
  } else {
    // Gathering nodes plus a few dense collection subtypes (fragments,
    // hiddenCube) render a touch smaller so dense clusters stay readable.
    const compact =
      category === "gathering" ||
      (!!sub?.name && COMPACT_SUBTYPES.has(sub.name));
    const imageScale = compact ? COMPACT_SCALE : iconScale;
    icon = createPinIcon(innerIcon, imageScale, isCompleted, "image", undefined, selected);
  }
```

with:

```tsx
  // Icon-swap completion: subtypes that define `iconComplete` (fragments) show
  // a dedicated "done" icon instead of the generic dim + green check. When we
  // swap, we pass `renderCompleted=false` so the icon itself conveys completion.
  const useIconSwap = isCompleted && !!sub?.iconComplete;
  const rawIcon =
    (useIconSwap ? sub?.iconComplete : marker.icon || sub?.icon) || "";
  const innerIcon = parseIconUrl(rawIcon, selectedMap);
  const renderCompleted = isCompleted && !useIconSwap;
  let icon: L.DivIcon;
  if (category === "creature") {
    icon = createPinIcon(innerIcon, 0.9, renderCompleted, "circular", undefined, selected);
  } else if (!rawIcon) {
    // No game icon for this subtype: fall back to the circular dot. Use the
    // subtype color as the inner dot when provided (non-black); otherwise the
    // default Lanhu blue is used.
    const dot =
      sub?.color && sub.color !== "#000000" ? sub.color : undefined;
    icon = createPinIcon(innerIcon, iconScale, renderCompleted, "pin", dot, selected);
  } else {
    // Gathering nodes plus a few dense collection subtypes (fragments,
    // hiddenCube) render a touch smaller so dense clusters stay readable.
    const compact =
      category === "gathering" ||
      (!!sub?.name && COMPACT_SUBTYPES.has(sub.name));
    const imageScale = compact ? COMPACT_SCALE : iconScale;
    icon = createPinIcon(
      innerIcon,
      imageScale,
      renderCompleted,
      "image",
      undefined,
      selected,
      marker.fragmentType,
    );
  }
```

- [ ] **Step 2: Typecheck**

Run:

```bash
cd /g/NCSoft/aion2-map/frontend && npx tsc -b
```

Expected: no errors.

- [ ] **Step 3: Commit (frontend repo)**

```bash
cd /g/NCSoft/aion2-map/frontend && git add src/features/map/canvas/GameMarker.tsx && git commit -m "feat(map): icon-swap completion for fragments + pass fragmentType to icon"
```

---

## Task 8: frontend — append type to the dialog meta line

**Files:**
- Modify: `frontend/src/features/map/popup/MarkerPopupContent.tsx` (meta build ~L34-41)

- [ ] **Step 1: Build the meta line with the localized fragment type**

In `frontend/src/features/map/popup/MarkerPopupContent.tsx`, replace:

```tsx
  const subtypeLabel = t(`types:subtypes.${marker.subtype}.name`, marker.subtype);
  const coords = `(${Math.round(marker.x)}, ${Math.round(marker.y)})`;
  const metaLine = [categoryLabel, subtypeLabel].filter(Boolean).join(" / ");
```

with:

```tsx
  const subtypeLabel = t(`types:subtypes.${marker.subtype}.name`, marker.subtype);
  const coords = `(${Math.round(marker.x)}, ${Math.round(marker.y)})`;
  // Fragment kind (ground/air/water) appended after the subtype, e.g.
  // "Collection / Monolith · Air".
  const fragmentTypeLabel = marker.fragmentType
    ? t(`common:fragmentType.${marker.fragmentType}`)
    : "";
  const metaLine = [
    [categoryLabel, subtypeLabel].filter(Boolean).join(" / "),
    fragmentTypeLabel,
  ]
    .filter(Boolean)
    .join(" · ");
```

(The JSX that renders `{metaLine}` followed by `{coords}` is unchanged.)

- [ ] **Step 2: Typecheck**

Run:

```bash
cd /g/NCSoft/aion2-map/frontend && npx tsc -b
```

Expected: no errors.

- [ ] **Step 3: Commit (frontend repo)**

```bash
cd /g/NCSoft/aion2-map/frontend && git add src/features/map/popup/MarkerPopupContent.tsx && git commit -m "feat(map): show fragment type in marker dialog meta line"
```

---

## Task 9: frontend — locale labels (en / zh-CN / zh-TW)

**Files:**
- Modify: `frontend/public/locales/en/common.yaml`
- Modify: `frontend/public/locales/zh-CN/common.yaml`
- Modify: `frontend/public/locales/zh-TW/common.yaml`

- [ ] **Step 1: Add the English labels**

In `frontend/public/locales/en/common.yaml`, after the `theme:` block (the three theme entries), add a new top-level block:

```yaml
fragmentType:
  ground: "Ground"
  air: "Air"
  water: "Water"
```

- [ ] **Step 2: Add the Simplified Chinese labels**

In `frontend/public/locales/zh-CN/common.yaml`, add the matching top-level block:

```yaml
fragmentType:
  ground: "地面"
  air: "空中"
  water: "水中"
```

- [ ] **Step 3: Add the Traditional Chinese labels**

In `frontend/public/locales/zh-TW/common.yaml`, add the matching top-level block:

```yaml
fragmentType:
  ground: "地面"
  air: "空中"
  water: "水中"
```

- [ ] **Step 4: Validate the YAML parses**

Run:

```bash
cd /g/NCSoft/aion2-map/frontend && python -c "import yaml; [print(l, yaml.safe_load(open(f'public/locales/{l}/common.yaml',encoding='utf-8'))['fragmentType']) for l in ['en','zh-CN','zh-TW']]"
```

Expected: three lines printing the `fragmentType` dict for each language (no YAML error).

- [ ] **Step 5: Commit (frontend repo)**

```bash
cd /g/NCSoft/aion2-map/frontend && git add public/locales/en/common.yaml public/locales/zh-CN/common.yaml public/locales/zh-TW/common.yaml && git commit -m "i18n: add fragmentType labels (ground/air/water)"
```

---

## Task 10: frontend — full check + manual visual verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck + lint the whole frontend**

Run:

```bash
cd /g/NCSoft/aion2-map/frontend && npx tsc -b && npm run lint
```

Expected: both succeed with no errors.

- [ ] **Step 2: Manual visual check (use the `verify` or `run` skill)**

Start the dev server and open `World_L_A` (Verteron, has all three kinds):

```bash
cd /g/NCSoft/aion2-map/frontend && npm run dev
```

Then in the browser confirm ALL of:
1. Fragment markers render with the `UT_Marker_MonolithFragment` icon (not the old placeholder).
2. An **air** fragment shows a small green up-chevron at the bottom-right; a **water** fragment shows a green down-chevron; a **ground** fragment shows neither.
3. Clicking a fragment opens the dialog and the meta line reads e.g. `Collection / Monolith · Air (x, y)`; switching language to 简体中文 shows `… · 空中`.
4. Marking a fragment completed swaps it to the `_Complete` icon with **no** 0.4 dim and **no** green check, and the air/water chevron **stays visible**.

- [ ] **Step 3: (Optional) capture a screenshot for the record**

If using the `verify` skill, capture the map with an air + water fragment visible and a completed one, to attach to the PR.

---

## Notes for the implementer

- **Three independent repos.** `tools/`, `data/`, and `frontend/` each have their own `.git`. Always `cd` into the sub-repo before `git add`/`commit` (the commands above already do). Do not stage across repos.
- **Regeneration scope.** `extract.py`'s `REQUESTED_MAPS` is `World_L_A, World_D_A, Abyss_Reshanta_A, Abyss_Reshanta_B, Abyss_Reshanta_C`, so only those five `markers/*.json` change, plus `types.json`. That is the expected `data/` diff.
- **No frontend unit runner.** Do not add vitest. Frontend verification is `tsc -b` + `eslint` + the manual check in Task 10, matching the existing project setup.
