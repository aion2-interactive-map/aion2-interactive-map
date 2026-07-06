# Pet/Creature Markers (from raw export, clustered) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit clustered pet/creature ("Pet") markers into `data/markers/<map>.json` by parsing the raw game export, so the existing (already-wired) `creature` category appears on the map.

**Architecture:** All work is in the `tools/` Python pipeline; the frontend and `data/types.json` are unchanged. A new `creatures.py` module joins `VehicleList → Item → NpcLoot` to map each tameable creature's source NPC to a pet (CreatureType → one of 5 subtypes + localized name), collects that NPC's spawn positions from the map's `SpawnInfoList`, transforms them world→pixel with the existing `WorldMapTransform`, and clusters them per pet (deterministic greedy, 200px). `extract.py` appends the results to its `WorldMarkers` list; `emit_frontend.py` routes the 5 creature kinds to the `creature` category.

**Tech Stack:** Python 3.11, `uv`, pytest. Run everything from `E:/aion2-map/tools` (its `__init__.py` calls `load_dotenv()`, so `tools/.env` → `RAW_DATA_PATH=E:/Exports/AION2/Content` is loaded automatically).

---

## File Structure

- **Create** `tools/aion2/tools/maps/creatures.py` — the pet pipeline: `CREATURE_TYPE_TO_SUBTYPE`, `build_pet_source_index`, `cluster_points`, `build_creature_markers`. Pure functions (no file IO), so unit-testable with fixtures.
- **Modify** `tools/aion2/tools/maps/extract.py` — add a cached `_pet_source_index()` and append `build_creature_markers(...)` output to `world_markers`; add a `crea` column to the `main()` summary.
- **Modify** `tools/aion2/tools/maps/emit_frontend.py` — add the 5 `creature*` kinds to `WORLD_MARKER_CATEGORY` and `WORLD_MARKER_TIER`, and add a `creature` locale branch in `build_markers` (description = "N spawn points").
- **Create** `tools/tests/maps/test_creatures.py` — unit tests for the join + clusterer + orchestrator, plus one integration test against the real export.
- **Regenerate (data repo)** `data/markers/World_L_A.json` (+ `World_D_A.json`) and their locale files via the extract→emit steps.

## Prerequisites

- All `uv`/`pytest`/`git` commands run from `E:/aion2-map/tools` unless noted.
- The `tools/` repo may not have a git identity set. If a `git commit` fails with "unable to auto-detect email address", run once:
  ```bash
  git -C E:/aion2-map/tools config user.name "Liu Yihao"
  git -C E:/aion2-map/tools config user.email "liuyh970615@gmail.com"
  ```
- `data/` is a **separate** git repo from `tools/`; its regenerated files are committed separately (Task 6).

---

### Task 1: CreatureType→subtype map + `build_pet_source_index`

**Files:**
- Create: `tools/aion2/tools/maps/creatures.py`
- Test: `tools/tests/maps/test_creatures.py`

- [ ] **Step 1: Write the failing test**

Create `tools/tests/maps/test_creatures.py`:

```python
from aion2.tools.maps.creatures import build_pet_source_index


def test_build_pet_source_index_maps_npc_to_subtype_and_name():
    vehicle_list = [
        {"Name": "KrallReg_01", "CreatureType": "ECreatureType::Intellect",
         "SoulItemName": "VehicleSoul_KrallReg_01", "Desc": {"Key": "str_veh_KrallReg_01"}},
        # shop/Special pet (no soul item) must be skipped:
        {"Name": "BlackDragon_01", "CreatureType": "ECreatureType::Special",
         "SoulItemName": "None", "Desc": {"Key": "str_veh_BlackDragon_01"}},
    ]
    item_table = [{"Name": "VehicleSoul_KrallReg_01", "ID": {"Value": 534660001}}]
    npc_loot = [
        {"NpcId": {"Value": 2100075}, "VehicleSoulItemId": {"Value": 534660001}},
        # NPC that drops no soul (VehicleSoulItemId 0) must be skipped:
        {"NpcId": {"Value": 9999}, "VehicleSoulItemId": {"Value": 0}},
    ]
    idx = build_pet_source_index(vehicle_list, item_table, npc_loot)
    assert set(idx.keys()) == {2100075}
    assert idx[2100075]["subtype"] == "creatureIntellect"
    assert idx[2100075]["descKey"] == "str_veh_KrallReg_01"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /e/aion2-map/tools && uv run pytest tests/maps/test_creatures.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'aion2.tools.maps.creatures'`

