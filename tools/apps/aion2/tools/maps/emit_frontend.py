"""Emit the FRONTEND data schema into the `data/` repo from the parsed
per-map JSON (``tools/parsed_data/maps/*.json``).

This is the bridge between the raw-game-export parser and the React frontend.
It is idempotent and re-runnable: every run fully rewrites the generated files.

Generated data is emitted as **JSON** (the frontend consumes JSON). The only
hand-authored source is ``tools/data_src/types.yaml`` (icon/canComplete config),
which is compiled to ``data/types.json``.

Output layout (in the sibling ``data/`` repo)::

    data/
      maps.json                      # {maps: [GameMapMeta]}
      types.json                     # {categories: [...]}   (compiled from data_src/types.yaml)
      regions/<map>.json             # {regions: [RegionInstance]}
      markers/<map>.json             # {markers: [MarkerInstance]}
      locales/<lng>/maps.json
      locales/<lng>/types.json       # (subtype names, built here)
      locales/<lng>/markers/<map>.json
      locales/<lng>/regions/<map>.json

Coverage (from the current parse):
  - fragments         <- Fragments (god-fragment locations)
  - village           <- Subzones with IconType == EIconType::Village
  - battlefield       <- Subzones with IconType == EIconType::Battlefield
  - teleport          <- WorldMarkers (EnvObj Usage TeleportArtifact spawns)
  - seal              <- WorldMarkers (EnterDungeon EnvObj for Seal dungeons)
  - occupation        <- WorldMarkers (Exploration/OccupationTerritory quest SubZones, 驻地)
  - hiddenCube        <- WorldMarkers (HiddenCube EnvObj spawns, bIsKeyOnly=False, yellow only)
  - gathering<Mat>    <- WorldMarkers (GatherSource EnvObj spawns, one per node
                         position, subtyped by specific material, SourceType fallback)
  - boss              <- WorldMarkers (spawns referencing a bNamed NPC; named from
                         NpcData.Desc)
  - dungeon           <- WorldMarkers (PartyDungeon + AbyssArtifact field-dungeon
                         entrances spawned on the world map; Seal/Quest/housing excluded)

LOD tiers (per-marker ``tier`` = zoom level at which it first appears; replaces
the old ``rank``):
  - tier 1: subzone village/battlefield whose WorldMapInfoType rank == 1
  - tier 2: teleport, seal, occupation, dungeon, boss
  - tier 3: subzone village/battlefield whose rank == 2; fragments; hiddenCube; gathering
  Markers with no determinable tier omit ``tier`` (never shown under LOD).

Regions: real subzone polygons. The parser (``extract.py``) reads each
subzone's boundary vertices from ``MapData.json`` ``SubzoneVolumeInfoMap`` and
transforms them world->pixel via the SAME ``WorldMapTransform`` as the marker
``px``, emitting them as ``pxBorders``. ``build_regions`` turns those into
``RegionInstance.borders`` so region outlines align with the markers.

Usage::

    uv run python -m aion2.tools.maps.emit_frontend
    uv run python -m aion2.tools.maps.emit_frontend --map World_L_A
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import yaml
from opencc import OpenCC

from . import RAW_ROOT, TOOLS_ROOT
from .l10n import L10N
from .extract import map_title

# --- Paths ----------------------------------------------------------------
PARSED_MAPS_DIR = TOOLS_ROOT / "parsed_data" / "maps"
DATA_REPO = TOOLS_ROOT.parent / "data"
# types is hand-authored config (icons/canComplete). Humans edit this YAML; we
# compile it to data/types.json so the frontend gets JSON.
TYPES_SRC = TOOLS_ROOT / "data_src" / "types.yaml"
# Curated subtype/category display names (carried + adjusted into types.json
# locales). Still YAML sources; we emit JSON.
CURATED_LOCALES = TOOLS_ROOT.parent / "frontend" / "apps" / "aion2" / "public" / "locales"

LANGS = ("en-US", "zh-CN", "zh-TW", "ko-KR")

# Subtype display names injected into the types locale. ``hiddenCube`` is the
# single yellow (openable) cube — NO faction / key suffix. {subtype: {en, zhCN,
# zhTW, ko}}; zh-TW falls back to OpenCC if not given.
EXTRA_SUBTYPE_NAMES = {
    # Game L10N (Data/Table/L10N): EN "Hidden Cube", zh-TW "隱藏背包" (the term
    # used by every Hidden-Cube achievement/mission string, e.g.
    # STR_BATTLEPASS_MISSION_*_22). zh-CN is the OpenCC t2s of the zh-TW string
    # ("隐藏背包"). NOT "宝箱" — that was an earlier guess and is wrong.
    "hiddenCube": {"en": "Hidden Cube", "zhCN": "隐藏背包", "zhTW": "隱藏背包", "ko": "히든 큐브"},
    # fragments keeps the legacy monolithMaterial display names (re-keyed).
    "fragments": {"en": "Monolith", "zhCN": "主神痕迹", "zhTW": "主神痕跡", "ko": "모노리스"},
    "dungeon": {"en": "Dungeon", "zhCN": "副本", "zhTW": "副本", "ko": "던전"},
    "boss": {"en": "Boss", "zhCN": "Boss", "zhTW": "Boss", "ko": "보스"},
    # 驻地 / garrison occupation objectives.
    # ko hand-curated (no exact L10N string match for the short "Garrison" form).
    "occupation": {"en": "Garrison", "zhCN": "驻地", "zhTW": "駐地", "ko": "주둔지"},
}

# Visible-map ordering / type, keyed by parsed map Name. Maps not present in
# the parse are still listed (isVisible may stay true) but will have empty
# marker/region files.
MAP_META = {
    "World_L_B": {"type": "light", "order": 0, "isVisible": True},
    "World_D_B": {"type": "dark", "order": 1, "isVisible": True},
    "World_L_A": {"type": "light", "order": 2, "isVisible": True},
    "World_D_A": {"type": "dark", "order": 3, "isVisible": True},
    "World_L_Starter": {"type": "light", "order": 4, "isVisible": True},
    "World_D_Starter": {"type": "dark", "order": 5, "isVisible": True},
    "Abyss_Reshanta_A": {"type": "abyss", "order": 6, "isVisible": True},
    "Abyss_Reshanta_C": {"type": "abyss", "order": 7, "isVisible": True},
    "Abyss_Reshanta_D": {"type": "abyss", "order": 8, "isVisible": True},
    "Abyss_Battlefield_A": {"type": "abyss", "order": 9, "isVisible": True},
}

ICON_TYPE_TO_SUBTYPE = {
    "EIconType::Village": ("location", "village"),
    "EIconType::Battlefield": ("location", "battlefield"),
}

# WorldMarkers.kind -> types.yaml category for the subtype of the same name.
# ``gathering`` is split per SourceType into ``gathering<Type>`` subtypes (the
# category is always ``gathering``), handled separately in build_markers.
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

# 3-tier LOD model: tier = the zoom level at which a marker first appears.
#   tier 1: subzone village/battlefield with WorldMapInfoType rank == 1
#   tier 2: teleport, seal, dungeon, boss (campsite too, if parsed)
#   tier 3: subzone village/battlefield rank == 2; fragments; hiddenCube; gathering
# Subzone village/battlefield tier comes from IconRank (1->1, 2->3); other kinds
# get a fixed tier here. Markers with no tier omit the field.
WORLD_MARKER_TIER = {
    "teleport": 2,
    "seal": 2,
    "occupation": 2,
    "dungeon": 2,
    "boss": 2,
    "hiddenCube": 3,
    "gathering": 3,
    "creatureIntellect": 3,
    "creatureFeral": 3,
    "creatureNature": 3,
    "creatureTrans": 3,
    "creatureSpecial": 3,
}
FRAGMENTS_TIER = 3
# Subzone IconRank (1/2) -> LOD tier (1/3).
SUBZONE_RANK_TO_TIER = {1: 1, 2: 3}

# Specific GatherSource MATERIAL (EnvObj Desc, english) -> gathering subtype key.
# Two faction sets: the 13 Elyos/World_L materials and the 8 Asmodian/World_D
# materials. Each reuses the curated subtype names + per-item icons (in
# data_src/types.yaml). The precise material is read from the EnvObj Desc by the
# parser (WorldMarkers ``material``) — NOT from SourceType, which is not 1:1 with
# material — and markers of these materials get the specific subtype below.
GATHER_MATERIAL_SUBTYPES = {
    # Elyos / World_L set
    "Odyle":      "gatheringOdyle",
    "Orichalcum": "gatheringOrichalcumOre",
    "Yggdrasil":  "gatheringYggdrasilLog",
    "Sapphire":   "gatheringSapphireGemstone",
    "Diamond":    "gatheringDiamondGemstone",
    "Ruby":       "gatheringRubyGemstone",
    "Aria":       "gatheringAria",
    "Targena":    "gatheringTargena",
    "Coriolus":   "gatheringCoriolus",
    "Kukuru":     "gatheringKukuru",
    "Mela":       "gatheringMela",
    "Inina":      "gatheringInina",
    "Cypri":      "gatheringCypri",
    # Asmodian / World_D set (Odyle/Orichalcum/Diamond/Sapphire/Ruby are shared
    # with the Elyos set above)
    "Asvata":     "gatheringAsvata",
    "Azpha":      "gatheringAzpha",
    "Calendula":  "gatheringCalendula",
    "Morfa":      "gatheringMorfa",
    "Raydam":     "gatheringRaydam",
    "Pujery":     "gatheringPujery",
    "Ohkra":      "gatheringOhkra",
    "Conide":     "gatheringConide",
}

# Fallback: GatherSource SourceType (short) -> broad gathering subtype, used for
# materials with no legacy match (e.g. the Asmodian Asvata/Azpha/... set on
# World_D_A). Generic UT_Marker_Gather icons keyed by SourceType.
GATHER_SOURCETYPE_SUBTYPES = {
    "Od":         "gatheringOd",
    "Herb":       "gatheringHerb",
    "Jewelry":    "gatheringJewelry",
    "Metal":      "gatheringMetal",
    "RareMetal":  "gatheringRareMetal",
    "Tree":       "gatheringTree",
    "Flower":     "gatheringFlower",
    "Berry":      "gatheringBerry",
    "Vegetable":  "gatheringVegetable",
    "Shellfish":  "gatheringShellfish",
}

# Display names for ALL gathering subtypes (specific materials + SourceType
# fallbacks), injected into the types locales. zh from the game L10N of each
# material; zh-TW falls back to OpenCC from zhCN when absent.
GATHER_SUBTYPE_NAMES = {
    # specific materials (Elyos set)
    "gatheringOdyle":            {"en": "Odyle",      "zhCN": "奥德", "ko": "오드"},
    "gatheringOrichalcumOre":    {"en": "Orichalcum", "zhCN": "奥里哈康", "ko": "오리하르콘"},
    "gatheringYggdrasilLog":     {"en": "Yggdrasil",  "zhCN": "世界树", "ko": "이그드라실"},
    "gatheringSapphireGemstone": {"en": "Sapphire",   "zhCN": "蓝宝石", "ko": "사파이어"},
    "gatheringDiamondGemstone":  {"en": "Diamond",    "zhCN": "钻石", "ko": "다이아몬드"},
    "gatheringRubyGemstone":     {"en": "Ruby",       "zhCN": "红宝石", "ko": "루비"},
    "gatheringAria":             {"en": "Aria",       "zhCN": "当归", "ko": "안젤리카"},
    "gatheringTargena":          {"en": "Targena",    "zhCN": "龙蒿", "ko": "타라곤"},
    "gatheringCoriolus":         {"en": "Coriolus",   "zhCN": "云芝", "ko": "코리올루스"},
    "gatheringKukuru":           {"en": "Kukuru",     "zhCN": "库库罗", "ko": "쿠쿠르"},
    "gatheringMela":             {"en": "Mela",       "zhCN": "梅拉", "ko": "멜라"},
    "gatheringInina":            {"en": "Inina",      "zhCN": "雪莉", "ko": "쉐리"},
    "gatheringCypri":            {"en": "Cypri",      "zhCN": "齐尔利", "ko": "킬리"},
    # specific materials (Asmodian set)
    "gatheringAsvata":           {"en": "Asvata",     "zhCN": "菩提", "ko": "아스바타"},
    "gatheringAzpha":            {"en": "Azpha",      "zhCN": "天涯草", "ko": "안누스"},
    "gatheringCalendula":        {"en": "Calendula",  "zhCN": "金盏花", "ko": "카렌두라"},
    "gatheringMorfa":            {"en": "Morfa",      "zhCN": "魔尔菇", "ko": "모르파"},
    "gatheringRaydam":           {"en": "Raydam",     "zhCN": "莱森树莓", "ko": "레이담"},
    "gatheringPujery":           {"en": "Pujery",     "zhCN": "波齐鲤", "ko": "푸제리"},
    "gatheringOhkra":            {"en": "Ohkra",      "zhCN": "秋葵", "ko": "오크라"},
    "gatheringConide":           {"en": "Conide",     "zhCN": "珂尼玳", "ko": "코니데"},
    # SourceType fallbacks
    "gatheringOd":        {"en": "Odyle",      "zhCN": "奥德", "zhTW": "奧德", "ko": "오드"},
    "gatheringHerb":      {"en": "Herb",       "zhCN": "草药", "zhTW": "草藥", "ko": "약초"},
    "gatheringJewelry":   {"en": "Gemstone",   "zhCN": "宝石", "zhTW": "寶石", "ko": "보석"},
    "gatheringMetal":     {"en": "Metal",      "zhCN": "金属", "zhTW": "金屬", "ko": "금속"},
    "gatheringRareMetal": {"en": "Rare Metal", "zhCN": "稀有金属", "zhTW": "稀有金屬", "ko": "희귀 금속"},
    "gatheringTree":      {"en": "Wood",       "zhCN": "木材", "zhTW": "木材", "ko": "목재"},
    "gatheringFlower":    {"en": "Flower",     "zhCN": "花卉", "zhTW": "花卉", "ko": "플라워"},
    "gatheringBerry":     {"en": "Berry",      "zhCN": "浆果", "zhTW": "漿果", "ko": "베리"},
    "gatheringVegetable": {"en": "Vegetable",  "zhCN": "蔬菜", "zhTW": "蔬菜", "ko": "채소"},
    "gatheringShellfish": {"en": "Shellfish",  "zhCN": "贝类", "zhTW": "貝類", "ko": "조개류"},
}

_cc_s2t = OpenCC("s2t")


def _to_tw(zh_cn: str) -> str:
    return _cc_s2t.convert(zh_cn) if zh_cn else ""


def _slug(name: str) -> str:
    """Stable region key from a subzone Name, e.g. ``DawnLegionBase_Subzone``
    -> ``DawnLegionBase`` (matches the curated region-key convention)."""
    s = re.sub(r"_Subzone$", "", name or "")
    s = re.sub(r"[^A-Za-z0-9]+", "", s)
    return s or (name or "unknown")


# --- Loaders --------------------------------------------------------------
def load_parsed() -> dict[str, dict]:
    out: dict[str, dict] = {}
    for p in sorted(PARSED_MAPS_DIR.glob("*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        out[d["Name"]] = d
    return out


def _round2(v: float) -> float:
    return round(float(v), 2)


def _pixel_scale(map_name: str) -> float | None:
    """Pixels per world-unit for a map (``pixel_width / (max_x - min_x)``), the
    X-axis factor of the world->pixel transform. Used to express marker ``z``
    (world height) in pixel units consistent with ``x``/``y``. ``None`` if no
    worldmap. NOTE: assumes a square pixel aspect (x-scale == y-scale), which
    holds for every current map; a non-square map would skew z vs y."""
    from .worldmap import WorldMapMeta
    from . import worldmap_path

    p = worldmap_path(map_name)
    if not p.exists():
        return None
    wm = WorldMapMeta.from_json(p, map_name)
    span = wm.max_x - wm.min_x
    return wm.pixel_width / span if span else None


# Faction suffix appended to the L10N base title, keyed by faction. Derived from
# the machine name; Abyss/Reshanta maps (no _L_/_D_) get no suffix. zh-TW is
# produced later by the existing _to_tw() pass over the zh-CN string.
_FACTION_SUFFIX = {
    "light": {"en": " (Elyos)", "zh-CN": "（天）", "ko": " (천족)"},
    "dark": {"en": " (Asmodian)", "zh-CN": "（魔）", "ko": " (마족)"},
}


def _faction(name: str) -> str | None:
    """Faction from the machine name: ``_L_`` -> light, ``_D_`` -> dark, else None."""
    if "_L_" in name:
        return "light"
    if "_D_" in name:
        return "dark"
    return None


def _map_display(name: str, l10n: L10N) -> dict[str, str]:
    """Composed map display names: L10N base title + faction suffix.

    Returns ``{"name_en", "name_zhCN", "name_ko"}`` (the shape ``_locale_block`` expects).
    Base falls back to ``name.replace("_", " ")`` when L10N has no body; zh/ko
    bases fall back to the en base when there is no localized body.
    """
    title = map_title(name, l10n)
    base_en = title["en"] or name.replace("_", " ")
    base_zh = title["zhCN"] or base_en
    base_ko = title["ko"] or base_en
    full_en, full_zh, full_ko = base_en, base_zh, base_ko
    fac = _faction(name)
    if fac:
        full_en = base_en + _FACTION_SUFFIX[fac]["en"]
        full_zh = base_zh + _FACTION_SUFFIX[fac]["zh-CN"]
        full_ko = base_ko + _FACTION_SUFFIX[fac]["ko"]
    # Full title (with faction suffix) + short title (base, no suffix). The
    # short form labels per-marker ids like hidden cubes ("斐尔特朗 #1").
    return {
        "name_en": full_en,
        "name_zhCN": full_zh,
        "name_ko": full_ko,
        "short_en": base_en,
        "short_zhCN": base_zh,
        "short_ko": base_ko,
    }


# --- Builders -------------------------------------------------------------
def _count_raw_tiles(name: str) -> tuple[int, int] | None:
    """Image-only maps (no ``Data/WorldMap/<map>.json``) — derive the tile grid
    by scanning the raw tile images ``UI/Map/WorldMap/<name>/Res/<name>_XX_YY.png``
    (filename index is ``_<x>_<y>`` = col_row, matching the frontend tile URL).

    Returns ``(tilesCountX, tilesCountY)`` or ``None`` when no tiles are found."""
    res = RAW_ROOT / "UI" / "Map" / "WorldMap" / name / "Res"
    if not res.is_dir():
        return None
    pat = re.compile(rf"^{re.escape(name)}_(\d+)_(\d+)\.png$")
    max_x = max_y = -1
    for f in res.glob(f"{name}_*.png"):
        m = pat.match(f.name)
        if not m:
            continue
        max_x = max(max_x, int(m.group(1)))
        max_y = max(max_y, int(m.group(2)))
    if max_x < 0:
        return None
    return max_x + 1, max_y + 1


def build_maps_yaml(parsed: dict[str, dict]) -> dict:
    """maps.yaml — visible maps with GameMapMeta. Tile grid derived from the
    parsed worldmap metadata (px = SectorSize * SectorPlaneSize / tileSize), or,
    for image-only maps with no WorldMap metadata, by counting the raw tiles."""
    from .worldmap import WorldMapMeta
    from . import worldmap_path

    maps = []
    for name, meta in sorted(MAP_META.items(), key=lambda kv: kv[1]["order"]):
        tile = 1024
        tiles_x = tiles_y = None
        wm_path = worldmap_path(name)
        if wm_path.exists():
            wm = WorldMapMeta.from_json(wm_path, name)
            tile = int(wm.sector_plane_size)
            tiles_x = wm.sector_count_x
            tiles_y = wm.sector_count_y
        else:
            # Image-only map (no WorldMap metadata): derive the grid from the
            # raw tile images. Tile size stays the default 1024 (mip0 size).
            counted = _count_raw_tiles(name)
            if counted is not None:
                tiles_x, tiles_y = counted
        # MapId from parse when available (else keep a deterministic id).
        map_id = str(parsed.get(name, {}).get("MapId", name))
        entry = {
            "id": map_id,
            "name": name,
            "type": meta["type"],
            "order": meta["order"],
            "isVisible": meta["isVisible"],
            "tileWidth": tile,
            "tileHeight": tile,
        }
        if tiles_x is not None:
            entry["tilesCountX"] = tiles_x
            entry["tilesCountY"] = tiles_y
        maps.append(entry)
    return {"maps": maps}


def build_markers(map_data: dict) -> tuple[list[dict], dict[str, dict]]:
    """Return (markers, locale_entries) for one map.

    locale_entries: {marker_id: {name, description}}.
    """
    markers: list[dict] = []
    locale: dict[str, dict] = {}
    counters: dict[str, int] = {}

    def next_index(subtype: str) -> int:
        i = counters.get(subtype, 0)
        counters[subtype] = i + 1
        return i

    # Creature subtypes count once PER PET, not per cluster: every spawn cluster
    # of the same pet shares one indexInSubtype, which is what the sidebar tallies
    # (subtypeCounts = unique indexInSubtype) and what completion keys on. The
    # marker `id` stays unique per cluster (it uses next_index).
    creature_pet_index: dict[tuple[str, str], int] = {}
    creature_pet_counter: dict[str, int] = {}

    def pet_index(subtype: str, pet_key: str) -> int:
        k = (subtype, pet_key)
        if k not in creature_pet_index:
            creature_pet_index[k] = creature_pet_counter.get(subtype, 0)
            creature_pet_counter[subtype] = creature_pet_index[k] + 1
        return creature_pet_index[k]

    name = map_data["Name"]

    # Pixel-scaled z for every marker: world Z (from each marker's Location[2])
    # times the map scale, so z shares units with x/y. None when unavailable.
    scale = _pixel_scale(name)

    def z_of(loc):
        if scale is None or not loc or len(loc) < 3 or loc[2] is None:
            return None
        return _round2(loc[2] * scale)

    # --- fragments (was monolithMaterial) from Fragments -------------------
    # Title shows the subtype label ("主神痕迹"); the per-marker locating info —
    # region name + a per-region running number — goes in the description, e.g.
    # "坎塔斯溪谷西部 #1". The region counter is independent of the global
    # indexInSubtype so each region's fragments number from #1.
    frag_names = EXTRA_SUBTYPE_NAMES["fragments"]
    region_counts: dict[str, int] = {}
    groups = {g["GroupName"]: g for g in map_data.get("MonolithGroups", [])}
    for f in map_data.get("Fragments", []):
        px = f.get("px")
        if not px:
            continue
        subtype = "fragments"
        idx = next_index(subtype)
        # NOTE: Fragment EnvObjId is NOT unique in the export (often repeated),
        # so we key by subtype + running index, which is unique by construction.
        mid = f"{name}-fragments-{idx}"
        grp = groups.get(f.get("GroupName"), {})
        region_key = _slug(grp.get("SubzoneName", ""))
        n = region_counts[region_key] = region_counts.get(region_key, 0) + 1
        region_en = grp.get("title_en", "")
        region_zh = grp.get("title_zhCN", "")
        region_ko = grp.get("title_ko", "")
        markers.append({
            "id": mid,
            "category": "collection",
            "subtype": subtype,
            "region": region_key,
            "x": _round2(px[0]),
            "y": _round2(px[1]),
            "z": z_of(f.get("Location")),
            "tier": FRAGMENTS_TIER,
            "images": [],
            "contributors": [],
            "indexInSubtype": idx,
            "fragmentType": f.get("Type", "ground"),
        })
        locale[mid] = {
            "name_en": frag_names["en"],
            "name_zhCN": frag_names["zhCN"],
            "name_zhTW": frag_names["zhTW"],
            "name_ko": frag_names.get("ko", frag_names["en"]),
            "desc_en": f"{region_en} #{n}" if region_en else f"#{n}",
            "desc_zhCN": f"{region_zh} #{n}" if region_zh else f"#{n}",
            "desc_ko": f"{region_ko} #{n}" if region_ko else f"#{n}",
        }

    # --- village / battlefield from Subzone IconType -----------------------
    for s in map_data.get("Subzones", []):
        icon_type = s.get("IconType")
        mapping = ICON_TYPE_TO_SUBTYPE.get(icon_type)
        if not mapping:
            continue
        px = s.get("px")
        if not px:
            continue
        category, subtype = mapping
        idx = next_index(subtype)
        mid = f"{name}-{subtype}-{s['ID']}"
        marker = {
            "id": mid,
            "category": category,
            "subtype": subtype,
            "region": _slug(s.get("Name", "")),
            "x": _round2(px[0]),
            "y": _round2(px[1]),
            "z": z_of(s.get("Location")),
            "images": [],
            "contributors": [],
            "indexInSubtype": idx,
        }
        # tier from the subzone's WorldMapUIRegion rank (1 -> tier 1, 2 -> tier
        # 3); OMIT when the subzone has no rank — never shown under LOD.
        tier = SUBZONE_RANK_TO_TIER.get(s.get("IconRank"))
        if tier is not None:
            marker["tier"] = tier
        markers.append(marker)
        locale[mid] = {
            "name_en": s.get("name_en", "") or s.get("Name", ""),
            "name_zhCN": s.get("name_zhCN", "") or s.get("Name", ""),
            "name_ko": s.get("name_ko", "") or s.get("Name", ""),
        }

    # --- world markers: teleport / seal / hiddenCube / gathering / dungeon /
    #     boss (from SpawnInfoList / instance gates / named spawns),
    #     transformed with the SAME px convention -----------------------------
    for w in map_data.get("WorldMarkers", []):
        px = w.get("px")
        if not px:
            continue
        kind = w.get("kind")
        if kind == "gathering":
            # subtype by SPECIFIC material when it maps to a legacy subtype,
            # else fall back to the broad SourceType subtype. category is always
            # 'gathering'.
            subtype = GATHER_MATERIAL_SUBTYPES.get(w.get("material"))
            if not subtype:
                subtype = GATHER_SOURCETYPE_SUBTYPES.get(w.get("sourceType"))
            if not subtype:
                continue
            category = "gathering"
        else:
            subtype = kind
            category = WORLD_MARKER_CATEGORY.get(subtype)
        if not category:
            continue
        idx = next_index(subtype)
        mid = f"{name}-{subtype}-{idx}"
        # Creatures: indexInSubtype is per-pet (clusters of one pet share it) so a
        # pet is counted/completed once; every other subtype is per-marker (== idx).
        index_in_subtype = (
            pet_index(subtype, w.get("petKey", mid)) if category == "creature" else idx
        )
        marker = {
            "id": mid,
            "category": category,
            "subtype": subtype,
            "x": _round2(px[0]),
            "y": _round2(px[1]),
            "z": z_of(w.get("Location")),
            "images": [],
            "contributors": [],
            "indexInSubtype": index_in_subtype,
        }
        tier = WORLD_MARKER_TIER.get(kind)
        if tier is not None:
            marker["tier"] = tier
        # Cluster size (creatures merge nearby spawns): drives the on-map count
        # badge. Only emitted when >1 so single markers stay lean.
        if w.get("count", 1) > 1:
            marker["count"] = w["count"]
        # Creatures carry a per-pet portrait icon (other subtypes use the
        # types.yaml subtype icon, so no per-marker icon).
        if w.get("icon"):
            marker["icon"] = w["icon"]
        if w.get("entity"):
            marker["entity"] = w["entity"]
        markers.append(marker)
        if subtype == "hiddenCube":
            # Title = subtype label ("隐藏背包"); the cube has no region, so the
            # description is just its running number ("#1").
            cube_names = EXTRA_SUBTYPE_NAMES["hiddenCube"]
            locale[mid] = {
                "name_en": cube_names["en"],
                "name_zhCN": cube_names["zhCN"],
                "name_zhTW": cube_names["zhTW"],
                "name_ko": cube_names.get("ko", cube_names["en"]),
                "desc_en": f"#{idx + 1}",
                "desc_zhCN": f"#{idx + 1}",
                "desc_ko": f"#{idx + 1}",
            }
        elif category == "creature":
            # Title = the localized pet name; description = how many spawn points
            # this cluster merged (so clustering isn't silently lossy).
            cnt = w.get("count", 1)
            locale[mid] = {
                "name_en": w.get("name_en", "") or str(idx + 1),
                "name_zhCN": w.get("name_zhCN", "") or str(idx + 1),
                "name_ko": w.get("name_ko", "") or w.get("name_en", "") or str(idx + 1),
                "desc_en": f"{cnt} spawn points",
                "desc_zhCN": f"{cnt} 处刷新点",
                "desc_ko": f"{cnt}곳의 리젠 지점",
            }
        else:
            locale[mid] = {
                "name_en": w.get("name_en", "") or str(idx + 1),
                "name_zhCN": w.get("name_zhCN", "") or str(idx + 1),
                "name_ko": w.get("name_ko", "") or w.get("name_en", "") or str(idx + 1),
            }

    markers.sort(key=lambda m: (m["subtype"], m["indexInSubtype"]))
    return markers, locale


def build_regions(map_data: dict) -> tuple[list[dict], dict[str, dict]]:
    """Emit one region per subzone *name*, with the REAL polygon boundary.

    Borders come from the parser's ``pxBorders`` (subzone polygon vertices from
    ``MapData.json`` ``SubzoneVolumeInfoMap``, transformed world->pixel with the
    SAME ``WorldMapTransform`` used for marker ``px``), so region outlines align
    with the village/battlefield/monolith markers. Subzones sharing a slug (e.g.
    several volumes for one named area) are merged into a multi-ring region so
    the region->marker linkage by slug is preserved.

    ``borders`` is ``number[][][]`` = list of rings, each ring a list of
    ``[x, y]`` pixel points (matches ``RegionInstance`` / ``GameMapBorders``).
    """
    regions: list[dict] = []
    locale: dict[str, dict] = {}
    by_key: dict[str, dict] = {}
    for s in map_data.get("Subzones", []):
        if not s.get("bMapEnabled", True):
            continue
        ring = s.get("pxBorders")
        if not ring or len(ring) < 3:
            continue
        # Close the ring so the de-duped border polylines join cleanly.
        ring = [[_round2(x), _round2(y)] for x, y in ring]
        if ring[0] != ring[-1]:
            ring = ring + [ring[0]]
        key = _slug(s.get("Name", ""))
        sub_type = (s.get("SubzoneType") or "").split("::")[-1].lower() or "subzone"
        if key not in by_key:
            by_key[key] = {
                "id": str(s["ID"]),
                "name": key,
                "type": sub_type,
                "borders": [ring],
            }
            locale[key] = {
                "name_en": s.get("name_en", "") or key,
                "name_zhCN": s.get("name_zhCN", "") or key,
                "name_ko": s.get("name_ko", "") or key,
            }
        else:
            by_key[key]["borders"].append(ring)
    regions = sorted(by_key.values(), key=lambda r: r["name"])
    return regions, locale


# --- JSON writing ---------------------------------------------------------
def _write_json(path: Path, data) -> None:
    """Write compact JSON (CJK stays readable thanks to ensure_ascii=False)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def _locale_block(entries: dict[str, dict], lang: str) -> dict:
    """{key: {name_en, name_zhCN, name_ko[, desc_en, desc_zhCN, desc_ko]}} -> {key: {name,
    description}} for a lang.

    When an entry carries no ``desc_*`` the description mirrors the name (the
    original behaviour, unchanged for maps/regions and every plain marker).
    Markers that want a distinct description (fragments, hiddenCube) supply
    ``desc_en`` / ``desc_zhCN`` / ``desc_ko``; zh-TW is OpenCC-converted from
    ``desc_zhCN``.
    """
    out = {}
    for key, v in entries.items():
        if lang == "en-US":
            name = v.get("name_en", "")
            desc = v.get("desc_en")
        elif lang == "zh-CN":
            name = v.get("name_zhCN", "")
            desc = v.get("desc_zhCN")
        elif lang == "ko-KR":
            name = v.get("name_ko") or v.get("name_en", "")
            desc = v.get("desc_ko") or v.get("desc_en")
        else:  # zh-TW
            # Prefer an explicit zh-TW name when given (OpenCC s2t mis-converts
            # some words, e.g. 背包 -> 揹包); fall back to converting zh-CN.
            name = v.get("name_zhTW") or _to_tw(v.get("name_zhCN", ""))
            desc = _to_tw(v["desc_zhCN"]) if v.get("desc_zhCN") else None
        name = name or key
        out[key] = {"name": name, "description": desc if desc else name}
        # Optional short name (currently maps: base title without faction suffix).
        if "short_en" in v or "short_zhCN" in v or "short_ko" in v:
            if lang == "en-US":
                short = v.get("short_en", "")
            elif lang == "zh-CN":
                short = v.get("short_zhCN", "")
            elif lang == "ko-KR":
                short = v.get("short_ko") or v.get("short_en", "")
            else:
                short = v.get("short_zhTW") or _to_tw(v.get("short_zhCN", ""))
            out[key]["shortName"] = short or name
    return out


