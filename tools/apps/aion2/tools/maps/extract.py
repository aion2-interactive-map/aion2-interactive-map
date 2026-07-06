"""Per-map extraction of SubzoneGroups, Subzones, and god-fragment (monolith) data
from the raw game export.

No "region" concept — only the game's own hierarchy, with raw field names kept:
  - SubzoneGroup   (Table/SubzoneGroup.json)            : ID, Desc
  - Subzone        (Table/Subzone.json, by MapId)       : ID, Name, DisplayName,
                     WorldMapFogGroupId -> SubzoneGroup.ID, SubzoneType, bMapEnabled
  - geometry       (MapData.json SubzoneVolumeInfoMap)  : joined by SubzoneTableId
  - world-map icon (Table/WorldMapUIRegion.json)        : joined by SubzoneId
                     -> IconType, IconRank (from WorldMapInfoType Region_Rank<N>)
  - fragments      (MapData.json SpawnInfoList, GodFragment EnvObj)
                     -> monolith achievement group (Achievement.json UseEnvObjSpawnerName)
                     -> canonical Subzone: the max-area subzone sharing the group's
                        Title name (== the icon-bearing one).

Workflow: extract_map(name) -> dict; main() writes parsed_data/maps/<map>.json for the 5
requested maps (Abyss_Reshanta_B is absent from Map.json — deprecated, replaced by C — and is
reported skipped).
"""
import json
import re
from functools import lru_cache
from pathlib import Path

from shapely.geometry import Polygon

from . import RAW_ROOT, TOOLS_ROOT, worldmap_path, map_table_key
from .l10n import L10N
from .subzones import _find_first, map_data_path
from .transform import Orientation, WorldMapTransform
from .worldmap import WorldMapMeta
from .creatures import build_creature_markers, build_pet_source_index

TABLE = RAW_ROOT / "Data" / "Table"
OUT_DIR = TOOLS_ROOT / "parsed_data" / "maps"

# Image-space orientation, verified against World_L_A.png (Eternal Isle lower-left,
# Dawn Legion Base upper-left). Assumed for all maps; re-verify per map with landmarks.
ORIENTATION = Orientation(px_from="X", flip_x=False, flip_y=False)

REQUESTED_MAPS = ["World_L_A", "World_D_A", "World_L_B", "World_D_B",
                  "Abyss_Reshanta_A", "Abyss_Reshanta_C", "Abyss_Reshanta_D",
                  "Abyss_Battlefield_A"]
_MONO_PREFIX = "Group_Unlock_MonolithFragment_"


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _parse_rank(world_map_info_type):
    """``EWorldMapInfoType::Region_Rank2`` -> ``2`` (frontend zoom LOD rank).

    Returns ``None`` when there is no WorldMapUIRegion / no trailing Rank<N>."""
    if not world_map_info_type:
        return None
    m = re.search(r"Rank(\d+)$", str(world_map_info_type))
    return int(m.group(1)) if m else None


@lru_cache(maxsize=None)
def _table(name: str):
    return json.loads((TABLE / name).read_text(encoding="utf-8"))["Properties"]["Data"]


@lru_cache(maxsize=None)
def _maps_index():
    return {m["Name"]: m for m in _table("Map.json")}


def map_title(name: str, l10n: L10N) -> dict[str, str]:
    """Localized map title from ``Map.json``'s ``Desc.Key``.

    Maps absent from ``Map.json`` (e.g. ``World_L_B`` / ``World_D_B``) fall back
    to the conventional ``STR_Map_<name>`` L10N key. Returns ``{"en", "zhCN", "ko"}``;
    values may be empty strings when the key has no L10N body.
    """
    entry = _maps_index().get(map_table_key(name)) or {}
    desc_key = (entry.get("Desc") or {}).get("Key") or f"STR_Map_{name}"
    return {"en": l10n.en(desc_key), "zhCN": l10n.zh_cn(desc_key), "ko": l10n.ko(desc_key)}


@lru_cache(maxsize=None)
def _godfragment_env_ids() -> frozenset:
    return frozenset(
        e["ID"]["Value"] for e in _table("EnvObjData.json")
        if "GodFragment" in (e.get("ResourceKey", "") + e.get("Name", ""))
    )


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