- [ ] **Step 3: Write minimal implementation**

Create `tools/aion2/tools/maps/creatures.py`:

```python
"""Pet/creature ("Pet" category) markers, derived purely from the raw export.

Pets are Vehicle Creatures. Each pet's source creature is an NPC that drops the
pet's "Vehicle Soul" item; that NPC's world spawns are where you obtain the pet.
This module joins VehicleList -> Item -> NpcLoot to map source NpcId -> pet
(CreatureType subtype + localized name), then clusters the NPC's spawn positions
per pet so the map isn't flooded with one marker per spawn point.

All functions are pure (no file IO); callers pass in already-loaded tables, a
WorldMapTransform, and an L10N resolver.
"""
from __future__ import annotations

# ECreatureType::<T> -> the data/types.json subtype key (already defined there).
CREATURE_TYPE_TO_SUBTYPE = {
    "Intellect": "creatureIntellect",
    "Feral": "creatureFeral",
    "Nature": "creatureNature",
    "Trans": "creatureTrans",
    "Special": "creatureSpecial",
}

# Per-pet spawn clustering radius, in map pixels (the world maps are 8192px).
CLUSTER_RADIUS = 200.0


def build_pet_source_index(vehicle_list, item_table, npc_loot):
    """Map each tameable creature's source ``NpcId`` to its pet.

    Args are the raw ``Properties.Data`` lists of ``VehicleList.json``,
    ``Item.json`` and ``NpcLoot.json``.

    Returns ``{npc_id: {"subtype", "descKey", "petName"}}``. Pets with
    ``SoulItemName == "None"`` (shop/Special pets) and NPCs whose
    ``VehicleSoulItemId`` matches no pet soul are omitted.
    """
    item_id_by_name = {it["Name"]: it["ID"]["Value"] for it in item_table}

    pet_by_soul_id: dict[int, dict] = {}
    for v in vehicle_list:
        soul_name = v.get("SoulItemName")
        if not soul_name or soul_name == "None":
            continue
        soul_id = item_id_by_name.get(soul_name)
        if soul_id is None:
            continue
        ctype = str(v.get("CreatureType", "")).split("::")[-1]
        subtype = CREATURE_TYPE_TO_SUBTYPE.get(ctype)
        if not subtype:
            continue
        pet_by_soul_id[soul_id] = {
            "subtype": subtype,
            "descKey": (v.get("Desc") or {}).get("Key", ""),
            "petName": v.get("Name", ""),
        }

    index: dict[int, dict] = {}
    for row in npc_loot:
        soul_id = (row.get("VehicleSoulItemId") or {}).get("Value")
        meta = pet_by_soul_id.get(soul_id)
        if meta is not None:
            index[row["NpcId"]["Value"]] = meta
    return index
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /e/aion2-map/tools && uv run pytest tests/maps/test_creatures.py -v`
Expected: PASS (1 passed)

- [ ] **Step 5: Commit**

```bash
cd /e/aion2-map/tools
git add aion2/tools/maps/creatures.py tests/maps/test_creatures.py
git commit -m "feat(maps): pet source-NPC index from VehicleList/Item/NpcLoot"
```

---

### Task 2: Deterministic clustering (`cluster_points`)

**Files:**
- Modify: `tools/aion2/tools/maps/creatures.py`
- Test: `tools/tests/maps/test_creatures.py`

- [ ] **Step 1: Write the failing test**

Append to `tools/tests/maps/test_creatures.py`:

```python
from aion2.tools.maps.creatures import cluster_points


def test_cluster_points_groups_within_radius():
    # two tight groups; radius 200 keeps them separate
    pts = [(0, 0), (50, 0), (0, 50), (1000, 1000), (1000, 1050)]
    out = cluster_points(pts, 200)
    assert len(out) == 2
    assert sorted(c["count"] for c in out) == [2, 3]
    # every cluster carries a centroid
    assert all("x" in c and "y" in c for c in out)


def test_cluster_points_deterministic_regardless_of_order():
    a = cluster_points([(0, 0), (10, 0), (1000, 0)], 200)
    b = cluster_points([(1000, 0), (10, 0), (0, 0)], 200)
    assert a == b


def test_cluster_points_empty():
    assert cluster_points([], 200) == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /e/aion2-map/tools && uv run pytest tests/maps/test_creatures.py -v`
Expected: FAIL — `ImportError: cannot import name 'cluster_points'`

- [ ] **Step 3: Write minimal implementation**

Append to `tools/aion2/tools/maps/creatures.py`:

```python
def cluster_points(points, radius):
    """Deterministic greedy clustering of ``(x, y)`` points.

    Sorts the points first (so the result is independent of input order), then
    merges each point into the first existing cluster whose running centroid is
    within ``radius``; otherwise it starts a new cluster.

    Returns ``[{"x", "y", "count"}]`` with centroids rounded to 2 decimals.
    """
    r2 = radius * radius
    clusters: list[dict] = []  # each: {"sx", "sy", "n"}
    for x, y in sorted(points):
        placed = False
        for c in clusters:
            cx = c["sx"] / c["n"]
            cy = c["sy"] / c["n"]
            if (cx - x) ** 2 + (cy - y) ** 2 <= r2:
                c["sx"] += x
                c["sy"] += y
                c["n"] += 1
                placed = True
                break
        if not placed:
            clusters.append({"sx": x, "sy": y, "n": 1})
    return [
        {"x": round(c["sx"] / c["n"], 2), "y": round(c["sy"] / c["n"], 2), "count": c["n"]}
        for c in clusters
    ]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /e/aion2-map/tools && uv run pytest tests/maps/test_creatures.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
cd /e/aion2-map/tools
git add aion2/tools/maps/creatures.py tests/maps/test_creatures.py
git commit -m "feat(maps): deterministic greedy point clustering"
```

---

### Task 3: Orchestrator (`build_creature_markers`)

**Files:**
- Modify: `tools/aion2/tools/maps/creatures.py`
- Test: `tools/tests/maps/test_creatures.py`

- [ ] **Step 1: Write the failing test**

Append to `tools/tests/maps/test_creatures.py`:

```python
from aion2.tools.maps.creatures import build_creature_markers


class _FakeTransform:
    def world_to_pixel(self, x, y):
        return (x, y)  # identity, so pixel == world for easy assertions


class _FakeL10N:
    def en(self, key):
        return {"str_veh_A": "PetA"}.get(key, "")

    def zh_cn(self, key):
        return {"str_veh_A": "宠物A"}.get(key, "")


def test_build_creature_markers_clusters_per_pet():
    index = {100: {"subtype": "creatureFeral", "descKey": "str_veh_A", "petName": "A"}}
    spawn = [
        {"NpcIdList": [{"Value": 100}],
         "Positions": [{"Location": {"X": 0, "Y": 0}}, {"Location": {"X": 40, "Y": 0}}]},
        {"NpcIdList": [{"Value": 100}],
         "Positions": [{"Location": {"X": 3000, "Y": 3000}}]},
        # NPC not in the index contributes nothing:
        {"NpcIdList": [{"Value": 777}], "Positions": [{"Location": {"X": 5, "Y": 5}}]},
    ]
    out = build_creature_markers(spawn, _FakeTransform(), index, _FakeL10N(), radius=200)
    assert len(out) == 2  # (0,0)+(40,0) merge; (3000,3000) separate
    assert all(m["kind"] == "creatureFeral" for m in out)
    assert all(m["name_en"] == "PetA" and m["name_zhCN"] == "宠物A" for m in out)
    assert sorted(m["count"] for m in out) == [1, 2]
    assert all(isinstance(m["px"], list) and len(m["px"]) == 2 for m in out)


def test_build_creature_markers_no_transform_returns_empty():
    index = {100: {"subtype": "creatureFeral", "descKey": "str_veh_A", "petName": "A"}}
    spawn = [{"NpcIdList": [{"Value": 100}], "Positions": [{"Location": {"X": 0, "Y": 0}}]}]
    assert build_creature_markers(spawn, None, index, _FakeL10N()) == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /e/aion2-map/tools && uv run pytest tests/maps/test_creatures.py -v`