def _types_locale(lang: str) -> dict:
    """Build the types-locale (category + subtype display names) for ``lang``.

    Carries the curated aion2 ``public/locales/<lang>/types.yaml`` and injects the
    single yellow ``hiddenCube`` name (NO faction / key suffix) from
    ``EXTRA_SUBTYPE_NAMES``, dropping any legacy hiddenCube* variants.
    """
    src = CURATED_LOCALES / lang / "types.yaml"
    data = yaml.safe_load(src.read_text(encoding="utf-8")) if src.exists() else {}
    data = data or {}
    subtypes = dict(data.get("subtypes", {}))
    # Drop legacy keys that this pipeline replaces: hiddenCube* variants,
    # monolithMaterial (-> fragments), and the legacy per-material gathering*
    # names (-> per-SourceType gathering* keys defined below).
    for legacy in ("hiddenCube", "hiddenCubeKeyOnly", "hiddenCubeLight",
                   "hiddenCubeDark", "monolithMaterial"):
        subtypes.pop(legacy, None)
    for legacy in [k for k in subtypes if k.startswith("gathering")]:
        subtypes.pop(legacy, None)

    def _pick(names: dict) -> str:
        if lang == "en-US":
            return names["en"]
        if lang == "zh-CN":
            return names["zhCN"]
        if lang == "ko-KR":
            return names.get("ko") or names["en"]
        return names.get("zhTW") or _to_tw(names["zhCN"])

    for sub, names in EXTRA_SUBTYPE_NAMES.items():
        name = _pick(names)
        subtypes[sub] = {"name": name, "description": name}
    for sub, names in GATHER_SUBTYPE_NAMES.items():
        name = _pick(names)
        subtypes[sub] = {"name": name, "description": name}
    data["subtypes"] = subtypes
    return data