@lru_cache(maxsize=None)
def _gather_info_by_env() -> dict:
    """GatherSource EnvObj ID -> {sourceType, descKey}.

    The EnvObj's ``UsageValue`` (e.g. ``Gather_Herb_lv1_Common_001_f``) is the
    ``GatherSource.Name``; that row's ``SourceType`` (``EGatherSourceType::Od``)
    is the broad material grouping. The SPECIFIC material name (Odyle, Aria,
    Sapphire, Orichalcum, ...) is the EnvObj's own localized ``Desc`` — 100% of
    GatherSource EnvObjs resolve a Desc, giving 71 distinct materials globally
    (13 on World_L_A: Odyle, Orichalcum, Yggdrasil, Sapphire, Diamond, Ruby,
    Aria, Targena, Coriolus, Kukuru, Mela, Inina, Cypri). We subtype by this
    specific material (legacy granularity), keeping SourceType only as the icon
    fallback grouping."""
    gs = {r["Name"]: r for r in _table("GatherSource.json")}
    out = {}
    for e in _table("EnvObjData.json"):
        if e.get("Usage") != "EEnvObjectUsage::GatherSource":
            continue
        row = gs.get(e.get("UsageValue"))
        if not row or not row.get("SourceType"):
            continue
        out[e["ID"]["Value"]] = {
            "sourceType": str(row["SourceType"]).split("::")[-1],
            "descKey": (e.get("Desc") or {}).get("Key", ""),
            "materialGroup": str(row.get("MaterialGroup", "")).split("::")[-1],
        }
    return out


# DungeonTypes that are NOT player-facing world dungeons and must be dropped
# from the ``dungeon`` subtype:
#   - Seal       -> the dedicated ``seal`` subtype (handled separately).
#   - Quest      -> story / sub-district gates (CoastalCave, RootCellar, the
#                   E_L1_FQ/DQ EnterDoors, ...): quest-gated, not free-roam.
#   - PersonalAgit / Guild -> player/legion housing entrances, not dungeons.
#   - InstanceLayer / FieldEvent -> instance interiors / transient events.
# Everything else reached through an EnterDungeon/PartyDungeon EnvObj that is
# actually spawned on a world map IS surfaced as ``dungeon`` (PartyDungeon — the
# Urugugu/Draupnir/Fire Temple/Krao party dungeons, DungeonType resolves to
# ``None`` via their non-numeric UsageValue — and AbyssArtifact portals in the
# Reshanta maps).
_NON_DUNGEON_TYPES = frozenset({
    "EDungeonType::Seal", "EDungeonType::Quest",
    "EDungeonType::PersonalAgit", "EDungeonType::Guild",
    "EDungeonType::InstanceLayer", "EDungeonType::FieldEvent",
})


@lru_cache(maxsize=None)
def _field_dungeon_env() -> dict:
    """EnvObj ID -> {"dg": Dungeon row | None, "descKey": str} for every
    EnterDungeon/PartyDungeon EnvObj that is a player-facing FIELD dungeon.

    The dungeon entrance lives in ``SpawnInfoList`` (world position); placement
    on a given map falls out of which map's ``SpawnInfoList`` spawns the EnvObj,
    exactly like seals. We resolve the linked ``Dungeon`` only when the EnvObj's
    ``UsageValue`` is numeric (the ``EnterDungeon`` case — PartyDungeon stores a
    small enum byte instead, so its dungeon is identified by name/Desc), and
    drop anything whose linked ``DungeonType`` is in ``_NON_DUNGEON_TYPES`` or
    whose Name is a Seal / quest-only gate (``*Seal*`` / ``*VeriMap*`` /
    ``District_*``). The display name comes from the linked Dungeon ``Title``
    when available, else the EnvObj ``Desc`` (e.g. "Urugugu Canyon Entrance")."""
    dgs = {r["ID"]["Value"]: r for r in _table("Dungeon.json")}
    out = {}
    for e in _table("EnvObjData.json"):
        if e.get("Usage") not in (
            "EEnvObjectUsage::EnterDungeon", "EEnvObjectUsage::PartyDungeon"
        ):
            continue
        name = e.get("Name", "") or ""
        if "Seal" in name or "VeriMap" in name or name.startswith("District_"):
            continue
        uv = str(e.get("UsageValue", ""))
        dg = dgs.get(int(uv)) if uv.isdigit() else None
        if dg is not None and dg.get("DungeonType") in _NON_DUNGEON_TYPES:
            continue
        out[e["ID"]["Value"]] = {"dg": dg, "descKey": (e.get("Desc") or {}).get("Key", "")}
    return out