Expected: FAIL — `ImportError: cannot import name 'build_creature_markers'`

- [ ] **Step 3: Write minimal implementation**

Append to `tools/aion2/tools/maps/creatures.py`:

```python
def _ids(lst):
    return [x.get("Value") if isinstance(x, dict) else x for x in lst]


def build_creature_markers(spawn_info_list, transform, index, l10n, radius=CLUSTER_RADIUS):
    """Build clustered creature WorldMarker dicts for one map.

    Pools every source NPC's spawn positions per pet (keyed by the pet's
    ``descKey``), transforms them world->pixel, and clusters each pet's points.
    Returns dicts shaped like the other ``WorldMarkers`` plus a ``count``:
    ``{"kind", "name_en", "name_zhCN", "Location": None, "px": [x, y], "count"}``.
    Returns ``[]`` when there is no transform or empty index.
    """
    if transform is None or not index:
        return []

    pet_points: dict[str, list] = {}  # descKey -> [(px, py), ...]
    pet_meta: dict[str, dict] = {}    # descKey -> {"subtype", "descKey", "petName"}
    for s in spawn_info_list:
        metas = [index[n] for n in _ids(s.get("NpcIdList", [])) if n in index]
        if not metas:
            continue
        positions = s.get("Positions") or []
        if not positions:
            continue
        pxs = []
        for p in positions:
            loc = p["Location"]
            pxs.append(transform.world_to_pixel(loc["X"], loc["Y"]))
        for meta in metas:
            key = meta["descKey"]
            pet_points.setdefault(key, []).extend(pxs)
            pet_meta[key] = meta

    markers: list[dict] = []
    for key in sorted(pet_points):  # deterministic output order
        meta = pet_meta[key]
        name_en = l10n.en(key)
        name_zh = l10n.zh_cn(key)
        for c in cluster_points(pet_points[key], radius):
            markers.append({
                "kind": meta["subtype"],
                "name_en": name_en,
                "name_zhCN": name_zh,
                "Location": None,
                "px": [c["x"], c["y"]],
                "count": c["count"],
            })
    return markers
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /e/aion2-map/tools && uv run pytest tests/maps/test_creatures.py -v`
Expected: PASS (6 passed)

- [ ] **Step 5: Commit**

```bash
cd /e/aion2-map/tools
git add aion2/tools/maps/creatures.py tests/maps/test_creatures.py
git commit -m "feat(maps): build clustered creature markers per pet"
```

---

### Task 4: Wire creatures into `extract.py` (+ integration test)

**Files:**
- Modify: `tools/aion2/tools/maps/extract.py` (import ~L31; new cached fn near ~L210; append after the `world_markers` loop ~L692; summary ~L712–731)
- Test: `tools/tests/maps/test_creatures.py`

- [ ] **Step 1: Write the failing integration test**

Append to `tools/tests/maps/test_creatures.py`:

```python
def test_extract_world_l_a_emits_creature_markers():
    """Integration: parse the real World_L_A export and check creature markers.

    Requires the raw export (RAW_DATA_PATH from tools/.env, loaded by
    aion2.tools.__init__). The expected count band is wide because the
    deterministic (sorted) clusterer differs slightly from exploratory counts.
    """
    from aion2.tools.maps.extract import extract_map
    from aion2.tools.maps.l10n import L10N

    data = extract_map("World_L_A", L10N())
    creatures = [w for w in data["WorldMarkers"] if str(w["kind"]).startswith("creature")]
    assert 250 <= len(creatures) <= 500
    assert {w["kind"] for w in creatures} <= {
        "creatureIntellect", "creatureFeral", "creatureNature",
        "creatureTrans", "creatureSpecial",
    }
    for w in creatures:
        assert w["px"] and 0 <= w["px"][0] <= 8192 and 0 <= w["px"][1] <= 8192
        assert w["name_en"]      # localized pet name, non-empty
        assert w["count"] >= 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /e/aion2-map/tools && uv run pytest tests/maps/test_creatures.py::test_extract_world_l_a_emits_creature_markers -v`