def emit(only_map: str | None = None) -> None:
    parsed = load_parsed()
    if not parsed:
        raise SystemExit(f"No parsed maps found in {PARSED_MAPS_DIR}")

    DATA_REPO.mkdir(parents=True, exist_ok=True)

    # 1. maps.json
    _write_json(DATA_REPO / "maps.json", build_maps_yaml(parsed))

    # 2. types.json — compiled from the hand-authored data_src/types.yaml.
    if TYPES_SRC.exists():
        _write_json(DATA_REPO / "types.json", yaml.safe_load(TYPES_SRC.read_text(encoding="utf-8")))
    else:
        print(f"WARN: types source not found at {TYPES_SRC}")

    # 3. types locales — built from curated names + hiddenCube split.
    for lng in LANGS:
        _write_json(DATA_REPO / "locales" / lng / "types.json", _types_locale(lng))

    # 4. maps locales — localized titles from game L10N + faction suffix.
    l10n = L10N()
    maps_locale_entries = {name: _map_display(name, l10n) for name in MAP_META}
    for lng in LANGS:
        _write_json(
            DATA_REPO / "locales" / lng / "maps.json",
            _locale_block(maps_locale_entries, lng),
        )

    # 5. per-map markers + regions + their locales
    targets = [only_map] if only_map else list(parsed.keys())
    summary = {}
    for name in targets:
        md = parsed.get(name)
        if not md:
            print(f"WARN: no parsed data for {name}, skipping")
            continue
        markers, m_loc = build_markers(md)
        regions, r_loc = build_regions(md)

        # Marker ids must be globally unique per map (the frontend search index
        # rejects duplicate ids and would crash the app).
        ids = [m["id"] for m in markers]
        if len(ids) != len(set(ids)):
            dupes = {i for i in ids if ids.count(i) > 1}
            raise SystemExit(f"{name}: duplicate marker ids: {sorted(dupes)[:5]}")

        _write_json(DATA_REPO / "markers" / f"{name}.json", {"markers": markers})
        _write_json(DATA_REPO / "regions" / f"{name}.json", {"regions": regions})
        for lng in LANGS:
            _write_json(
                DATA_REPO / "locales" / lng / "markers" / f"{name}.json",
                _locale_block(m_loc, lng),
            )
            _write_json(
                DATA_REPO / "locales" / lng / "regions" / f"{name}.json",
                _locale_block(r_loc, lng),
            )
        by_sub: dict[str, int] = {}
        for m in markers:
            by_sub[m["subtype"]] = by_sub.get(m["subtype"], 0) + 1
        summary[name] = {"markers": len(markers), "regions": len(regions), "by_subtype": by_sub}

    # Maps present in MAP_META but not in the parse get empty files so the
    # frontend never 404s.
    for name, meta in MAP_META.items():
        if name in parsed:
            continue
        if not (DATA_REPO / "markers" / f"{name}.json").exists():
            _write_json(DATA_REPO / "markers" / f"{name}.json", {"markers": []})
        if not (DATA_REPO / "regions" / f"{name}.json").exists():
            _write_json(DATA_REPO / "regions" / f"{name}.json", {"regions": []})
        for lng in LANGS:
            mp = DATA_REPO / "locales" / lng / "markers" / f"{name}.json"
            rp = DATA_REPO / "locales" / lng / "regions" / f"{name}.json"
            if not mp.exists():
                _write_json(mp, {})
            if not rp.exists():
                _write_json(rp, {})

    print("Emitted FRONTEND data to", DATA_REPO)
    for name, s in summary.items():
        print(f"  {name}: {s['markers']} markers {s['by_subtype']}, {s['regions']} regions")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--map", dest="map", default=None, help="emit a single map, e.g. World_L_A")
    args = ap.parse_args()
    emit(args.map)


if __name__ == "__main__":
    main()