@lru_cache(maxsize=None)
def _named_npc_ids() -> frozenset:
    """Every ``NpcData`` row with ``bNamed == True`` (named field monsters).

    This is the boss source: a ``SpawnInfoList`` entry whose ``NpcIdList``
    references any bNamed NPC is a world boss spawn, placed at the entry's
    position and named from that NPC's ``NpcData.Desc``. This SUPERSEDES the old
    ``WorldMapFieldNamed`` lookup (its ``FieldNamedSpawnerName`` rows are a
    strict subset of the bNamed spawns: identical 24 on World_L_A/World_D_A,
    but bNamed adds the 3 extra Reshanta bosses each map missed). The anchor
    ``M_L1_AC_WaterEle_04_Named_01`` (bNamed, Monster) is included. All bNamed
    spawns placed on the world maps are Monster type."""
    return frozenset(
        n["ID"]["Value"] for n in _table("NpcData.json") if n.get("bNamed")
    )


@lru_cache(maxsize=None)
def _npc_index() -> dict:
    return {r["ID"]["Value"]: r for r in _table("NpcData.json")}


@lru_cache(maxsize=None)
def _pet_source_index():
    """Source NpcId -> pet (subtype + name keys). Static across maps; cached."""
    return build_pet_source_index(
        _table("VehicleList.json"), _table("Item.json"), _table("NpcLoot.json")
    )


@lru_cache(maxsize=None)
def _vehicle_portrait_stems() -> frozenset:
    """Available vehicle-portrait file stems (``UT_Vehicle_Portrait_*``) in the
    raw export. A pet gets its portrait icon only when its stem is present here
    (the resource repo mirrors these PNGs to WebP)."""
    d = RAW_ROOT / "UI" / "Resource" / "Texture" / "Portrait" / "Portrait_Vehicle"
    if not d.exists():
        return frozenset()
    return frozenset(p.stem for p in d.glob("*.png"))


@lru_cache(maxsize=None)
def _teleport_env_ids() -> frozenset:
    """EnvObj defs usable as world teleport/flight artifacts."""
    return frozenset(
        e["ID"]["Value"] for e in _table("EnvObjData.json")
        if e.get("Usage") == "EEnvObjectUsage::TeleportArtifact"
    )


@lru_cache(maxsize=None)
def _teleport_name_by_env() -> dict:
    """teleport EnvObj ID -> localized name Desc.Key (``EnvObjData_<name>_desc``).

    All 161 TeleportArtifact EnvObjs resolve a meaningful place name from this
    key (e.g. "Latesran Western Root", "Marsh Legion Campsite") in both en and
    zh — none empty/numeric — so this is the primary teleport name source. The
    containing-subzone fallback below is only a safety net if a Desc ever resolves
    empty."""
    return {
        e["ID"]["Value"]: (e.get("Desc") or {}).get("Key", "")
        for e in _table("EnvObjData.json")
        if e["ID"]["Value"] in _teleport_env_ids()
    }


@lru_cache(maxsize=None)
def _hiddencube_open_env_ids() -> frozenset:
    """EnvObj defs for hidden cubes that are openable WITHOUT a key (yellow).

    Split is by ``bIsKeyOnly`` (the KEY-REQUIREMENT axis), NOT by faction:
    both HiddenCubeLight and HiddenCubeDark categories contain both values.
    ``bIsKeyOnly == False`` -> yellow (ResourceKey HiddenCube_01,
    RequireConfirmDesc.Key UI_ENVOBJ_TREASUREBOX_DESC)."""
    return frozenset(
        e["ID"]["Value"] for e in _table("EnvObjData.json")
        if str(e.get("Category", "")).startswith("EEnvObjCategory::HiddenCube")
        and not e.get("bIsKeyOnly", False)
    )