Expected: FAIL — `assert 0 ... ` (no creature markers yet; `extract.py` doesn't emit them)

- [ ] **Step 3a: Add the import**

In `tools/aion2/tools/maps/extract.py`, after line 31 (`from .worldmap import WorldMapMeta`), add:

```python
from .creatures import build_creature_markers, build_pet_source_index
```

- [ ] **Step 3b: Add a cached pet-source index**

In `tools/aion2/tools/maps/extract.py`, after the `_npc_index()` function (ends ~L209), add:

```python
@lru_cache(maxsize=None)
def _pet_source_index():
    """Source NpcId -> pet (subtype + name keys). Static across maps; cached."""
    return build_pet_source_index(
        _table("VehicleList.json"), _table("Item.json"), _table("NpcLoot.json")
    )
```

- [ ] **Step 3c: Append creature markers after the world-markers loop**

In `extract_map`, immediately **before** the `return {` (~L694), add:

```python
    # ---- 5. creature/pet markers: tameable-creature spawns, clustered per pet.
    #         Source NPC -> pet (CreatureType subtype + localized name) via
    #         VehicleList/Item/NpcLoot; positions from this map's SpawnInfoList,
    #         transformed with the SAME WorldMapTransform, clustered at 200px.
    world_markers.extend(
        build_creature_markers(
            md["Properties"]["Data"].get("SpawnInfoList", []),
            transform,
            _pet_source_index(),
            l10n,
        )
    )

```

- [ ] **Step 3d: Add a `crea` column to the `main()` summary**

In `main()`, the header line (~L712–714) currently ends with `{'boss':>5s}")`. Change that ending to:

```python
           f"{'gath':>6s}{'occ':>5s}{'dgn':>5s}{'boss':>5s}{'crea':>6s}")
```

The `kc` dict (~L725–727) — add a creature total right after it:

```python
        kc = {k: sum(1 for w in wm if w["kind"] == k)
              for k in ("teleport", "seal", "hiddenCube", "gathering", "occupation",
                        "dungeon", "boss")}
        kc["creature"] = sum(1 for w in wm if str(w["kind"]).startswith("creature"))
```

The print's final line (~L730–731) currently ends with `{kc['boss']:>5d}")`. Change that ending to:

```python
              f"{kc['gathering']:>6d}{kc['occupation']:>5d}{kc['dungeon']:>5d}{kc['boss']:>5d}{kc['creature']:>6d}")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /e/aion2-map/tools && uv run pytest tests/maps/test_creatures.py -v`
Expected: PASS (7 passed). The integration test is slower (parses the full map); allow up to a minute.

- [ ] **Step 5: Commit**

```bash
cd /e/aion2-map/tools
git add aion2/tools/maps/extract.py tests/maps/test_creatures.py
git commit -m "feat(maps): emit clustered creature markers from extract"
```

---

### Task 5: Route creature kinds in `emit_frontend.py`

**Files:**
- Modify: `tools/aion2/tools/maps/emit_frontend.py` (`WORLD_MARKER_CATEGORY` ~L122–129; `WORLD_MARKER_TIER` ~L137–145; `build_markers` locale branch ~L448–463)
- Test: `tools/tests/maps/test_creatures.py`

- [ ] **Step 1: Write the failing test**

Append to `tools/tests/maps/test_creatures.py`:

```python
def test_emit_frontend_routes_creature_marker():
    from aion2.tools.maps.emit_frontend import build_markers

    map_data = {
        "Name": "TestMap",
        "WorldMarkers": [
            {"kind": "creatureFeral", "px": [100.0, 200.0],
             "name_en": "Fossa", "name_zhCN": "波沙", "count": 7},
        ],
    }
    markers, locale = build_markers(map_data)
    m = next(m for m in markers if m["subtype"] == "creatureFeral")
    assert m["category"] == "creature"
    assert m["tier"] == 3
    assert m["x"] == 100.0 and m["y"] == 200.0
    assert locale[m["id"]]["name_en"] == "Fossa"
    assert locale[m["id"]]["desc_en"] == "7 spawn points"
    assert locale[m["id"]]["desc_zhCN"] == "7 处刷新点"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /e/aion2-map/tools && uv run pytest tests/maps/test_creatures.py::test_emit_frontend_routes_creature_marker -v`
Expected: FAIL — the creature kind has no category, so `build_markers` skips it (`StopIteration` from `next(...)`).

- [ ] **Step 3a: Add creature kinds to `WORLD_MARKER_CATEGORY`**

In `tools/aion2/tools/maps/emit_frontend.py`, replace the `WORLD_MARKER_CATEGORY` dict (~L122–129) with:

```python
WORLD_MARKER_CATEGORY = {
    "teleport": "location",
    "seal": "location",
    "occupation": "location",
    "hiddenCube": "collection",
    "dungeon": "location",
    "boss": "location",
    "creatureIntellect": "creature",
    "creatureFeral": "creature",
    "creatureNature": "creature",
    "creatureTrans": "creature",
    "creatureSpecial": "creature",
}
```

- [ ] **Step 3b: Add creature tiers to `WORLD_MARKER_TIER`**

In the `WORLD_MARKER_TIER` dict (~L137–145), add these entries before the closing `}` (after `"gathering": 3,`):

```python
    "creatureIntellect": 3,
    "creatureFeral": 3,
    "creatureNature": 3,
    "creatureTrans": 3,
    "creatureSpecial": 3,
```

- [ ] **Step 3c: Add the creature locale branch in `build_markers`**

In `build_markers`, the world-markers block has an `if subtype == "hiddenCube": ... else: ...` for the locale entry (~L448–463). Insert a `creature` branch **between** them, so it reads:

```python
        if subtype == "hiddenCube":
            # Title = subtype label ("隐藏背包"); the cube has no region, so the
            # description is just its running number ("#1").
            cube_names = EXTRA_SUBTYPE_NAMES["hiddenCube"]
            locale[mid] = {
                "name_en": cube_names["en"],
                "name_zhCN": cube_names["zhCN"],
                "name_zhTW": cube_names["zhTW"],
                "desc_en": f"#{idx + 1}",
                "desc_zhCN": f"#{idx + 1}",
            }
        elif category == "creature":
            # Title = the localized pet name; description = how many spawn points
            # this cluster merged (so clustering isn't silently lossy).
            cnt = w.get("count", 1)
            locale[mid] = {
                "name_en": w.get("name_en", "") or str(idx + 1),
                "name_zhCN": w.get("name_zhCN", "") or str(idx + 1),
                "desc_en": f"{cnt} spawn points",
                "desc_zhCN": f"{cnt} 处刷新点",
            }
        else:
            locale[mid] = {
                "name_en": w.get("name_en", "") or str(idx + 1),
                "name_zhCN": w.get("name_zhCN", "") or str(idx + 1),
            }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /e/aion2-map/tools && uv run pytest tests/maps/test_creatures.py -v`
Expected: PASS (8 passed)

- [ ] **Step 5: Commit**

```bash
cd /e/aion2-map/tools
git add aion2/tools/maps/emit_frontend.py tests/maps/test_creatures.py
git commit -m "feat(maps): route creature kinds to the creature category"
```

---

### Task 6: Regenerate data + verify (World_L_A, then World_D_A)

**Files:**
- Regenerate (in the `data/` repo): `data/markers/World_L_A.json`, `data/markers/World_D_A.json`, and `data/locales/<lng>/markers/World_{L,D}_A.json`.

- [ ] **Step 1: Run the extract step (regenerates parsed_data for all requested maps)**

Run: `cd /e/aion2-map/tools && uv run python -m aion2.tools.maps.extract`
Expected: the summary table prints a non-zero `crea` column for `World_L_A` and `World_D_A` (a few hundred each).

- [ ] **Step 2: Emit World_L_A only**

Run: `cd /e/aion2-map/tools && uv run python -m aion2.tools.maps.emit_frontend --map World_L_A`
Expected: prints `World_L_A: <N> markers {... 'creatureFeral': .., 'creatureIntellect': ..}, <R> regions`.

- [ ] **Step 3: Verify the emitted World_L_A data**

Run:
```bash
cd /e/aion2-map
node -e 'const m=require("./data/markers/World_L_A.json").markers;const c=m.filter(x=>x.subtype.startsWith("creature"));const by={};c.forEach(x=>by[x.subtype]=(by[x.subtype]||0)+1);console.log("creature markers:",c.length,by);console.log("sample:",JSON.stringify(c[0]));const loc=require("./data/locales/en/markers/World_L_A.json");console.log("name/desc:",loc[c[0].id]);'
```
Expected: `creature markers: ~250–500`, a `subtype`→count breakdown across the 5 types, a sample marker with `category:"creature"`, numeric `x`/`y`, `tier:3`, and a locale entry with a real pet name + "N spawn points" description.

- [ ] **Step 4: Commit the World_L_A data (separate `data/` repo)**

```bash
cd /e/aion2-map/data
git add markers/World_L_A.json locales/en/markers/World_L_A.json locales/zh-CN/markers/World_L_A.json locales/zh-TW/markers/World_L_A.json
git commit -m "data: add clustered pet/creature markers for World_L_A"
```

- [ ] **Step 5: Live-verify World_L_A, then extend to World_D_A**

- Per `CLAUDE.md`'s live-testing convention, run the frontend, open World_L_A, toggle the **Pet** category on, and confirm the five subtypes appear with counts and render as circular type-icon pins that obey LOD/zoom.
- Once confirmed, emit and commit World_D_A:
  ```bash
  cd /e/aion2-map/tools && uv run python -m aion2.tools.maps.emit_frontend --map World_D_A
  cd /e/aion2-map/data
  git add markers/World_D_A.json locales/en/markers/World_D_A.json locales/zh-CN/markers/World_D_A.json locales/zh-TW/markers/World_D_A.json
  git commit -m "data: add clustered pet/creature markers for World_D_A"
  ```

---

## Self-Review

**1. Spec coverage:**
- Data chain (VehicleList→Item→NpcLoot→SpawnInfoList) → Task 1 (join) + Task 3/4 (positions). ✓
- CreatureType→5 subtypes → Task 1 (`CREATURE_TYPE_TO_SUBTYPE`). ✓
- 200px per-pet clustering, deterministic → Task 2 + Task 3. ✓
- New `creatures.py` module + `extract.py`/`emit_frontend.py` touch-points → Tasks 1–5. ✓
- Names via L10N (`str_veh_*`), description = "N spawn points" → Task 3 + Task 5. ✓
- No frontend/types.yaml/icon changes → none in plan. ✓
- World_L_A first then World_D_A → Task 6. ✓
- Edge cases (shop pets `SoulItemName:"None"`, NPCs with no soul, no transform) → Task 1 & 3 tests. ✓
- TDD test plan (index, clusterer, integration) → every task is test-first. ✓

**2. Placeholder scan:** No TBD/TODO; every code/command step has concrete content. ✓

**3. Type consistency:** `build_pet_source_index` returns `{npc_id: {"subtype","descKey","petName"}}`, consumed by `build_creature_markers` (reads `["subtype"]`, `["descKey"]`). `cluster_points` returns `{"x","y","count"}`, consumed by `build_creature_markers` (reads `["x"]/["y"]/["count"]`). `build_creature_markers` returns `{"kind","name_en","name_zhCN","px","count",...}`, consumed by `emit_frontend.build_markers` (reads `kind`/`px`/`name_en`/`name_zhCN`/`count`). `kind` values (`creatureFeral` etc.) match the keys added to `WORLD_MARKER_CATEGORY`/`WORLD_MARKER_TIER`. ✓
