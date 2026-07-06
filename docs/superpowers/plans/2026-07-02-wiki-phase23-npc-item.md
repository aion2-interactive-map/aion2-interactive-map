# Wiki Phases 2–3: NPC & Item Pages + Resolver Upgrades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Workspace override (CLAUDE.md):** implementation is delegated to **Codex via MCP**
> (`mcp__codex__codex` / `mcp__codex__codex-reply`); Claude reviews each task's diff and
> runs the verification commands itself. Work on feature branches **in place** (NOT
> worktrees — Vite dev proxies resolve sibling repos by relative path).

**Goal:** Complete the wiki: NPC pages (spawns, quest backlinks, drops), Item pages (grade/icon/stats, sources, backlinks), quest resolver upgrades (EnvObj index, volumes/move-points, FieldEvent, EnterSubZone region refs), and generalized hub/list/route plumbing.

**Architecture:** Same two-part pipeline as Phase 1. Part A (tools repo, Python): parse raw UE tables → emit `data/wiki/{npc,item}/<id>.json`, extended quest entities, per-type indexes, taxonomy + locale namespaces, sitemap. Part B (frontend): new types/loaders, `NpcPage`/`ItemPage`, `EmbeddedMap` region highlights, route dispatch by type, list/hub generalization. Design/i18n excellence pass is a separate plan-companion (executed after B; see tracker task #4).

**Tech Stack:** Python 3.13 + uv + pytest (tools) · React 19, TanStack Router, react-i18next, Tailwind v4, react-leaflet, Playwright (frontend).

**Branches:**
- `tools/`: `feature/wiki-npc-item` off `master`. Commands run from `E:/aion2-map/tools`.
- `frontend/`: `feature/wiki-npc-item` off `phase2/map-rebuild`. Commands from `E:/aion2-map/frontend`.
- `data/`: emitted output committed on default branch (generated artifact, no branch).

**Raw-data ground truth (probed 2026-07-02, `RAW_DATA_PATH=E:/Exports/AION2/Content`):**
- `NpcData.json` 13,440 rows: `ID:{Value}`, `Name`, `Desc:{Key}`, `Level`, `NpcType` (Monster/Citizen/Summon/Bot/Etc), `NpcSubType` (NormalMonster/EliteMonster/HeroMonster/LegendMonster/NormalCitizen/...), `bNamed`, `Grade`, `FunctionType`, `RelationshipEntity` (NPC_Light/NPC_Dark/Monster/...).
- `Item.json` 12,594 rows: `ID`, `Name`, `Desc:{Key}` (=display name), `DescLong:{Key}`, `IconRes`, `ItemLevel`, `ItemTier`, `ItemType` (Equip/Usable/Misc/Currency), `ItemGrade` (Common/Rare/Legend/Unique/Epic/Special/Mythic), `EquipCategory`/`UsableCategory`/`MiscCategory`, `ItemRace` (All/Light/Dark), `MainStats:[{Key:"EStat::…",Value}]`.
- `NpcLoot.json` 1,182 rows: `{NpcId:{Value}, LootList:[{Value:itemId}]}`.
- `ItemGetRoute.json` 10,821 rows keyed by `ItemId`: `MonsterGetRoutes:[{NpcId,…}]`, `CraftGetRoutes`, `GatherGetRoutes`, `QuestGetRoutes`, `NPCShopInfo`.
- `NpcTalk.json` 20,367 rows: `Name` (e.g. `NPCTalk_9120001_01_QuestAccept`), `SpeakerValue` (= NpcData.Name).
- `Table/FieldEvent.json` 76 rows: `Name`, `MapId`, `MarkerNpcList`, `MarkerEnvObjList`.
- `EnvObjData.json` 5,496 rows: `ID`, `Name`, `Usage`.
- `MapData.json` per map: `SpawnInfoList` (has **`EnvObjIdList`** — currently unused), `SubzoneVolumeInfoMap` (`{Value:{LabelName,Location,SubzoneTableId}}`), `TriggerActorDataMap` (`{Name,Location}`), `QuestMovePointDataMap` (`{LabelName,Location}`).
- `data/regions/<Map>.json`: `{regions:[{id:"2096", name, type, borders:[[[x,y],…]]}]}` — ids match `EnterSubZone` goal values.
- Item icons: `resource/UI/Resource/Texture/Item/{Accessory,Armor,BMShop,ETC,Weapon,Wing}/*.webp` (4,844 files). Map basename→relpath by scanning; NPC portraits do NOT exist (skip).

**Phase-1 baseline coverage (must not regress):** AskNpc 575/587, CloseNpc 14/14, KillNpc 426/1132, UseEnvObj 173/350, CollectItem 0/16.

---

# Part A — tools emitter

Setup once:
```bash
cd E:/aion2-map/tools && git checkout master && git pull --ff-only && git checkout -b feature/wiki-npc-item
```

### Task A1: Extend probe fixtures

**Files:**
- Modify: `aion2/tools/wiki/probe.py`
- Create (generated): `tests/wiki/fixtures/{item_sample,npcloot_sample,itemgetroute_sample,npctalk_sample,fieldevent_sample,envobj_sample,mapdata_points_sample}.json`

- [ ] **Step 1: Extend probe.py** — append to `main()` before the final `print`:

```python
    # --- Phase 2/3 fixtures ---
    items = _table("Item.json")
    _dump("item_sample.json", items[:6])

    loot = _table("NpcLoot.json")
    _dump("npcloot_sample.json", loot[:3])

    routes = _table("ItemGetRoute.json")
    sample_routes = [r for r in routes if r.get("MonsterGetRoutes")][:2] + \
        [r for r in routes if r.get("GatherGetRoutes")][:1] + \
        [r for r in routes if r.get("NPCShopInfo")][:1]
    _dump("itemgetroute_sample.json", sample_routes)

    talks = _table("NpcTalk.json")
    _dump("npctalk_sample.json", [t for t in talks if t.get("SpeakerValue")][:3])

    _dump("fieldevent_sample.json", _table("FieldEvent.json")[:3])

    envs = _table("EnvObjData.json")
    _dump("envobj_sample.json", envs[:3])

    d = md["Properties"]["Data"]
    _dump("mapdata_points_sample.json", {
        "SubzoneVolumeInfoMap": (d.get("SubzoneVolumeInfoMap") or [])[:2],
        "TriggerActorDataMap": (d.get("TriggerActorDataMap") or [])[:2],
        "QuestMovePointDataMap": (d.get("QuestMovePointDataMap") or [])[:2],
    })
    # SpawnInfo entries that carry EnvObjIdList (for env-obj index tests)
    env_spawns = [s for s in spawns if s.get("EnvObjIdList")][:5]
    _dump("spawninfo_env_sample.json", [
        {"Name": s.get("Name"), "EnvObjIdList": s.get("EnvObjIdList"),
         "Positions": (s.get("Positions") or [])[:1]}
        for s in env_spawns
    ])
```

Also inspect one `QuestStep` goal fixture: confirm the per-goal field name for move points (expected `QuestMovePointName`) by printing keys of a goal dict — add temporarily, note the real key in the commit message, remove the print.

- [ ] **Step 2: Run probe**

Run: `uv run python -m aion2.tools.wiki.probe`
Expected: `fixtures written to …` and the new files exist under `tests/wiki/fixtures/`.

- [ ] **Step 3: Sanity-check fixture shapes** (Read the JSON files; verify keys listed in ground-truth above; verify `QuestMovePointDataMap` entries have `Value.LabelName` + `Value.Location` or flat — record actual shape for A4).

- [ ] **Step 4: Commit**

```bash
git add aion2/tools/wiki/probe.py tests/wiki/fixtures
git commit -m "test(wiki): phase2/3 fixtures - item, loot, routes, talks, field events, map points"
```

### Task A2: Parsers (`tables.py`)

**Files:**
- Modify: `aion2/tools/wiki/tables.py`
- Test: `tests/wiki/test_tables.py`

- [ ] **Step 1: Write failing tests** — append to `tests/wiki/test_tables.py` (follow the file's existing fixture-loading helper; if it loads via `json.loads((FIXTURES / name).read_text(...))`, reuse it):

```python
def test_parse_npcs_extended_fields():
    npcs = tables.parse_npcs(load("npcdata_sample.json"))
    rec = next(iter(npcs["by_id"].values()))
    for key in ("npcType", "subType", "grade", "funcType", "relationship"):
        assert key in rec

def test_parse_items_by_id_and_name():
    items = tables.parse_items(load("item_sample.json"))
    rec = next(iter(items["by_id"].values()))
    assert rec["id"] and rec["name"]
    assert set(rec) >= {"descKey", "descLongKey", "iconRes", "grade", "tier",
                        "itemLevel", "itemType", "category", "race", "stats",
                        "sellPrice", "maxStack"}
    assert items["by_name"][rec["name"]] is rec

def test_parse_npc_loot():
    loot = tables.parse_npc_loot(load("npcloot_sample.json"))
    npc_id, item_ids = next(iter(loot.items()))
    assert isinstance(npc_id, int) and all(isinstance(i, int) for i in item_ids)

def test_parse_item_routes():
    routes = tables.parse_item_routes(load("itemgetroute_sample.json"))
    rec = next(iter(routes.values()))
    assert set(rec) == {"monsters", "gather", "craft", "shop", "quests"}

def test_parse_npc_talks():
    talks = tables.parse_npc_talks(load("npctalk_sample.json"))
    name, speaker = next(iter(talks.items()))
    assert name.startswith("NPCTalk") and speaker

def test_parse_field_events():
    evs = tables.parse_field_events(load("fieldevent_sample.json"))
    rec = next(iter(evs.values()))
    assert set(rec) >= {"mapId", "markers"}

def test_parse_steps_move_point():
    steps = tables.parse_steps(load("queststep_sample.json"))
    goal = next(iter(steps.values()))[0]["goals"][0]
    assert "movePoint" in goal
```

- [ ] **Step 2: Run tests, verify FAIL** — `uv run pytest tests/wiki/test_tables.py -q` → new tests fail with `AttributeError`/`KeyError`.

- [ ] **Step 3: Implement.** In `parse_npcs`, extend `rec`:

```python
        rec = {
            "id": val(r.get("ID")),
            "name": val(r.get("Name")),
            "descKey": l10n_key(r.get("Desc")),
            "level": val(r.get("Level")) or 0,
            "named": bool(r.get("bNamed")),
            "npcType": enum(r.get("NpcType")),
            "subType": enum(r.get("NpcSubType")),
            "grade": val(r.get("Grade")) or 0,
            "funcType": enum(r.get("FunctionType")),
            "relationship": enum(r.get("RelationshipEntity")),
        }
```

In `parse_steps`, inside the goal dict add (adjust key name to what A1 recorded — expected `QuestMovePointName`):

```python
                    "movePoint": val(g.get("QuestMovePointName")),
```

Append new parsers:

```python
CATEGORY_FIELD = {"Equip": "EquipCategory", "Usable": "UsableCategory", "Misc": "MiscCategory"}


def parse_items(rows: list[dict]) -> dict:
    """Item indexes by numeric id and by string table name."""
    by_id, by_name = {}, {}
    for r in rows:
        itype = enum(r.get("ItemType"))
        cat_field = CATEGORY_FIELD.get(itype)
        rec = {
            "id": val(r.get("ID")),
            "name": val(r.get("Name")),
            "descKey": l10n_key(r.get("Desc")),
            "descLongKey": l10n_key(r.get("DescLong")),
            "iconRes": val(r.get("IconRes")),
            "grade": (enum(r.get("ItemGrade")) or "Common").lower(),
            "tier": val(r.get("ItemTier")) or 0,
            "itemLevel": val(r.get("ItemLevel")) or 0,
            "itemType": itype,
            "category": enum(r.get(cat_field)) if cat_field else None,
            "race": (enum(r.get("ItemRace")) or "All").lower(),
            "sellPrice": val(r.get("SellPrice")) or 0,
            "maxStack": val(r.get("MaxStackCount")) or 0,
            "stats": [
                {"key": enum(s.get("Key")), "value": val(s.get("Value")) or 0}
                for s in (r.get("MainStats") or [])
                if enum(s.get("Key"))
            ],
        }
        if rec["id"] is not None:
            by_id[rec["id"]] = rec
        if rec["name"]:
            by_name[rec["name"]] = rec
    return {"by_id": by_id, "by_name": by_name}


def parse_npc_loot(rows: list[dict]) -> dict[int, list[int]]:
    """NpcId -> [itemId, ...]."""
    out: dict[int, list[int]] = {}
    for r in rows:
        npc_id = val(r.get("NpcId"))
        items = [v for v in (val(i) for i in (r.get("LootList") or [])) if v]
        if npc_id is not None and items:
            out.setdefault(int(npc_id), []).extend(int(i) for i in items)
    return out


def parse_item_routes(rows: list[dict]) -> dict[int, dict]:
    """ItemId -> acquisition routes summary."""
    out: dict[int, dict] = {}
    for r in rows:
        item_id = val(r.get("ItemId"))
        if item_id is None:
            continue
        monsters = [
            v for v in (val(m.get("NpcId")) for m in (r.get("MonsterGetRoutes") or []))
            if v is not None
        ]
        quests = [
            v for v in (val(q.get("QuestId")) for q in (r.get("QuestGetRoutes") or []))
            if v is not None
        ]
        out[int(item_id)] = {
            "monsters": [int(m) for m in monsters],
            "gather": bool(r.get("GatherGetRoutes")),
            "craft": bool(r.get("CraftGetRoutes")),
            "shop": bool(r.get("NPCShopInfo")),
            "quests": [int(q) for q in quests],
        }
    return out


def parse_npc_talks(rows: list[dict]) -> dict[str, str]:
    """NpcTalk Name -> speaker NPC table name."""
    out: dict[str, str] = {}
    for r in rows:
        name, speaker = val(r.get("Name")), val(r.get("SpeakerValue"))
        if name and speaker:
            out[name] = speaker
    return out


def parse_field_events(rows: list[dict]) -> dict[str, dict]:
    """FieldEvent Name -> {mapId, markers:[npc/env table names]}."""
    out: dict[str, dict] = {}
    for r in rows:
        name = val(r.get("Name"))
        if not name:
            continue
        markers = [
            v for v in (
                val(m) for m in
                (r.get("MarkerNpcList") or []) + (r.get("MarkerEnvObjList") or [])
            ) if v
        ]
        out[name] = {"mapId": val(r.get("MapId")), "markers": markers}
    return out
```

If a fixture reveals `QuestGetRoutes` entries use a different id key than `QuestId`, adapt to the fixture (never guess — read the fixture file).

- [ ] **Step 4: Run tests, verify PASS** — `uv run pytest tests/wiki/test_tables.py -q`.

- [ ] **Step 5: Commit**

```bash
git add aion2/tools/wiki/tables.py tests/wiki/test_tables.py
git commit -m "feat(wiki): parsers for items, loot, get-routes, npc talks, field events; extended npc/step fields"
```

### Task A3: Taxonomy generalization + config

**Files:**
- Modify: `aion2/tools/wiki/taxonomy.py`, `data_src/wiki.yaml`
- Test: `tests/wiki/test_taxonomy.py`

- [ ] **Step 1: Write failing tests** — append to `tests/wiki/test_taxonomy.py`:

```python
def test_classify_npc():
    assert taxonomy.classify_npc({"named": True, "subType": "HeroMonster", "npcType": "Monster"}) == "boss"
    assert taxonomy.classify_npc({"named": False, "subType": "NormalMonster", "npcType": "Monster"}) == "monster"
    assert taxonomy.classify_npc({"named": False, "subType": "NormalCitizen", "npcType": "Citizen"}) == "citizen"
    assert taxonomy.classify_npc({"named": False, "subType": "NormalSummon", "npcType": "Summon"}) is None

def test_build_type_node():
    groups_cfg = [{"slug": "a", "labels": {}}, {"slug": "b", "labels": {}}]
    records = [
        {"group": "a", "section": "s1", "sort": 5},
        {"group": "a", "section": "s1", "sort": 2},
        {"group": "b", "section": "s2", "sort": 1},
        {"group": None, "section": "x", "sort": 0},
    ]
    node = taxonomy.build_type_node("npc", groups_cfg, records)
    assert node["slug"] == "npc" and node["count"] == 3
    a = next(g for g in node["groups"] if g["slug"] == "a")
    assert a["count"] == 2 and a["sections"] == [{"slug": "s1", "count": 2}]
```

- [ ] **Step 2: Run, verify FAIL** — `uv run pytest tests/wiki/test_taxonomy.py -q`.

- [ ] **Step 3: Implement.** Append to `taxonomy.py`:

```python
BOSS_SUBTYPES = {"EliteMonster", "HeroMonster", "LegendMonster"}


def classify_npc(npc: dict) -> str | None:
    if npc.get("named") and npc.get("subType") in BOSS_SUBTYPES:
        return "boss"
    if npc.get("npcType") == "Monster":
        return "monster"
    if npc.get("npcType") == "Citizen":
        return "citizen"
    return None


def npc_race(npc: dict) -> str:
    rel = npc.get("relationship") or ""
    if rel == "NPC_Light":
        return "light"
    if rel == "NPC_Dark":
        return "dark"
    return "all"


def build_type_node(type_slug: str, groups_cfg: list[dict], records: list[dict]) -> dict:
    """Generic tree node. records: [{group, section, sort}]; sections sorted by min sort.

    'other'/'unknown' sections sort last.
    """
    per_group: dict[str, dict[str, int]] = {g["slug"]: {} for g in groups_cfg}
    min_sort: dict[str, dict[str, float]] = {g["slug"]: {} for g in groups_cfg}
    counts: dict[str, int] = {g["slug"]: 0 for g in groups_cfg}
    for r in records:
        slug = r.get("group")
        if slug not in per_group:
            continue
        counts[slug] += 1
        section = r.get("section") or "other"
        per_group[slug][section] = per_group[slug].get(section, 0) + 1
        sort = r.get("sort") or 0
        min_sort[slug][section] = min(sort, min_sort[slug].get(section, sort))
    groups = []
    for g in groups_cfg:
        slug = g["slug"]

        def key(item):
            section, _ = item
            return (section in ("other", "unknown"), min_sort[slug][section], section.lower())

        sections = [{"slug": s, "count": n} for s, n in sorted(per_group[slug].items(), key=key)]
        groups.append({"slug": slug, "count": counts[slug], "sections": sections})
    return {"slug": type_slug, "count": sum(counts.values()), "groups": groups}
```

Refactor `build_quest_tree` to delegate: compute `records = [{"group": lookup.get(q["type"]), "section": q.get("part") or "other", "sort": q.get("recommendedLevel") or 0} for q in quests]`, collect `unmatched` from quests whose type isn't in `lookup`, then `node = build_type_node("quest", qcfg["groups"], records)` and return `({"types": [node]}, unmatched)`. Existing quest tests must still pass unchanged.

- [ ] **Step 4: Extend `data_src/wiki.yaml`** — append:

```yaml
npc:
  labels: { en: "NPCs & Monsters", zhCN: "NPC与怪物" }
  groups:
    - slug: boss
      labels: { en: "Named & bosses", zhCN: "精英与首领" }
    - slug: monster
      labels: { en: "Monsters", zhCN: "怪物" }
    - slug: citizen
      labels: { en: "NPCs", zhCN: "NPC" }
item:
  labels: { en: "Items", zhCN: "物品" }
  groups:
    - slug: equipment
      types: [Equip]
      labels: { en: "Equipment", zhCN: "装备" }
    - slug: usable
      types: [Usable]
      labels: { en: "Consumables & usables", zhCN: "消耗与可用品" }
    - slug: material
      types: [Misc]
      labels: { en: "Materials & misc", zhCN: "材料与杂项" }
    - slug: currency
      types: [Currency]
      labels: { en: "Currency", zhCN: "货币" }
# Hand-authored section labels (slug -> per-language). Missing slugs fall back to
# title-cased slug (en) — emitter warns so new categories get labels added here.
sections:
  # equip categories
  greatsword: { en: "Greatsword", zhCN: "大剑" }
  sword: { en: "Sword", zhCN: "单手剑" }
  dagger: { en: "Dagger", zhCN: "短剑" }
  mace: { en: "Mace", zhCN: "钉锤" }
  staff: { en: "Staff", zhCN: "法杖" }
  orb: { en: "Orb", zhCN: "宝珠" }
  spellbook: { en: "Spellbook", zhCN: "魔导书" }
  bow: { en: "Bow", zhCN: "弓" }
  shield: { en: "Shield", zhCN: "盾牌" }
  torso: { en: "Torso", zhCN: "上衣" }
  legs: { en: "Legs", zhCN: "下装" }
  boots: { en: "Boots", zhCN: "鞋子" }
  gloves: { en: "Gloves", zhCN: "手套" }
  shoulders: { en: "Shoulders", zhCN: "护肩" }
  helmet: { en: "Helmet", zhCN: "头盔" }
  earring: { en: "Earring", zhCN: "耳环" }
  necklace: { en: "Necklace", zhCN: "项链" }
  ring: { en: "Ring", zhCN: "戒指" }
  belt: { en: "Belt", zhCN: "腰带" }
  bracelet: { en: "Bracelet", zhCN: "手镯" }
  # usable categories
  skinshop: { en: "Appearance", zhCN: "外观" }
  gettitle: { en: "Titles", zhCN: "称号" }
  vehiclesoul: { en: "Vehicle souls", zhCN: "坐骑之魂" }
  rewardbox: { en: "Reward boxes", zhCN: "奖励宝箱" }
  food: { en: "Food", zhCN: "食物" }
  potion: { en: "Potions", zhCN: "药水" }
  questscroll: { en: "Quest scrolls", zhCN: "任务卷轴" }
  # misc categories
  craftresource: { en: "Craft resources", zhCN: "制作材料" }
  gatherresource: { en: "Gather resources", zhCN: "采集材料" }
  # generic
  currency: { en: "Currency", zhCN: "货币" }
  unknown: { en: "Unknown", zhCN: "未知" }
  other: { en: "Other", zhCN: "其他" }
```

(This list intentionally covers only the highest-frequency categories; the emitter's warning in A7 lists any missing slugs so labels can be appended — acceptable en fallback exists.)

- [ ] **Step 5: Run all taxonomy + emit tests** — `uv run pytest tests/wiki -q` → PASS.

- [ ] **Step 6: Commit**

```bash
git add aion2/tools/wiki/taxonomy.py data_src/wiki.yaml tests/wiki/test_taxonomy.py
git commit -m "feat(wiki): generic taxonomy builder, npc/item groups + section labels"
```

### Task A4: Resolver upgrades

**Files:**
- Modify: `aion2/tools/wiki/resolvers.py`
- Test: `tests/wiki/test_resolvers.py`

- [ ] **Step 1: Write failing tests** — append to `tests/wiki/test_resolvers.py` (a `FakeTransform` with `world_to_pixel(x, y) -> (x/10, y/10)` likely already exists in the file; reuse or define):

```python
def test_spawn_index_env_obj_ids():
    spawns = [{"Name": "SP_1", "EnvObjIdList": [{"Value": 42}],
               "Positions": [{"Location": {"X": 100, "Y": 200}}]}]
    idx = resolvers.build_spawn_index(spawns, {"by_id": {}}, FakeTransform(),
                                      env_objs={42: "Env_Herb_01"})
    assert idx["Env_Herb_01"] == [{"x": 10.0, "y": 20.0}]

def test_build_point_index():
    data = {
        "SubzoneVolumeInfoMap": [{"Value": {"LabelName": "SZ_A", "Location": {"X": 100, "Y": 100}}}],
        "TriggerActorDataMap": [{"Name": "TR_B", "Location": {"X": 200, "Y": 200}}],
        "QuestMovePointDataMap": [{"LabelName": "MP_C", "Location": {"X": 300, "Y": 300}}],
    }
    idx = resolvers.build_point_index(data, FakeTransform())
    assert idx["SZ_A"] == {"x": 10.0, "y": 10.0}
    assert idx["TR_B"] == {"x": 20.0, "y": 20.0}
    assert idx["MP_C"] == {"x": 30.0, "y": 30.0}

def test_resolve_enter_volume_pc():
    r = resolvers.resolve_goal(
        {"type": "EnterVolumePC", "values": ["TR_B"], "movePoint": None},
        "World_L_A", {}, point_index={"TR_B": {"x": 20.0, "y": 20.0}})
    assert r["resolved"] is True and r["pois"] == [{"x": 20.0, "y": 20.0}]

def test_resolve_move_point_fallback():
    goal = {"type": "KillNpc", "values": ["NoSuchNpc"], "movePoint": "MP_C"}
    r = resolvers.resolve_goal(goal, "World_L_A", {},
                               point_index={"MP_C": {"x": 30.0, "y": 30.0}})
    assert r["resolved"] is True and r["pois"] == [{"x": 30.0, "y": 30.0}]

def test_resolve_clear_map_event():
    goal = {"type": "ClearMapEvent", "values": ["FE_1"], "movePoint": None}
    r = resolvers.resolve_goal(
        goal, "World_L_A",
        {"NPC_X": [{"x": 1.0, "y": 2.0}]},
        field_events={"FE_1": {"mapId": 1, "markers": ["NPC_X"]}})
    assert r["resolved"] is True and r["pois"] == [{"x": 1.0, "y": 2.0}]

def test_resolve_enter_subzone_region():
    goal = {"type": "EnterSubZone", "values": [2096], "movePoint": None}
    r = resolvers.resolve_goal(goal, "World_L_A", {})
    assert r["region"] == {"mapName": "World_L_A", "id": "2096"}
    assert r["resolved"] is None and r["pois"] == []

def test_resolve_goal_region_default_none():
    r = resolvers.resolve_goal({"type": "AskNpc", "values": [], "movePoint": None}, None, {})
    assert r["region"] is None
```

Adjust `SubzoneVolumeInfoMap`/`QuestMovePointDataMap` fixture shapes to match `mapdata_points_sample.json` from A1 (entries may be `{Key, Value}` pairs or flat) — the test data above must mirror the real shape.

- [ ] **Step 2: Run, verify FAIL** — `uv run pytest tests/wiki/test_resolvers.py -q`.

> **AMENDED 2026-07-02 after raw-data verification:** the FieldEvent path is a dead end —
> ClearMapEvent goal values are MapEvent file names (`Data/MapEvent/*.json`), whose
> StartSpawner names do NOT exist in MapData (event spawners live in unexported layer
> data). Measured on World_L_A: EnterVolumePC **36/36** resolve via the point index;
> ClearMapEvent only 4/103 via the movePoint fallback; movePoint fallback also adds
> 13/249 KillNpc + 3/124 UseEnvObj. Therefore: **no `field_events` param, no
> `parse_field_events`** (remove the A2 parser + its test + fixture usage in the A4
> commit); ClearMapEvent **stays in NONSPATIAL** and only benefits from the generic
> movePoint fallback. Delete `test_resolve_clear_map_event` from Step 1 and skip the
> ClearMapEvent branch below.

- [ ] **Step 3: Implement.** Changes to `resolvers.py`:

1. Remove `"EnterVolumePC"` from `NONSPATIAL` (ClearMapEvent stays).
2. `build_spawn_index(spawn_info_list, npcs, transform, env_objs=None)` — after the NPC loop inside each spawner add:

```python
        for eid in s.get("EnvObjIdList") or []:
            v = eid.get("Value") if isinstance(eid, dict) else eid
            ename = (env_objs or {}).get(v)
            if ename and ename != s.get("Name"):
                add(ename, pts)
```

3. New `build_point_index(map_data: dict, transform) -> dict[str, dict]`:

```python
def build_point_index(map_data: dict, transform) -> dict[str, dict]:
    """Label/name -> single {x,y} point from volumes, triggers, move points."""
    idx: dict[str, dict] = {}

    def add(name, loc):
        if name and isinstance(loc, dict) and "X" in loc and "Y" in loc:
            x, y = transform.world_to_pixel(loc["X"], loc["Y"])
            idx.setdefault(name, {"x": round(x, 1), "y": round(y, 1)})

    for e in map_data.get("SubzoneVolumeInfoMap") or []:
        v = e.get("Value") or e
        add(v.get("LabelName"), v.get("Location"))
    for e in map_data.get("TriggerActorDataMap") or []:
        v = e.get("Value") or e
        add(v.get("Name"), v.get("Location"))
    for e in map_data.get("QuestMovePointDataMap") or []:
        v = e.get("Value") or e
        add(v.get("LabelName"), v.get("Location"))
    return idx
```

(Adapt `e.get("Value") or e` unwrapping to the actual fixture shape.)

4. Rework `resolve_goal`:

```python
def resolve_goal(goal, map_name, spawn_index, point_index=None):
    """Return {resolved: True|False|None, pois: [...], region: {...}|None}."""
    gtype = goal["type"]
    per_map_points = (point_index or {}).get(map_name or "", {})
    out = {"resolved": None, "pois": [], "region": None}

    if gtype == "EnterSubZone":
        v = goal["values"][0] if goal["values"] else None
        if v is not None and map_name:
            out["region"] = {"mapName": map_name, "id": str(v)}
        return out

    per_map = spawn_index.get(map_name or "", {})
    pois: list[dict] = []
    target = goal["values"][0] if goal["values"] else None
    if gtype in NPC_GOALS or gtype in ENV_GOALS:
        pois = list(per_map.get(target, [])) if target else []
    elif gtype == "EnterVolumePC":
        if target and target in per_map_points:
            pois = [per_map_points[target]]

    if not pois and goal.get("movePoint") and goal["movePoint"] in per_map_points:
        pois = [per_map_points[goal["movePoint"]]]

    if not pois and gtype in NONSPATIAL:
        return out
    out["resolved"] = bool(pois)
    out["pois"] = pois[:MAX_POIS]
    return out
```

**Important:** `emit_wiki.build_quest_entity` passes the full multi-map `spawn_index` dict and `resolve_goal` does `spawn_index.get(map_name…)` — preserved above; `point_index` is likewise a per-map dict-of-dicts. Update the Step-1 tests accordingly (wrap point/spawn fixtures in `{"World_L_A": {...}}`). Existing tests pin the old 3-arg call — they keep working because `point_index` defaults to None. Note `resolved` semantics: a NONSPATIAL goal (incl. ClearMapEvent) that gains a movePoint POI reports `resolved: True`; without one it stays `None` (not counted as failure).

5. Old goal dicts in existing tests may lack `"movePoint"` — use `goal.get("movePoint")` (already done above).

- [ ] **Step 4: Run all wiki tests** — `uv run pytest tests/wiki -q` → PASS (existing resolver/emit tests unaffected).

- [ ] **Step 5: Commit**

```bash
git add aion2/tools/wiki/resolvers.py tests/wiki/test_resolvers.py
git commit -m "feat(wiki): env-obj spawn index, point index, field-event + volume + move-point resolvers, subzone region refs"
```

### Task A5: NPC entity builder

**Files:**
- Create: `aion2/tools/wiki/entities.py`
- Test: `tests/wiki/test_entities.py` (create)

- [ ] **Step 1: Write failing tests** — create `tests/wiki/test_entities.py`:

```python
import json
from pathlib import Path

from aion2.tools.maps import TOOLS_ROOT
from aion2.tools.wiki import entities

FIXTURES = TOOLS_ROOT / "tests" / "wiki" / "fixtures"


def load(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


NPC = {"id": 7, "name": "NPC_A", "descKey": None, "level": 12, "named": True,
       "npcType": "Monster", "subType": "HeroMonster", "grade": 3,
       "funcType": None, "relationship": "Monster"}


def test_build_npc_entity_shape():
    ent = entities.build_npc_entity(
        NPC,
        name={"en": "Boss A", "zhCN": "首领A", "zhTW": "首領A"},
        spawns_by_map={"World_L_A": [{"x": 1.0, "y": 2.0}]},
        quest_refs=[{"id": 100, "role": "giver"}],
        drop_items=[{"id": 5, "name": {"en": "Sword", "zhCN": "剑", "zhTW": "劍"},
                     "grade": "rare", "icon": None}],
    )
    assert ent["id"] == 7 and ent["type"] == "npc"
    assert ent["race"] == "all" and ent["named"] is True
    assert ent["spawns"] == [{"mapName": "World_L_A", "pois": [{"x": 1.0, "y": 2.0}]}]
    assert ent["quests"] == [{"id": 100, "role": "giver"}]
    assert ent["drops"][0]["grade"] == "rare"


def test_build_npc_quest_refs():
    quests = [{"id": 1, "name": "Q1", "acquireBeforeNpcTalk": "T_A",
               "acquireAfterNpcTalk": None, "completeNpcTalk": None}]
    steps = {"Q1": [{"order": 1, "goals": [
        {"type": "KillNpc", "values": ["NPC_A"], "movePoint": None}]}]}
    talks = {"T_A": "NPC_G"}
    refs = entities.build_npc_quest_refs(quests, steps, talks)
    assert refs["NPC_G"] == [{"id": 1, "role": "giver"}]
    assert refs["NPC_A"] == [{"id": 1, "role": "target"}]
```

- [ ] **Step 2: Run, verify FAIL** — `uv run pytest tests/wiki/test_entities.py -q` → `ModuleNotFoundError`.

- [ ] **Step 3: Implement** `aion2/tools/wiki/entities.py`:

```python
"""NPC/Item entity builders. Pure functions; caller supplies indexes."""
from __future__ import annotations

from aion2.tools.wiki import taxonomy

MAX_SPAWN_POIS = 40
MAX_DROPS = 40
MAX_DROPPED_BY = 20
MAX_REWARD_FROM = 30
NPC_GOAL_TYPES = {"AskNpc", "KillNpc", "CloseNpc"}


def build_npc_quest_refs(quests, steps, talks) -> dict[str, list[dict]]:
    """NPC table name -> [{id, role: giver|target}], deduped, quest-id order."""
    refs: dict[str, dict[int, str]] = {}

    def add(npc_name, quest_id, role):
        if not npc_name:
            return
        roles = refs.setdefault(npc_name, {})
        # giver wins over target for the same quest
        if roles.get(quest_id) != "giver":
            roles[quest_id] = role

    for q in quests:
        for talk_key in ("acquireBeforeNpcTalk", "acquireAfterNpcTalk", "completeNpcTalk"):
            talk = q.get(talk_key)
            if talk:
                add(talks.get(talk), q["id"], "giver")
        for st in steps.get(q["name"], []):
            for g in st["goals"]:
                if g["type"] in NPC_GOAL_TYPES and g["values"]:
                    add(g["values"][0], q["id"], "target")
    return {
        npc: [{"id": qid, "role": role} for qid, role in sorted(roles.items())]
        for npc, roles in refs.items()
    }


def build_npc_entity(npc, name, spawns_by_map, quest_refs, drop_items) -> dict:
    return {
        "id": npc["id"],
        "type": "npc",
        "name": name,
        "level": npc["level"],
        "grade": npc["grade"],
        "named": npc["named"],
        "npcType": npc["npcType"],
        "subType": npc["subType"],
        "funcType": npc["funcType"],
        "race": taxonomy.npc_race(npc),
        "spawns": [
            {"mapName": m, "pois": pts[:MAX_SPAWN_POIS]}
            for m, pts in sorted(spawns_by_map.items())
            if pts
        ],
        "quests": quest_refs[:200],
        "drops": drop_items[:MAX_DROPS],
    }
```

- [ ] **Step 4: Run, verify PASS** — `uv run pytest tests/wiki/test_entities.py -q`.

- [ ] **Step 5: Commit**

```bash
git add aion2/tools/wiki/entities.py tests/wiki/test_entities.py
git commit -m "feat(wiki): npc entity builder + quest backlink index"
```

### Task A6: Item entity builder + quest-entity extensions

**Files:**
- Modify: `aion2/tools/wiki/entities.py`, `aion2/tools/wiki/emit_wiki.py`
- Test: `tests/wiki/test_entities.py`, `tests/wiki/test_emit_wiki.py`

- [ ] **Step 1: Write failing tests** — append to `tests/wiki/test_entities.py`:

```python
ITEM = {"id": 5, "name": "IT_A", "descKey": None, "descLongKey": None,
        "iconRes": "Icon_WP_GS_0022_T05", "grade": "legend", "tier": 5,
        "itemLevel": 30, "itemType": "Equip", "category": "Greatsword",
        "race": "all", "sellPrice": 10, "maxStack": 1,
        "stats": [{"key": "Attack", "value": 12}]}


def test_build_item_entity_shape():
    ent = entities.build_item_entity(
        ITEM,
        name={"en": "Sword", "zhCN": "剑", "zhTW": "劍"},
        desc={"en": "d", "zhCN": "d", "zhTW": "d"},
        icon="UI/Resource/Texture/Item/Weapon/Icon_WP_GS_0022_T05.webp",
        routes={"monsters": [7], "gather": False, "craft": True, "shop": False, "quests": [3]},
        reward_from=[100, 101],
        dropped_by=[{"id": 7, "name": {"en": "Boss A", "zhCN": "首领A", "zhTW": "首領A"}, "level": 12}],
    )
    assert ent["type"] == "item" and ent["grade"] == "legend"
    assert ent["icon"].endswith(".webp")
    assert ent["sources"] == {"gather": False, "craft": True, "shop": False, "quests": [3]}
    assert ent["rewardFrom"] == [100, 101]
    assert ent["droppedBy"][0]["id"] == 7


def test_build_item_entity_no_routes():
    ent = entities.build_item_entity(ITEM, name={}, desc=None, icon=None,
                                     routes=None, reward_from=[], dropped_by=[])
    assert ent["sources"] == {"gather": False, "craft": False, "shop": False, "quests": []}
```

And to `tests/wiki/test_emit_wiki.py` (reuse the file's existing fake-l10n/harness pattern — read the file first; the assertions below are the contract):

```python
def test_quest_entity_reward_items_have_id_and_objective_target():
    # extend the existing build_quest_entity test harness:
    # pass item_ids={"IT_A": 5} and npc_name_to_id={"NPC_A": 7}
    ent = build_entity_under_test()
    assert ent["rewards"]["items"][0]["id"] == 5
    kill = next(o for st in ent["steps"] for o in st["objectives"] if o["type"] == "KillNpc")
    assert kill["target"] == {"type": "npc", "id": 7}
    assert "region" in kill
```

- [ ] **Step 2: Run, verify FAIL** — `uv run pytest tests/wiki/test_entities.py tests/wiki/test_emit_wiki.py -q`.

- [ ] **Step 3: Implement.** Append to `entities.py`:

```python
def build_item_entity(item, name, desc, icon, routes, reward_from, dropped_by) -> dict:
    routes = routes or {"monsters": [], "gather": False, "craft": False,
                        "shop": False, "quests": []}
    return {
        "id": item["id"],
        "type": "item",
        "name": name,
        "desc": desc,
        "grade": item["grade"],
        "tier": item["tier"],
        "itemLevel": item["itemLevel"],
        "itemType": item["itemType"],
        "category": item["category"],
        "race": item["race"],
        "icon": icon,
        "stats": item["stats"],
        "sellPrice": item["sellPrice"],
        "maxStack": item["maxStack"],
        "sources": {
            "gather": routes["gather"],
            "craft": routes["craft"],
            "shop": routes["shop"],
            "quests": routes["quests"][:MAX_REWARD_FROM],
        },
        "rewardFrom": reward_from[:MAX_REWARD_FROM],
        "droppedBy": dropped_by[:MAX_DROPPED_BY],
    }
```

In `emit_wiki.build_quest_entity`: add params `item_ids=None` (item table name → id) and `npc_name_to_id=None` (NPC table name → id); pass `point_index` and `field_events` through to `resolvers.resolve_goal`; in the objective dict add:

```python
                    "target": (
                        {"type": "npc", "id": npc_name_to_id[g["values"][0]]}
                        if g["type"] in resolvers.NPC_GOALS and g["values"]
                        and g["values"][0] in (npc_name_to_id or {})
                        else None
                    ),
                    "region": r["region"],
```

and in reward items add `"id": (item_ids or {}).get(i["item"])`.

- [ ] **Step 4: Run all wiki tests** — `uv run pytest tests/wiki -q` → PASS (update any existing emit tests broken by new objective keys — additive keys should not break them).

- [ ] **Step 5: Commit**

```bash
git add aion2/tools/wiki/entities.py aion2/tools/wiki/emit_wiki.py tests/wiki
git commit -m "feat(wiki): item entity builder; quest reward item ids + objective targets/regions"
```

### Task A7: Emit wiring + full run + data commit

**Files:**
- Modify: `aion2/tools/wiki/emit_wiki.py`
- Test: `tests/wiki/test_emit_wiki.py` (only if harness needs param updates)

- [ ] **Step 1: Wire it all in `emit()`** (this is orchestration — integration-verified by the real run, keep unit tests on builders):

```python
    items = tables.parse_items(_table("Item.json"))
    loot = tables.parse_npc_loot(_table("NpcLoot.json"))
    routes = tables.parse_item_routes(_table("ItemGetRoute.json"))
    talks = tables.parse_npc_talks(_table("NpcTalk.json"))
    env_objs = {
        tables.val(r.get("ID")): tables.val(r.get("Name"))
        for r in _table("EnvObjData.json")
        if tables.val(r.get("ID")) is not None
    }
```

1. **Spawn/point indexes:** extend `build_spawn_indexes(map_names, npcs, env_objs)` to pass `env_objs` into `resolvers.build_spawn_index`, and add a sibling `build_point_indexes(map_names)` calling `resolvers.build_point_index(md["Properties"]["Data"], tr)` per map. Both loops read MapData once — refactor into one loop returning `(spawn_idx, point_idx)`.
2. **Icon index:** scan the resource repo once:

```python
RESOURCE_REPO = TOOLS_ROOT.parent / "resource"

def build_icon_index() -> dict[str, str]:
    root = RESOURCE_REPO / "UI" / "Resource" / "Texture" / "Item"
    if not root.exists():
        return {}
    return {
        p.stem: str(p.relative_to(RESOURCE_REPO)).replace("\\", "/")
        for p in root.rglob("*.webp")
    }
```

3. **NPC spawns per NPC:** invert the per-map spawn work — while building spawn indexes, also collect `npc_spawns: dict[int, dict[str, list]]` (npc id → map name → pts). Cleanest: in `resolvers.build_spawn_index`, also return nothing new; instead add a separate pure helper in `resolvers.py` (with a unit test in `test_resolvers.py`):

```python
def build_npc_spawns(spawn_info_list, transform) -> dict[int, list[dict]]:
    """NPC id -> [{x,y}] on this map."""
    out: dict[int, list[dict]] = {}
    for s in spawn_info_list or []:
        pts = []
        for p in s.get("Positions") or []:
            loc = p.get("Location") or {}
            if "X" in loc and "Y" in loc:
                x, y = transform.world_to_pixel(loc["X"], loc["Y"])
                pts.append({"x": round(x, 1), "y": round(y, 1)})
        if not pts:
            continue
        for nid in s.get("NpcIdList") or []:
            v = nid.get("Value") if isinstance(nid, dict) else nid
            if v is not None:
                out.setdefault(int(v), []).extend(pts)
    return out
```

4. **NPC emission:** quest_refs = `entities.build_npc_quest_refs(quests, steps, talks)`. Item-name→LText already exists (`item_names`); item id→rec via `items["by_id"]`. Emit an NPC iff `spawns_by_map` non-empty OR `quest_refs.get(npc.name)` OR `npc["named"]`. For each: group = `taxonomy.classify_npc(npc)`; section = first spawn map name (sorted by point count desc) else `"unknown"`; drops = `loot.get(npc_id, [])` mapped to `{"id", "name": ltext(l10n, items["by_id"][iid]["descKey"]), "grade", "icon"}` (skip unknown item ids). Write `data/wiki/npc/<id>.json`; index doc `{"id", "group", "section", "race": taxonomy.npc_race(npc), "level", "mapId": section if section != "unknown" else None, "grade": npc["grade"]}` — **only when group is not None**; entity file is written regardless (deep links from quests/items must resolve).
5. **Item emission:** `dropped_by_index`: invert `loot` and union with `routes[*]["monsters"]`, dedupe, map npc id → `{"id", "name": ltext(l10n, npcs["by_id"][nid]["descKey"]), "level"}`. `reward_from_index`: iterate `rewards` groups keyed by quest id (`rw` group key == quest id string) — for each quest's reward items map item table-name → item id via `items["by_name"]`, append quest id. Emit ALL items; group via `taxonomy.group_lookup(cfg["item"])` on `itemType`; section = `(item["category"] or ("currency" if item["itemType"] == "Currency" else "unknown")).lower()`; sort = itemLevel. Index doc `{"id", "group", "section", "race", "level": itemLevel, "mapId": None, "grade": item["grade"]}`.
6. **Taxonomy tree:** `tree = {"types": [quest_node, npc_node, item_node]}` using `taxonomy.build_type_node` for npc (records from emitted-NPC docs, sort=level) and item (sort=itemLevel). Keep quest node exactly as today (via refactored `build_quest_tree`).
7. **Locales:** generalize the per-type loop: for each type in cfg order (`quest`, `npc`, `item`) emit `types.<slug>` and `groups.<slug>.*` labels; sections labels resolve in priority order: (a) `cfg["sections"][slug]` per-language, (b) for npc map-name sections → `ltext` from Map.json row `Desc` key (build `map_name_ltext: dict[str, dict]` from `mapid_to_name` + Map rows), (c) `taxonomy.section_label(slug)` en fallback — collect fallback slugs and print a `WARN missing section labels: [...]` line. Name namespaces: `locales/<lng>/wiki/npc.json` (`{id: {name}}` from Desc ltext, fallback table name) and `locales/<lng>/wiki/item.json` likewise.
8. **Sitemap:** add `/wiki/npc`, `/wiki/item`, group URLs, and entity URLs for emitted npc/item ids.
9. **Coverage print:** keep existing; it now includes an EnterVolumePC bucket automatically (it left NONSPATIAL). ClearMapEvent stays nonspatial (resolved None unless movePoint hits).

- [ ] **Step 2: Run unit tests** — `uv run pytest tests/wiki -q` → PASS.

- [ ] **Step 3: Full emit run**

Run: `uv run python -m aion2.tools.wiki.emit_wiki`
Expected: prints quest count, **coverage lines where AskNpc ≥ 575/587, UseEnvObj > 173/350 (EnvObjIdList should raise it), KillNpc ≥ 426/1132, plus a new EnterVolumePC bucket (expect ~100%)**, npc/item emit counts, and any `WARN missing section labels`. Spot-check outputs:

```bash
node -e "const e=require('E:/aion2-map/data/wiki/npc/'+process.argv[1]+'.json');console.log(JSON.stringify(e,null,1).slice(0,2000))" <some-boss-id>
node -e "const i=require('E:/aion2-map/data/wiki/index/item.json');console.log(i.docs.length, i.docs[0])"
```

Verify: a named boss has spawns+quests+drops; an equipment item has icon path that exists on disk (`ls E:/aion2-map/resource/<icon path>`); `taxonomy.json` has 3 types; `locales/zh-CN/wiki/item.json` has Chinese names; quest entity for a known quest (pick one with KillNpc) now has `target` and reward `id`.

- [ ] **Step 4: Commit tools + data**

```bash
git add aion2/tools/wiki tests/wiki data_src/wiki.yaml
git commit -m "feat(wiki): emit npc/item entities, indexes, locales, sitemap; resolver coverage upgrades"
cd E:/aion2-map/data && git add -A && git commit -m "data: wiki npc/item entities + extended quests (phases 2-3)" && cd E:/aion2-map/tools
```

---

# Part B — frontend

Setup once:
```bash
cd E:/aion2-map/frontend && git checkout phase2/map-rebuild && git checkout -b feature/wiki-npc-item
```
Verification commands per task: `npm run build` (includes tsc) and `npm run lint`. E2E at the end (B7).

### Task B1: Types, loaders, i18n keys

**Files:**
- Modify: `src/types/wiki.ts`, `src/lib/wiki.ts`
- Modify: `public/locales/en/wiki.yaml`, `public/locales/zh-CN/wiki.yaml`, `public/locales/zh-TW/wiki.yaml`

- [ ] **Step 1: Extend `src/types/wiki.ts`:**

```ts
export type ItemGrade =
  | "common" | "rare" | "legend" | "unique" | "epic" | "mythic" | "special";

export interface WikiIndexDoc {
  id: number;
  group: string | null;
  section: string;
  race: "light" | "dark" | "all";
  level: number;
  mapId: string | null;
  grade?: ItemGrade | number;
}

export interface RegionRef { mapName: string; id: string }

export interface QuestObjective {
  // …existing fields…
  target: { type: "npc"; id: number } | null;
  region: RegionRef | null;
}

// QuestEntity.rewards.items: { id: number | null; name: LText; count: number }[]

export interface NpcEntity {
  id: number;
  type: "npc";
  name: LText;
  level: number;
  grade: number;
  named: boolean;
  npcType: string | null;
  subType: string | null;
  funcType: string | null;
  race: "light" | "dark" | "all";
  spawns: { mapName: string; pois: WikiPoi[] }[];
  quests: { id: number; role: "giver" | "target" }[];
  drops: { id: number; name: LText; grade: ItemGrade; icon: string | null }[];
}

export interface ItemEntity {
  id: number;
  type: "item";
  name: LText;
  desc: LText | null;
  grade: ItemGrade;
  tier: number;
  itemLevel: number;
  itemType: string | null;
  category: string | null;
  race: "light" | "dark" | "all";
  icon: string | null;
  stats: { key: string; value: number }[];
  sellPrice: number;
  maxStack: number;
  sources: { gather: boolean; craft: boolean; shop: boolean; quests: number[] };
  rewardFrom: number[];
  droppedBy: { id: number; name: LText; level: number }[];
}
```

- [ ] **Step 2: Loaders in `src/lib/wiki.ts`:**

```ts
export const loadNpc = (id: string | number) =>
  loadGameData<NpcEntity>(`data/wiki/npc/${id}.json`);

export const loadItem = (id: string | number) =>
  loadGameData<ItemEntity>(`data/wiki/item/${id}.json`);
```

- [ ] **Step 3: i18n keys ×3 locales.** `en/wiki.yaml` additions (zh-CN / zh-TW translated equivalents required in the same commit — no English fallbacks in zh files):

```yaml
common:
  loading: "Loading..."
  notFound: "Not found: {{id}}"
  open: "Open"
  level: "Lv. {{n}}"
npc:
  info: "NPC info"
  npcType: "Type"
  grade: "Grade"
  named: "Named"
  spawns: "Spawn locations"
  spawnsOn: "{{map}}"
  quests: "Related quests"
  giver: "Quest giver"
  target: "Quest target"
  drops: "Drops"
  noSpawns: "No known spawn locations"
item:
  info: "Item info"
  category: "Category"
  tier: "Tier"
  itemLevel: "Item level"
  sellPrice: "Sell price"
  maxStack: "Max stack"
  stats: "Stats"
  sources: "How to obtain"
  gather: "Gathering"
  craft: "Crafting"
  shop: "Shop"
  questReward: "Quest reward"
  droppedBy: "Dropped by"
  rewardFrom: "Reward from quests"
```

zh-CN: `loading: "加载中..."`, `notFound: "未找到：{{id}}"`, `open: "打开"`, `level: "{{n}} 级"`; npc: `info: "NPC信息"`, `npcType: "类型"`, `grade: "等级"`, `named: "精英"`, `spawns: "出没地点"`, `quests: "相关任务"`, `giver: "任务发布"`, `target: "任务目标"`, `drops: "掉落物品"`, `noSpawns: "未知出没地点"`; item: `info: "物品信息"`, `category: "分类"`, `tier: "阶级"`, `itemLevel: "物品等级"`, `sellPrice: "出售价格"`, `maxStack: "堆叠上限"`, `stats: "属性"`, `sources: "获取途径"`, `gather: "采集"`, `craft: "制作"`, `shop: "商店"`, `questReward: "任务奖励"`, `droppedBy: "掉落来源"`, `rewardFrom: "奖励自任务"`. zh-TW: OpenCC-style traditional of the zh-CN strings (`加載中...` → use `載入中...`, `未找到：{{id}}`→`未找到：{{id}}`, `打開`, `{{n}} 級`, `NPC資訊`, `類型`, `等級`, `精英`, `出沒地點`, `相關任務`, `任務發布`, `任務目標`, `掉落物品`, `未知出沒地點`, `物品資訊`, `分類`, `階級`, `物品等級`, `出售價格`, `堆疊上限`, `屬性`, `獲取途徑`, `採集`, `製作`, `商店`, `任務獎勵`, `掉落來源`, `獎勵自任務`).

- [ ] **Step 4: Verify** — `npm run build` passes.

- [ ] **Step 5: Commit**

```bash
git add src/types/wiki.ts src/lib/wiki.ts public/locales
git commit -m "feat(wiki): npc/item types, loaders, i18n keys (en/zh-CN/zh-TW)"
```

### Task B2: EmbeddedMap region highlight + i18n fix

**Files:**
- Modify: `src/features/wiki/EmbeddedMap.tsx`

- [ ] **Step 1: Add `highlightRegionIds?: string[]` prop.** Load `data/regions/${mapName}.json` (via `loadGameData`, same pattern as markers; tolerate 404 → no highlight). Render matching regions as `<Polygon>` with `positions={border.map(([x, y]) => [mapHeight - y, x])}` (same Y-flip as `GameMapBorders.xyToLatLng`), `pathOptions={{ color: "#2E97FF", weight: 1.5, dashArray: "4 4", fillOpacity: 0.15 }}`, non-interactive. Include region points in the fit-bounds computation alongside `pois` so a highlight-only embed still frames correctly. Key the MapContainer remount on `highlightRegionIds?.join()` too (existing `key` already handles pois count).

- [ ] **Step 2: Replace hardcoded `"Open"` (line ~84)** with `t("wiki:common.open")` (add `useTranslation(["wiki"])`).

- [ ] **Step 3: Verify** — `npm run build`; then open a quest page in the browser (dev server per CLAUDE.md) to confirm no regression on plain-POI embeds.

- [ ] **Step 4: Commit**

```bash
git add src/features/wiki/EmbeddedMap.tsx
git commit -m "feat(wiki): region-highlight overlays in embedded map; i18n open link"
```

### Task B3: Shared wiki UI primitives

**Files:**
- Create: `src/features/wiki/ui.tsx`
- Modify: `src/features/wiki/QuestPage.tsx` (extract, no behavior change)

- [ ] **Step 1: Create `src/features/wiki/ui.tsx`** — move `QuestCard`→`WikiCard`, `InfoRows`, `InfoRow`, `BreadcrumbSeparator` out of QuestPage verbatim (exported), and add:

```tsx
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getStaticUrl } from "@/lib/url";
import type { ItemGrade } from "@/types/wiki";

const GRADE_CLASS: Record<ItemGrade, string> = {
  common: "text-grade-common",
  rare: "text-grade-rare",
  legend: "text-grade-legend",
  unique: "text-grade-unique",
  epic: "text-grade-epic",
  mythic: "text-grade-mythic",
  special: "text-grade-special",
};

export function GradeText({ grade, children, className = "" }: {
  grade: ItemGrade; children: React.ReactNode; className?: string;
}) {
  return <span className={`${GRADE_CLASS[grade] ?? ""} ${className}`}>{children}</span>;
}

export function ItemIcon({ icon, alt = "", size = 32 }: {
  icon: string | null; alt?: string; size?: number;
}) {
  if (!icon) {
    return <span className="inline-block shrink-0 rounded bg-secondary" style={{ width: size, height: size }} />;
  }
  return (
    <img src={getStaticUrl(icon)} alt={alt} width={size} height={size} loading="lazy"
      className="shrink-0 rounded bg-secondary/50 object-contain" />
  );
}

export function WikiLoading() {
  const { t } = useTranslation(["wiki"]);
  return (
    <div className="space-y-4" role="status" aria-label={t("wiki:common.loading")}>
      <div className="h-7 w-56 animate-pulse rounded bg-secondary" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-secondary" />
      <div className="h-4 w-2/3 max-w-md animate-pulse rounded bg-secondary" />
      <div className="h-64 w-full animate-pulse rounded-md bg-secondary" />
    </div>
  );
}

export function WikiNotFound({ id }: { id: string }) {
  const { t } = useTranslation(["wiki"]);
  return <p className="text-muted-foreground">{t("wiki:common.notFound", { id })}</p>;
}

export function Breadcrumb({ items }: {
  items: { label: string; to?: string; params?: Record<string, string>; hash?: string }[];
}) {
  const { t } = useTranslation(["wiki"]);
  return (
    <nav aria-label={t("wiki:quest.breadcrumb")}
      className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <BreadcrumbSeparator />}
          {item.to ? (
            <Link to={item.to} params={item.params} hash={item.hash}
              className="hover:text-foreground hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
```

**Check first:** `text-grade-*` utilities require the `--color-grade-*` tokens in `src/index.css` `@theme` (they exist — verify Tailwind v4 exposes them as `text-grade-rare`; if the theme block defines `--color-grade-rare`, the utility is auto-generated).

- [ ] **Step 2: Refactor QuestPage** to import `WikiCard as QuestCard`, `InfoRows`, `InfoRow`, `Breadcrumb`; replace its inline breadcrumb nav with `<Breadcrumb items={[...]}/>`; replace `Loading...` with `<WikiLoading />` and the 404 string with `<WikiNotFound id={id} />`. No visual redesign in this task.

- [ ] **Step 3: Verify** — `npm run build`; browser-check a quest page renders identically (breadcrumb, sidebar cards).

- [ ] **Step 4: Commit**

```bash
git add src/features/wiki/ui.tsx src/features/wiki/QuestPage.tsx
git commit -m "refactor(wiki): shared ui primitives (cards, breadcrumb, grade text, item icon, skeleton)"
```

### Task B4: NpcPage

**Files:**
- Create: `src/features/wiki/NpcPage.tsx`

- [ ] **Step 1: Implement** mirroring QuestPage's structure (loader effect keyed by id with `cancelled` guard, `loaded?.id === id` guard, `WikiLoading`/`WikiNotFound`):

Layout: `Breadcrumb` (Wiki › NPCs › group › section-map) using `loadWikiIndex("npc")` doc like QuestPage does; `h1` = `lt(npc.name, lang)` with `GradeText`-independent styling (NPCs use level badge, not item grades) + a small `named` badge when `npc.named`; two-column grid identical to QuestPage (`md:grid-cols-[minmax(0,1fr)_280px]`).

Sidebar `WikiCard`s:
- info: type (`npcType`/`subType`), faction (`t('wiki:list.'+race)`), level (`t('wiki:common.level',{n})`), grade (numeric), funcType when present.
- related quests (`npc.quests`, grouped by role — role label `t('wiki:npc.giver'|'wiki:npc.target')`, each a `QuestLink`-style link to `/wiki/$type/$slug` with type "quest").

Main column:
- Spawns section: for each `npc.spawns` entry render `<h3>{mapName}</h3>` (localized via `t('wiki/taxonomy:sections.'+mapName+'.name')` with `defaultValue: mapName`) + `<EmbeddedMap mapName={s.mapName} pois={s.pois.map(p => ({...p, label: lt(npc.name, lang)}))} className="mb-4 h-72" />`. Empty → `t("wiki:npc.noSpawns")`.
- Drops section (`npc.drops` non-empty): grid of rows `ItemIcon` + `GradeText grade={d.grade}` name linking to `/wiki/$type/$slug` (type "item", slug String(d.id)).

`document.title` effect same as QuestPage. `data-testid="wiki-npc-page"`, drops rows `data-testid={'npc-drop-'+d.id}`.

- [ ] **Step 2: Verify** — `npm run build`. Browser check deferred to B6 (route dispatch not wired yet).

- [ ] **Step 3: Commit**

```bash
git add src/features/wiki/NpcPage.tsx
git commit -m "feat(wiki): npc page - spawns embed, quest backlinks, drops"
```

### Task B5: ItemPage

**Files:**
- Create: `src/features/wiki/ItemPage.tsx`

- [ ] **Step 1: Implement** (same loading skeleton pattern; `useTranslation(["wiki", "wiki/taxonomy", "wiki/quest", "wiki/npc"])` for backlink names):

Header: `Breadcrumb` (Wiki › Items › group › section) from `loadWikiIndex("item")` doc; then a hero row: `ItemIcon size={56}` + `<h1><GradeText grade={item.grade}>{lt(item.name, lang)}</GradeText></h1>` + muted line `{category} · {t('wiki:item.itemLevel')} {itemLevel}`; `item.desc` paragraph under it when present.

Sidebar `WikiCard`s:
- info: category (`t('wiki/taxonomy:sections.'+category.toLowerCase()+'.name', {defaultValue: category})`), faction, tier, itemLevel, sellPrice (`toLocaleString()`), maxStack — hide zero/null rows.
- stats (when `item.stats.length`): `InfoRow` per stat, label = raw `key` (game enum; acceptable v1), value `toLocaleString()`.

Main column sections (each `WikiCard`-style section, render only when non-empty):
- Sources (`t('wiki:item.sources')`): boolean chips for gather/craft/shop (`t('wiki:item.gather'|'craft'|'shop')`) rendered as small rounded `bg-secondary` pills; quest links from `sources.quests` (name via `t('wiki/quest:'+id+'.name')`).
- Dropped by (`droppedBy`): rows linking to `/wiki/$type/$slug` type "npc": `{lt(name, lang)}` + `t('wiki:common.level', {n: level})`.
- Reward from (`rewardFrom`): quest link list.

`data-testid="wiki-item-page"`.

- [ ] **Step 2: Verify** — `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add src/features/wiki/ItemPage.tsx
git commit -m "feat(wiki): item page - grade hero, stats, sources, drop/reward backlinks"
```

### Task B6: Route dispatch + QuestPage upgrades

**Files:**
- Modify: `src/routes/wiki/$type/$slug.tsx` (locate via `Glob src/routes/wiki/**`), `src/features/wiki/QuestPage.tsx`

- [ ] **Step 1: Route dispatch.** In the `$slug` route component, when `isNumericSlug(slug)`: render `QuestPage` for `type==="quest"`, `NpcPage` for `"npc"`, `ItemPage` for `"item"` (fallback: existing GroupList path unchanged for non-numeric).

- [ ] **Step 2: QuestPage upgrades:**
- Reward items: when `it.id` render `ItemIcon` (from entity we only have name/count — extend rw_items? NO: entity now has `id`; icon not included in quest entity). Render as link to item page when `id` present: `<Link to="/wiki/$type/$slug" params={{type:"item", slug:String(it.id)}}>{lt(it.name, lang)}</Link>`; keep plain span otherwise.
- Objectives (summary list + steps list): when `o.target` render the label as link to the npc page; append when `entry.objective.region` a small `t('wiki:quest.openInMap')`-style hint is NOT needed — instead pass regions to the map: compute `highlightRegionIds = [...new Set(q.steps.flatMap(s => s.objectives).filter(o => o.region?.mapName === mapName).map(o => o.region!.id))]` and pass to `<EmbeddedMap highlightRegionIds={highlightRegionIds} …/>`; also render the embed when `pois.length === 0 && highlightRegionIds.length > 0` (adjust the current `pois.length > 0` condition).

- [ ] **Step 3: Verify in browser** — dev server (`curl -s -o /dev/null -w "%{http_code}" http://localhost:5173`, try 5174+): visit a quest with EnterSubZone objective (find one via `node -e` grep over `data/wiki/quest`), an npc page, an item page (equipment with icon + droppedBy). Check zh-CN locale switch renders Chinese names everywhere.

- [ ] **Step 4: Commit**

```bash
git add src/routes src/features/wiki/QuestPage.tsx
git commit -m "feat(wiki): npc/item route dispatch; quest reward links, objective npc links, region highlights"
```

### Task B7: Hub/list generalization + e2e

**Files:**
- Modify: `src/features/wiki/GroupList.tsx`, `src/features/wiki/TypeHub.tsx`, `src/features/wiki/WikiHome.tsx`, `e2e/wiki.spec.ts`

- [ ] **Step 1: GroupList per-type columns.** Replace the fixed `(level | name | mapId)` row with type-aware cells: quest → unchanged; npc → level, name, localized section map name; item → `ItemIcon`-less `GradeText grade={d.grade}` name (grade from index doc), level column = `itemLevel`, third column = localized section. Implementation: a small `renderRow(type, d)` switch inside the component (no premature abstraction). Map-name column: `t('wiki/taxonomy:sections.'+(d.mapId ?? '')+'.name', {defaultValue: d.mapId ?? ''})`.

- [ ] **Step 2: TypeHub tweaks.** Faction bucketing already generic; verify it renders sensibly for npc/item (many `both` buckets). Add `Breadcrumb` (Wiki › type). WikiHome: ensure it lists all three types from taxonomy (it maps `tax.types`, should be automatic — verify + replace its hardcoded `Loading...` with `WikiLoading`).

- [ ] **Step 3: e2e additions** — append to `e2e/wiki.spec.ts` (follow existing spec's helpers/base URL conventions):

```ts
test("npc hub, group list and npc page", async ({ page }) => {
  await page.goto("/wiki/npc");
  await expect(page.getByTestId("wiki-type-hub")).toBeVisible();
  const firstGroup = page.getByTestId(/wiki-hub-group-/).first();
  await firstGroup.locator("a").first().click();
  await expect(page.getByTestId("wiki-group-list")).toBeVisible();
  await page.getByTestId(/wiki-entry-/).first().click();
  await expect(page.getByTestId("wiki-npc-page")).toBeVisible();
});

test("item page renders grade-colored name and links", async ({ page }) => {
  await page.goto("/wiki/item");
  await expect(page.getByTestId("wiki-type-hub")).toBeVisible();
  const firstGroup = page.getByTestId(/wiki-hub-group-/).first();
  await firstGroup.locator("a").first().click();
  await page.getByTestId(/wiki-entry-/).first().click();
  await expect(page.getByTestId("wiki-item-page")).toBeVisible();
});
```

- [ ] **Step 4: Run** — `npx playwright test e2e/wiki.spec.ts` → all pass (existing quest specs included).

- [ ] **Step 5: Commit**

```bash
git add src/features/wiki e2e/wiki.spec.ts
git commit -m "feat(wiki): type-aware lists, hub breadcrumbs, npc/item e2e coverage"
```

---

# Merge-back & verification (after design pass, tracker #4–#5)

- [ ] tools: `git checkout master && git rebase feature/wiki-npc-item master`? — NO: rebase the feature onto master then fast-forward: `git checkout feature/wiki-npc-item && git rebase master && git checkout master && git merge --ff-only feature/wiki-npc-item`. Same pattern for frontend onto `phase2/map-rebuild`.
- [ ] Full test suites: `uv run pytest -q` (tools), `npm run build && npm run lint && npx playwright test` (frontend).
- [ ] Live verification on the dev server across all three locales.
- [ ] Update `docs/superpowers/specs/2026-07-02-aion2-wiki-subsite-design.md` status notes (phases 2–3 done; phase 4 SEO prerender still deferred).

# Self-review (writing-plans)

- **Spec coverage:** NPC pages (A5/A7/B4) ✓; Item pages (A6/A7/B5) ✓; EnterSubZone highlight (A4/B2/B6) ✓; EnterVolumePC/QuestMovePoint/ClearMapEvent best-effort (A4) ✓; UseEnvObj boost via EnvObjIdList (A4) ✓; backlinks quests↔npcs↔items (A5/A6/B4/B5/B6) ✓; i18n 3 locales for UI + content (A7 step 7, B1) ✓; sitemap (A7) ✓. Deferred per scope: SEO prerender, CollectItem (0/16, no data path identified).
- **Placeholder scan:** fixture-dependent shapes (QuestMovePointName key, Value-wrapper unwrapping, QuestGetRoutes id key) are explicitly gated on reading A1 fixtures — deliberate, not placeholders.
- **Type consistency:** `resolve_goal` returns `{resolved, pois, region}` everywhere (A4/A6/B1); index doc gains optional `grade` (A7/B1/B7); entity field names match TS types (`droppedBy`, `rewardFrom`, `sources.quests`).