@lru_cache(maxsize=None)
def _seal_dungeons() -> dict:
    """{dungeon ID (str) -> Dungeon row} for ALL DungeonType==Seal dungeons.

    NOTE: we deliberately do NOT filter by ``LinkedMap``. Most Seal dungeons set
    ``LinkedMap`` to their world map, but the two "Advanced Seal" dungeons
    (``SealAdvanced_L_0001`` / ``SealAdvanced_D_0001``, IDs 400001/400002) have
    ``LinkedMap == None`` even though their EnterDungeon EnvObj IS spawned on a
    world map. Keying seals by ``LinkedMap`` therefore dropped exactly one seal
    per world map (World_L_A showed 60 instead of 61). We instead resolve seal
    EnvObjs globally and let map placement fall out of which map's
    ``SpawnInfoList`` actually spawns the EnvObj — the same rule used for every
    other world marker."""
    return {
        str(d["ID"]["Value"]): d
        for d in _table("Dungeon.json")
        if d.get("DungeonType") == "EDungeonType::Seal"
    }


@lru_cache(maxsize=None)
def _seal_env_to_dungeon() -> dict:
    """EnvObj ID -> Seal Dungeon row, for every EnterDungeon EnvObj whose
    UsageValue references any DungeonType==Seal dungeon (LinkedMap-agnostic)."""
    seal_dgs = _seal_dungeons()
    out = {}
    for e in _table("EnvObjData.json"):
        if e.get("Usage") != "EEnvObjectUsage::EnterDungeon":
            continue
        dg = seal_dgs.get(str(e.get("UsageValue")))
        if dg is not None:
            out[e["ID"]["Value"]] = dg
    return out


@lru_cache(maxsize=None)
def _occupation_subzones_by_map() -> dict:
    """map_id -> {subzone Name -> quest ID} for occupation (驻地) territories.

    Occupations are *declared* by Exploration quests, not inferred from EnvObj
    names: ``Quest.json`` rows with ``Type == EQuestType::Exploration`` and
    ``ExplorationType == EExplorationType::OccupationTerritory``. Each such quest
    carries an ``AcquireMapId`` and a single ``SubZone`` AcquirableCondition; the
    occupation marker is placed at that subzone's centre and labelled by its
    ``DisplayName`` (which resolves to the legacy names, e.g. "Latrima Outpost").

    The whole export has 42 (World_L_A 15, World_L_B 6, World_D_A 15,
    World_D_B 6) — matching the legacy curated set exactly. Unlike the old
    ``*Garri*..._Insk_*`` EnvObj-name heuristic, this covers the dark maps, whose
    entrances are named ``E_D1_(Human|Daeva|Dragon)NN_Entrance`` and so carried
    neither the ``Garri`` nor ``Insk`` token."""
    out: dict = {}
    for q in _table("Quest.json"):
        if q.get("Type") != "EQuestType::Exploration":
            continue
        if q.get("ExplorationType") != "EExplorationType::OccupationTerritory":
            continue
        mid = (q.get("AcquireMapId") or {}).get("Value")
        if mid is None:
            continue
        subzone = next(
            (c.get("Value") for c in q.get("AcquirableConditions", [])
             if c.get("Type") == "EQuestAcquirableCondition::SubZone"),
            None,
        )
        if subzone:
            out.setdefault(mid, {})[subzone] = q["ID"]["Value"]
    return out


@lru_cache(maxsize=None)
def _spawner_to_group() -> dict:
    """fragment spawner Name -> monolith GroupName (across all maps)."""
    out = {}
    for e in _table("Achievement.json"):
        g = e.get("GroupName", "")
        if g.startswith(_MONO_PREFIX) and e["ObjType"].endswith("UseEnvObjSpawnerName"):
            for ov in e.get("ObjValues", []):
                out[ov] = g
    return out


@lru_cache(maxsize=None)
def _achievement_group_index() -> dict:
    """GroupName -> AchievementGroup entry (ID, Title)."""
    return {e["Name"]: e for e in _table("AchievementGroup.json")}


def _ids(lst):
    return [x.get("Value") if isinstance(x, dict) else x for x in lst]


def _centroid(points):
    n = len(points)
    return [round(sum(p[0] for p in points) / n, 2), round(sum(p[1] for p in points) / n, 2)]


def extract_map(name: str, l10n: L10N) -> dict:
    entry = _maps_index()[map_table_key(name)]
    map_id = entry["ID"]["Value"]

    # ---- 1. SubzoneGroups (only those referenced by this map's subzones) ----
    subzones_raw = [s for s in _table("Subzone.json") if s["MapId"]["Value"] == map_id]
    group_defs = {g["ID"]: g for g in _table("SubzoneGroup.json")}
    NONE = "ESubzoneGroupID::ESubzoneGroupID_None"
    used_group_ids = {s["WorldMapFogGroupId"] for s in subzones_raw} - {NONE}
    subzone_groups = []
    for gid in sorted(used_group_ids):
        g = group_defs.get(gid)
        desc = g["Desc"] if g else {"Key": "None"}
        subzone_groups.append({
            "ID": gid,
            "Desc": desc,
            "name_en": l10n.en(desc.get("Key", "")),
            "name_zhCN": l10n.zh_cn(desc.get("Key", "")),
            "name_ko": l10n.ko(desc.get("Key", "")),
            "resolved": g is not None,
        })

    # ---- 2. geometry (by SubzoneTableId) + world-map icon (by SubzoneId) ----
    md = json.loads(map_data_path(name).read_text(encoding="utf-8"))
    geom = {}
    for e in _find_first(md, "SubzoneVolumeInfoMap") or []:
        v = e["Value"]
        pts = [(p["X"], p["Y"]) for p in (v.get("Points") or [])]
        tid = v.get("SubzoneTableId")
        area = None
        if len(pts) >= 3:
            poly = Polygon(pts)
            if not poly.is_valid:
                poly = poly.buffer(0)
            area = poly.area
        loc = v.get("Location") or {}
        geom[tid] = {
            "Location": [loc.get("X"), loc.get("Y"), loc.get("Z")] if loc else None,
            "area": round(area, 2) if area is not None else None,
            "Points": [[round(x, 2), round(y, 2)] for x, y in pts],
        }
    icons = {
        r["SubzoneId"]["Value"]: r
        for r in _table("WorldMapUIRegion.json")
        if r["MapId"]["Value"] == map_id and r.get("bEnableWorldMap")
    }

    # transform for pixel coords (optional)
    transform = None
    wmp = worldmap_path(name)
    if wmp.exists():
        transform = WorldMapTransform(WorldMapMeta.from_json(wmp, name), ORIENTATION)

    def to_px(loc):
        if not transform or not loc or loc[0] is None:
            return None
        px, py = transform.world_to_pixel(loc[0], loc[1])
        return [round(px, 1), round(py, 1)]

    def to_px_points(world_pts):
        """Transform a ring of world (x, y) vertices to frontend pixel space,
        using the SAME WorldMapTransform/orientation as the marker `px` above,
        so polygons align with the markers. Returns None if no transform."""
        if not transform or not world_pts:
            return None
        ring = []
        for wx, wy in world_pts:
            px, py = transform.world_to_pixel(wx, wy)
            ring.append([round(px, 1), round(py, 1)])
        return ring

    # ---- subzones with everything joined ----
    subzones = []
    for s in subzones_raw:
        sid = s["ID"]["Value"]
        g = geom.get(sid, {})
        ic = icons.get(sid)
        wm_info = ic["WorldMapInfoType"] if ic else None
        subzones.append({
            "ID": sid,
            "Name": s["Name"],
            "DisplayName": s["DisplayName"],
            "name_en": l10n.en(s["DisplayName"]["Key"]),
            "name_zhCN": l10n.zh_cn(s["DisplayName"]["Key"]),
            "name_ko": l10n.ko(s["DisplayName"]["Key"]),
            "WorldMapFogGroupId": s["WorldMapFogGroupId"],
            "SubzoneType": s["SubzoneType"],
            "bMapEnabled": s.get("bMapEnabled", False),
            "IconType": ic["IconType"] if ic else None,
            "WorldMapInfoType": wm_info,
            # LOD rank parsed from WorldMapInfoType (Region_Rank1/2 -> 1/2).
            "IconRank": _parse_rank(wm_info),
            "Location": g.get("Location"),
            "px": to_px(g.get("Location")),
            "area": g.get("area"),
            # Real subzone polygon boundary in frontend pixel space (same
            # transform as `px`), so region borders align with markers.
            "pxBorders": to_px_points(g.get("Points")),
        })

    # ---- canonical subzone per display name: icon-bearing, else max area ----
    by_name = {}
    for sz in subzones:
        if sz["name_en"]:
            by_name.setdefault(_norm(sz["name_en"]), []).append(sz)
    canonical_id = {}  # norm(name) -> canonical subzone ID
    for key, lst in by_name.items():
        iconed = [s for s in lst if s["IconType"]]
        pool = iconed or lst
        best = max(pool, key=lambda s: (s["area"] or 0))
        canonical_id[key] = best["ID"]
    for sz in subzones:
        k = _norm(sz["name_en"]) if sz["name_en"] else None
        canon = canonical_id.get(k)
        sz["canonical"] = (canon == sz["ID"])
        sz["canonicalId"] = canon  # the chosen actor for this name (self if canonical)

    # ---- 3. god fragments -> monolith group -> canonical subzone ----
    gf_ids = _godfragment_env_ids()
    spawn2grp = _spawner_to_group()
    grp_index = _achievement_group_index()
    fragments = []
    group_frag_count = {}
    for s in md["Properties"]["Data"].get("SpawnInfoList", []):
        if not (set(_ids(s.get("EnvObjIdList", []))) & gf_ids):
            continue
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
        if grp:
            group_frag_count[grp] = group_frag_count.get(grp, 0) + 1

    monolith_groups = []
    subzone_by_id = {sz["ID"]: sz for sz in subzones}
    for grp in sorted(group_frag_count, key=lambda g: int(g.rsplit("_", 1)[-1])):
        age = grp_index.get(grp, {})
        title = age.get("Title", {"Key": "None"})
        title_en = l10n.en(title.get("Key", ""))
        canon = canonical_id.get(_norm(title_en))
        canon_sz = subzone_by_id.get(canon)
        monolith_groups.append({
            "GroupName": grp,
            "AchievementGroupId": age.get("ID", {}).get("Value"),
            "Title": title,
            "title_en": title_en,
            "title_zhCN": l10n.zh_cn(title.get("Key", "")),
            "title_ko": l10n.ko(title.get("Key", "")),
            "FragmentCount": group_frag_count[grp],
            "SubzoneId": canon,
            "SubzoneName": canon_sz["Name"] if canon_sz else None,
        })

    # ---- 4. world markers placed via SpawnInfoList (teleport, hiddenCube,
    #         gathering, dungeon, boss) and via instance gates (seal). Same
    #         world->pixel transform as everything else, so they align with
    #         subzone polygons + markers.
    tp_ids = _teleport_env_ids()
    tp_names = _teleport_name_by_env()   # teleport EnvObj ID -> Desc.Key
    hc_open_ids = _hiddencube_open_env_ids()
    gather_info = _gather_info_by_env()   # EnvObj ID -> {sourceType, descKey}
    occ_subzones = _occupation_subzones_by_map().get(map_id, {})  # 驻地: subzone Name -> quest ID
    field_dg = _field_dungeon_env()  # EnvObj ID -> {dg, descKey} (field dungeon)
    seal_env = _seal_env_to_dungeon()  # EnvObj ID -> Seal Dungeon row (any LinkedMap)
    named_npc_ids = _named_npc_ids()  # set of bNamed NPC IDs (world bosses)
    npc_idx = _npc_index()

    # Subzone polygons in WORLD space, for the teleport name fallback (only used
    # if an EnvObj Desc ever resolves empty — none currently do). Each entry is
    # (shapely Polygon, name_en, name_zhCN, name_ko); we pick the containing subzone, else
    # the nearest by polygon distance.
    _subzone_polys = []
    for s in subzones:
        if not s.get("name_en") and not s.get("name_zhCN") and not s.get("name_ko"):
            continue
        g = geom.get(s["ID"], {})
        pts = g.get("Points") or []
        if len(pts) < 3:
            continue
        poly = Polygon(pts)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if poly.is_empty:
            continue
        _subzone_polys.append((poly, s.get("name_en", ""), s.get("name_zhCN", ""), s.get("name_ko", "")))

    def _subzone_name_at(loc3):
        """(name_en, name_zhCN, name_ko) of the subzone containing world (x, y),
        else the nearest subzone. ('', '', '') if no subzone geometry on this map."""
        if not _subzone_polys or not loc3 or loc3[0] is None:
            return "", "", ""
        from shapely.geometry import Point
        pt = Point(loc3[0], loc3[1])
        best = None
        best_d = None
        for poly, en, zh, ko in _subzone_polys:
            if poly.contains(pt):
                return en, zh, ko
            d = poly.distance(pt)
            if best_d is None or d < best_d:
                best_d, best = d, (en, zh, ko)
        return best if best else ("", "", "")

    world_markers = []
    for s in md["Properties"]["Data"].get("SpawnInfoList", []):
        env = set(_ids(s.get("EnvObjIdList", [])))
        # (kind, name_en, name_zhCN, name_ko, env_obj_id, extra, per_position)
        # per_position=True emits one marker per Positions entry (node-level
        # density); otherwise one marker at Positions[0] (the spawner anchor).
        emit = []
        if env & tp_ids:
            tp_eid = next(iter(env & tp_ids))
            tp_key = tp_names.get(tp_eid, "")
            emit.append((
                "teleport",
                l10n.en(tp_key) or "",
                l10n.zh_cn(tp_key) or "",
                l10n.ko(tp_key) or "",
                tp_eid,
                None,
                False,
            ))
        if env & hc_open_ids:
            # Hidden-cube spawners list BOTH variants (one bIsKeyOnly=False open +
            # one bIsKeyOnly=True key-only EnvObj def) at the same spawn points; we
            # keep ONLY the yellow (openable) cube and drop the key-only variant.
            emit.append(("hiddenCube", "", "", "", next(iter(env & hc_open_ids)), None, False))
        # gathering: one marker PER NODE POSITION (gather fields have many nodes:
        # 3-66 positions per spawn entry, vs 1 for teleport). Subtype carries the
        # specific material name resolved from the EnvObj Desc.
        gather_hit = next((i for i in env if i in gather_info), None)
        if gather_hit is not None:
            gi = gather_info[gather_hit]
            mat_en = l10n.en(gi["descKey"]) or ""
            emit.append((
                "gathering",
                mat_en,
                l10n.zh_cn(gi["descKey"]) or "",
                l10n.ko(gi["descKey"]) or "",
                gather_hit,
                # extra: (sourceType, materialName) — emit_frontend maps the
                # specific material to a legacy gathering subtype (icon+name)
                # and falls back to the broad SourceType subtype when unknown.
                (gi["sourceType"], mat_en),
                True,
            ))
        # field dungeon entrances: PartyDungeon (Urugugu/Draupnir/Fire Temple/
        # Krao) + AbyssArtifact portals (Reshanta), spawned on the world map.
        # Seal / Quest / housing types are excluded in _field_dungeon_env. Name
        # from the linked Dungeon Title when present, else the EnvObj Desc.
        dg_env_id = next((i for i in env if i in field_dg), None)
        if dg_env_id is not None:
            info = field_dg[dg_env_id]
            dg = info["dg"]
            title = (dg.get("Title") if dg else None) or {}
            name_key = title.get("Key", "") or info["descKey"]
            emit.append((
                "dungeon",
                l10n.en(name_key) or "",
                l10n.zh_cn(name_key) or "",
                l10n.ko(name_key) or "",
                dg_env_id,
                None,
                False,
            ))
        if not emit:
            seal_hit = next((seal_env[i] for i in env if i in seal_env), None)
            if seal_hit is not None:
                title = seal_hit.get("Title", {}) or {}
                emit.append((
                    "seal",
                    l10n.en(title.get("Key", "")) or "",
                    l10n.zh_cn(title.get("Key", "")) or "",
                    l10n.ko(title.get("Key", "")) or "",
                    next((i for i in env if i in seal_env), next(iter(env)) if env else None),
                    None,
                    False,
                ))
        # boss: spawn entry referencing a bNamed NPC (named field monster, NPC
        # spawn, no EnvObj). Resolve the display name from that NPC's
        # NpcData.Desc. Supersedes the old WorldMapFieldNamed lookup.
        if not emit:
            npc_ids = _ids(s.get("NpcIdList", []))
            boss_npc_id = next((i for i in npc_ids if i in named_npc_ids), None)
            if boss_npc_id is not None:
                desc = (npc_idx.get(boss_npc_id) or {}).get("Desc", {}) or {}
                emit.append((
                    "boss",
                    l10n.en(desc.get("Key", "")) or "",
                    l10n.zh_cn(desc.get("Key", "")) or "",
                    l10n.ko(desc.get("Key", "")) or "",
                    None,
                    None,
                    False,
                ))
        if not emit:
            continue
        positions = s.get("Positions") or []
        if not positions:
            continue
        for kind, name_en, name_zh, name_ko, env_obj_id, extra, per_position in emit:
            locs = positions if per_position else positions[:1]
            for p in locs:
                loc = p["Location"]
                loc3 = [round(loc["X"], 2), round(loc["Y"], 2), round(loc["Z"], 2)]
                m_name_en, m_name_zh, m_name_ko = name_en, name_zh, name_ko
                # Teleport fallback: if the EnvObj Desc resolved empty, name the
                # marker after the subzone that contains (or is nearest to) it,
                # so it's at least a place name rather than a number.
                if kind == "teleport" and not (m_name_en or m_name_zh or m_name_ko):
                    m_name_en, m_name_zh, m_name_ko = _subzone_name_at(loc3)
                wm = {
                    "kind": kind,
                    "Name": s["Name"],
                    "EnvObjId": env_obj_id,
                    "name_en": m_name_en,
                    "name_zhCN": m_name_zh,
                    "name_ko": m_name_ko,
                    "Location": loc3,
                    "px": to_px(loc3),
                }
                if kind == "gathering":
                    # extra = (sourceType, materialName); sourceType is the
                    # broad icon fallback, material is the specific subtype key.
                    wm["sourceType"] = extra[0]
                    wm["material"] = extra[1]
                world_markers.append(wm)

    # ---- 4b. occupation (驻地) markers: one per Exploration/OccupationTerritory
    #      quest on this map, anchored at the centre of the SubZone it names and
    #      labelled by that subzone's DisplayName (see _occupation_subzones_by_map).
    if occ_subzones:
        sz_by_name = {sz["Name"]: sz for sz in subzones}
        for sz_name, quest_id in occ_subzones.items():
            sz = sz_by_name.get(sz_name)
            if sz is None or not sz.get("Location") or not sz.get("px"):
                print(f"  [occupation] {name}: subzone {sz_name!r} missing / no geometry")
                continue
            world_markers.append({
                "kind": "occupation",
                "Name": sz_name,
                "EnvObjId": None,
                "name_en": sz.get("name_en", ""),
                "name_zhCN": sz.get("name_zhCN", ""),
                "name_ko": sz.get("name_ko", ""),
                "Location": sz["Location"],
                "px": sz["px"],
                "entity": {"type": "quest", "id": quest_id},
            })

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
            available_portraits=_vehicle_portrait_stems(),
        )
    )

    return {
        "Name": name,
        "MapId": map_id,
        "BaseDir": entry.get("BaseDir", ""),
        "transform": {"orientation": "px_from=X,flip_x=False,flip_y=False",
                      "verified_maps": ["World_L_A"], "hasWorldMap": transform is not None},
        "SubzoneGroups": subzone_groups,
        "Subzones": subzones,
        "MonolithGroups": monolith_groups,
        "Fragments": fragments,
        "WorldMarkers": world_markers,
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    l10n = L10N()
    maps_idx = _maps_index()
    hdr = (f"{'map':20s}{'subzones':>9s}{'polys':>6s}{'groups':>7s}{'icons':>6s}"
           f"{'fragments':>10s}{'monoGroups':>11s}{'tp':>4s}{'seal':>5s}{'cube':>6s}"
           f"{'gath':>6s}{'occ':>5s}{'dgn':>5s}{'boss':>5s}{'crea':>6s}")
    print(hdr)
    for name in REQUESTED_MAPS:
        if map_table_key(name) not in maps_idx:
            print(f"{name:20s}  SKIPPED — not in Map.json (deprecated/replaced)")
            continue
        data = extract_map(name, l10n)
        (OUT_DIR / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        n_icons = sum(1 for s in data["Subzones"] if s["IconType"])
        n_poly = sum(1 for s in data["Subzones"] if s.get("pxBorders"))
        wm = data.get("WorldMarkers", [])
        kc = {k: sum(1 for w in wm if w["kind"] == k)
              for k in ("teleport", "seal", "hiddenCube", "gathering", "occupation",
                        "dungeon", "boss")}
        kc["creature"] = sum(1 for w in wm if str(w["kind"]).startswith("creature"))
        print(f"{name:20s}{len(data['Subzones']):>9d}{n_poly:>6d}{len(data['SubzoneGroups']):>7d}"
              f"{n_icons:>6d}{len(data['Fragments']):>10d}{len(data['MonolithGroups']):>11d}"
              f"{kc['teleport']:>4d}{kc['seal']:>5d}{kc['hiddenCube']:>6d}"
              f"{kc['gathering']:>6d}{kc['occupation']:>5d}{kc['dungeon']:>5d}{kc['boss']:>5d}{kc['creature']:>6d}")


if __name__ == "__main__":
    main()
