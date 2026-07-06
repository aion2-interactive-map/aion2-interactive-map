"""Extract stage (port of extract.mjs).

Parses the raw Palworld UE export (persistent level actors, world-partition
cells, and DataTables) into an intermediate ``parsed.json`` consumed by ``emit``.
"""

from __future__ import annotations

import json
import math
import re
import subprocess
from pathlib import Path

from .common import js_round, read_rows

# L10N folder -> BCP47 tag. The game's BASE tables (SourceString) are authored
# in Japanese, so ja-JP is sourced from the base tables rather than an L10N folder.
L10N_LANG_TAGS = {
    "de": "de-DE", "en": "en-US", "es": "es-ES", "es-MX": "es-MX", "fr": "fr-FR",
    "id": "id-ID", "it": "it-IT", "ko": "ko-KR", "pl": "pl-PL", "pt-BR": "pt-BR",
    "ru": "ru-RU", "th": "th-TH", "tr": "tr-TR", "vi": "vi-VN",
    "zh-Hans": "zh-CN", "zh-Hant": "zh-TW",
}
JA_TAG = "ja-JP"

# Persistent-level actors (Maps/MainWorld_5/PL_MainWorld5.json).
POI_CLASSES = [
    ("fastTravel", re.compile(r"^BP_LevelObject_TowerFastTravelPoint_C$")),
    ("eagleStatue", re.compile(r"^BP_LevelObject_UnlockMapPoint_C$")),
    ("tower", re.compile(r"^BP_PalBossTower(_.+)?_C$")),
    ("dungeon", re.compile(r"^BP_DungeonPortalMarker_.+_C$")),
    ("treasureMap", re.compile(r"^BP_LevelObject_TreasureMapPoint_C$")),
    ("note", re.compile(r"^BP_LevelObject_Note_C$")),
    ("copper", re.compile(r"^BP_PalMapObjectSpawner_RockCopper_C$")),
    ("quartz", re.compile(r"^BP_PalMapObjectSpawner_RockQuartz_C$")),
    ("coal", re.compile(r"^BP_PalMapObjectSpawner_RockCoal_C$")),
    ("sulfur", re.compile(r"^BP_PalMapObjectSpawner_Sulfur_C$")),
]

# World-Partition cell actors. They appear at inconsistent LODs, so we scan every
# MainGrid cell referencing a target class and dedup by rounded world location.
CELL_CLASSES = [
    ("lifmunkEffigy", re.compile(r"^BP_LevelObject_Relic_C$")),
    ("skillFruit", re.compile(r"^BP_PalMapObjectSpawner_SkillFruits_.+_C$")),
    ("egg", re.compile(r"^bp_palmapobjectspawner_palegg_.+_C$", re.IGNORECASE)),
    ("chest", re.compile(r"^BP_PalMapObjectSpawner_Treasure_.+_C$")),
    ("camp", re.compile(r"^BP_NPCCampSpawner_.+_C$")),
    # Post-1.0 Oil Rig raid treasure boxes; exact `_C` excludes `_Goal_C`.
    ("oilrigTreasure", re.compile(r"^BP_OilrigTreasureBoxSpawner_C$")),
]
CELL_GREP = (
    "BP_LevelObject_Relic_C|BP_PalMapObjectSpawner_SkillFruits_|"
    "palmapobjectspawner_palegg_|BP_PalMapObjectSpawner_Treasure_|"
    "BP_NPCCampSpawner_|BP_OilrigTreasureBoxSpawner_C"
)

# Post-1.0 content not covered by the pre-1.0 taxonomy — surfaced for reporting.
NEW_TYPE_WATCH = [
    ("oilrigTreasure", "Oil Rig raid treasure boxes", "BP_OilrigTreasureBoxSpawner_C"),
    ("oilrigGoal", "Oil Rig raid goal points", "BP_OilrigTreasureBoxSpawner_Goal_C"),
    ("dlcCamp", "DLC syndicate camps (fold into camp)", "BP_NPCCampSpawner_DLC[0-9]"),
]

_CELLS_REL = "Maps/MainWorld_5/PL_MainWorld5/_Generated_"
_LEVEL_REL = "Maps/MainWorld_5/PL_MainWorld5.json"


def _match(classes, t: str):
    for subtype, rx in classes:
        if rx.match(t):
            return subtype
    return None


def _read_pal_names(table_path: Path) -> dict:
    rows = read_rows(table_path)
    names = {}
    for key, r in rows.items():
        if key.startswith("PAL_NAME_"):
            names[key[len("PAL_NAME_"):]] = r["TextData"]["SourceString"]
    return names


def _read_l10n_pal_names(raw: Path, folder: str, tag: str) -> dict:
    p = raw.parent / "L10N" / folder / "Pal/DataTable/Text/DT_PalNameText_Common.json"
    if not p.exists():
        raise RuntimeError(f"Missing Palworld L10N name table for {folder} ({tag}): {p}")
    return _read_pal_names(p)


def _read_respawn_names(table_path: Path) -> dict:
    # Base table holds ja SourceString; each L10N folder holds LocalizedString.
    if not table_path.exists():
        return {}
    rows = read_rows(table_path)
    m = {}
    for key, r in rows.items():
        td = r.get("TextData") or {}
        s = td.get("LocalizedString") or td.get("SourceString")
        if s:
            m[key] = s
    return m


def _read_text_by_lang(raw: Path, rel: str) -> dict:
    """{tag: {key: string}} for a text table, ja from base + each L10N folder
    layered over base (so missing translations fall back to ja)."""
    base = _read_respawn_names(raw / "DataTable/Text" / rel)
    by_lang = {JA_TAG: base}
    for folder, tag in L10N_LANG_TAGS.items():
        loc = _read_respawn_names(raw.parent / "L10N" / folder / "Pal/DataTable/Text" / rel)
        by_lang[tag] = {**base, **loc}
    return by_lang


def _ft_name_by_lng(ft_names: dict, point_id) -> dict | None:
    if not point_id:
        return None
    by_lng = {}
    for tag, table in ft_names.items():
        name = table.get(point_id) or table.get(f"{point_id}_Title")
        if name:
            by_lng[tag] = name
    return by_lng or None


def _strip_entrance_suffixes(name_maps: list[dict]) -> None:
    """Drop the shared trailing "Entrance" token per language (data-driven)."""
    langs = set()
    for m in name_maps:
        langs.update(m.keys())
    for lng in langs:
        counts: dict[str, int] = {}
        for m in name_maps:
            s = m.get(lng)
            i = s.rfind(" ") if s else -1
            if i < 0:
                continue
            tok = s[i + 1:]
            counts[tok] = counts.get(tok, 0) + 1
        suffix, best = None, 0
        for tok, n in counts.items():
            if n > best:
                best, suffix = n, tok
        if not suffix or best < 3:
            continue
        tail = f" {suffix}"
        for m in name_maps:
            if m.get(lng, "").endswith(tail):
                m[lng] = m[lng][: -len(tail)]


def _actor_location(actor: dict, exports: list) -> dict | None:
    obj_path = (actor.get("Properties") or {}).get("RootComponent", {}).get("ObjectPath")
    if not obj_path:
        return None
    idx = int(obj_path.split(".")[-1])
    if idx >= len(exports):
        return None
    loc = (exports[idx].get("Properties") or {}).get("RelativeLocation")
    if not loc:
        return None
    return {"X": loc["X"], "Y": loc["Y"], "Z": loc.get("Z", 0)}


def _grep_files(cwd: Path, pattern: str, includes: list[str]) -> list[str]:
    args = ["grep", "-rlEi", *[f"--include={g}" for g in includes], pattern, "."]
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, encoding="utf-8")
    if r.returncode not in (0, 1):
        raise RuntimeError(f"grep failed ({r.returncode}): {r.stderr}")
    return [ln for ln in r.stdout.split("\n") if ln.strip()]


def _extract_cell_pois(raw: Path) -> list[dict]:
    cells_dir = raw / _CELLS_REL
    files = _grep_files(
        cells_dir, CELL_GREP,
        ["MainGrid*.json", "oilrig_L0_*.json", "CloseRange_L0_*.json"],
    )
    pois: list[dict] = []
    seen = set()
    for rel in files:
        arr = json.loads((cells_dir / rel).read_text(encoding="utf-8"))
        for exp in arr:
            subtype = _match(CELL_CLASSES, exp.get("Type") or "")
            if not subtype:
                continue
            location = _actor_location(exp, arr)
            if not location:
                continue
            k = f"{subtype}|{js_round(location['X'] / 100)}|{js_round(location['Y'] / 100)}"
            if k in seen:
                continue
            seen.add(k)
            pois.append({"subtype": subtype, "sourceName": exp["Name"], "location": location})
    return pois


def _grep_count(cwd: Path, regex: str, target: str, include: str | None) -> int:
    args = ["grep", "-rhoEi"]
    if include:
        args.append(f"--include={include}")
    args += [regex, target]
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, encoding="utf-8")
    if r.returncode not in (0, 1):
        raise RuntimeError(f"grep failed ({r.returncode}): {r.stderr}")
    return len([ln for ln in r.stdout.split("\n") if ln])


def _count_new_type_candidates(raw: Path) -> dict:
    cells_dir = raw / _CELLS_REL
    level_file = str(raw / _LEVEL_REL)
    out = {}
    for key, desc, pattern in NEW_TYPE_WATCH:
        regex = f'"Type": "{pattern}[A-Za-z0-9_]*"'
        in_cells = _grep_count(cells_dir, regex, ".", "*.json")
        in_level = _grep_count(cells_dir, regex, level_file, None)
        out[key] = {"desc": desc, "pattern": pattern, "count": in_cells + in_level}
    return out


# ja/zh join a name prefix without a space; others use a space.
_CJK_TAIL = re.compile("[぀-ヿ㐀-鿿豈-﫿]")
_VARIANT_SUFFIX = re.compile(r"_(Ice|Fire|Dark|Ground|Electric|Grass|Water)$")


def run_extract(raw: Path) -> dict:
    raw = Path(raw)
    ui_rows = read_rows(raw / "DataTable/WorldMapUIData/DT_WorldMapUIData.json")
    bounds = {
        "MainWorld": {"min": ui_rows["MainMap"]["landScapeRealPositionMin"],
                      "max": ui_rows["MainMap"]["landScapeRealPositionMax"]},
        "WorldTree": {"min": ui_rows["Tree"]["landScapeRealPositionMin"],
                      "max": ui_rows["Tree"]["landScapeRealPositionMax"]},
    }

    ft_names = _read_text_by_lang(raw, "DT_MapRespawnPointInfoText.json")

    level = json.loads((raw / _LEVEL_REL).read_text(encoding="utf-8"))

    # Tower fast-travel points (both BP_LevelObject_ and BP_MapObject_ variants)
    # carry a FastTravelPointID keying the tower name; each tower actor sits at
    # exactly one (1:1 mutual nearest), so a nearest-point lookup resolves it.
    tower_ft_points = []
    for exp in level:
        if not (exp.get("Type") or "").endswith("TowerFastTravelPoint_C"):
            continue
        fid = (exp.get("Properties") or {}).get("FastTravelPointID")
        loc = _actor_location(exp, level)
        if fid and loc:
            tower_ft_points.append((fid, loc))

    def tower_name_by_lng(loc):
        best, bd = None, math.inf
        for fid, floc in tower_ft_points:
            d = math.hypot(floc["X"] - loc["X"], floc["Y"] - loc["Y"])
            if d < bd:
                bd, best = d, fid
        return _ft_name_by_lng(ft_names, best) if best is not None else None

    pois: list[dict] = []
    for exp in level:
        subtype = _match(POI_CLASSES, exp.get("Type") or "")
        if not subtype:
            continue
        location = _actor_location(exp, level)
        if not location:
            continue
        poi = {"subtype": subtype, "sourceName": exp["Name"], "location": location}
        if subtype == "fastTravel":
            nm = _ft_name_by_lng(ft_names, (exp.get("Properties") or {}).get("FastTravelPointID"))
            if nm:
                poi["nameByLng"] = nm
        elif subtype == "tower":
            nm = tower_name_by_lng(location)
            if nm:
                poi["nameByLng"] = nm
        pois.append(poi)
    _strip_entrance_suffixes([p["nameByLng"] for p in pois if p["subtype"] == "tower" and "nameByLng" in p])
    pois.extend(_extract_cell_pois(raw))

    boss_rows = read_rows(raw / "DataTable/UI/DT_BossSpawnerLoactionData.json")
    bosses = []
    for key, r in boss_rows.items():
        cid = r.get("CharacterID")
        if cid and re.match(r"^BOSS_", cid, re.IGNORECASE):
            bosses.append({
                "key": key, "characterId": cid, "level": r["Level"],
                "location": {"X": r["Location"]["X"], "Y": r["Location"]["Y"], "Z": r["Location"].get("Z", 0)},
            })

    # Wanted criminals: human bosses (CharacterID "None" + BOSS_* SpawnerID).
    human_names = _read_text_by_lang(raw, "DT_HumanNameText_Common.json")
    boss_npc_icon = read_rows(raw / "DataTable/Character/DT_PalBossNPCIcon.json")
    wanted_seen = set()
    wanted = []
    for r in boss_rows.values():
        sid = r.get("SpawnerID") or ""
        if r.get("CharacterID") and r.get("CharacterID") != "None":
            continue
        if not re.match(r"^BOSS_", sid, re.IGNORECASE):
            continue
        k = f"{sid}|{js_round(r['Location']['X'])}|{js_round(r['Location']['Y'])}"
        if k in wanted_seen:
            continue
        wanted_seen.add(k)
        name_by_lng = {}
        for tag, table in human_names.items():
            nm = table.get(f"NAME_{sid}")
            if nm:
                name_by_lng[tag] = nm
        icon_asset = (boss_npc_icon.get(sid, {}).get("Icon") or {}).get("AssetPathName", "")
        icon_stem = icon_asset.split(".")[-1] if icon_asset else ""
        entry = {"spawnerId": sid, "level": r["Level"],
                 "location": {"X": r["Location"]["X"], "Y": r["Location"]["Y"], "Z": r["Location"].get("Z", 0)}}
        if icon_stem:
            entry["icon"] = icon_stem
        if name_by_lng:
            entry["nameByLng"] = name_by_lng
        wanted.append(entry)

    wild_rows = read_rows(raw / "DataTable/Spawner/DT_PalWildSpawner.json")
    # A SpawnerName spans MANY rows — an area spawner lists each of its possible
    # pals (and day/night, level-band, weather variants) in its own row. Aggregate
    # the union of pals per name; keying by name alone would keep only the last row
    # and drop the rest (most wild pals). Dedup by pal id, widening the level band.
    wild_by_name: dict[str, dict[str, dict]] = {}
    for r in wild_rows.values():
        name = r["SpawnerName"]
        for n in (1, 2, 3):
            pid = r.get(f"Pal_{n}")
            if not pid or pid == "None":
                continue
            slot = wild_by_name.setdefault(name, {})
            lv_min, lv_max = r[f"LvMin_{n}"], r[f"LvMax_{n}"]
            cur = slot.get(pid)
            if cur:
                cur["lvMin"] = min(cur["lvMin"], lv_min)
                cur["lvMax"] = max(cur["lvMax"], lv_max)
            else:
                slot[pid] = {"id": pid, "lvMin": lv_min, "lvMax": lv_max}
    place_rows = read_rows(raw / "DataTable/Spawner/DT_PalSpawnerPlacement.json")
    pal_spawns = []
    for r in place_rows.values():
        if r.get("SpawnerType") != "EPalSpawnedCharacterType::Common":
            continue
        pals = wild_by_name.get(r["SpawnerName"])
        if not pals:
            continue
        pal_spawns.append({
            "spawnerName": r["SpawnerName"], "pals": list(pals.values()),
            "location": {"X": r["Location"]["X"], "Y": r["Location"]["Y"], "Z": r["Location"].get("Z", 0)},
        })

    # Paldeck order metadata.
    mon_param = read_rows(raw / "DataTable/Character/DT_PalMonsterParameter.json")
    pal_meta = {}
    for pid, r in mon_param.items():
        pal_meta[pid] = {"zukanIndex": r.get("ZukanIndex", -1), "zukanIndexSuffix": r.get("ZukanIndexSuffix", "")}

    names_by_lang = {tag: _read_l10n_pal_names(raw, folder, tag) for folder, tag in L10N_LANG_TAGS.items()}
    names_by_lang[JA_TAG] = _read_pal_names(raw / "DataTable/Text/DT_PalNameText_Common.json")

    pal_icons = sorted(
        p.stem for p in (raw / "Texture/PalIcon/Normal").iterdir() if p.suffix == ".png"
    )
    pal_icon_set = set(pal_icons)

    # Predators: BP_PalSpawner_Sheets_*_PreBOSS_* actors in the cells.
    predator_prefix = {JA_TAG: _prefix(raw / "DataTable/Text/DT_NamePrefixText_Common.json")}
    for folder, tag in L10N_LANG_TAGS.items():
        predator_prefix[tag] = _prefix(
            raw.parent / "L10N" / folder / "Pal/DataTable/Text/DT_NamePrefixText_Common.json"
        ) or predator_prefix[JA_TAG]
    sheet_dir = raw / "Blueprint/Spawner/SheetsVariant"
    predator_sheet: dict[str, dict] = {}  # spawner-class Type -> {pal, level}
    for f in sheet_dir.iterdir():
        if "PreBOSS" not in f.name or f.suffix != ".json":
            continue
        for e in json.loads(f.read_text(encoding="utf-8")):
            for g in (e.get("Properties") or {}).get("SpawnGroupList") or []:
                for pl in g.get("PalList") or []:
                    if (pl.get("PalId") or {}).get("Key", "").startswith("PREDATOR_"):
                        predator_sheet[e["Type"]] = {"pal": pl["PalId"]["Key"], "level": pl["Level"]}

    def predator_name(base: str) -> dict:
        out = {}
        for tag, names in names_by_lang.items():
            pn = names.get(base) or names.get(_VARIANT_SUFFIX.sub("", base))
            if not pn:
                continue
            pre = predator_prefix.get(tag)
            if pre:
                sep = "" if _CJK_TAIL.search(pre[-1]) else " "
                out[tag] = f"{pre}{sep}{pn}"
            else:
                out[tag] = pn
        return out

    predators = []
    cells_dir = raw / _CELLS_REL
    pred_files = _grep_files(cells_dir, "PreBOSS", ["MainGrid*.json"])
    pred_seen = set()
    for rel in pred_files:
        arr = json.loads((cells_dir / rel).read_text(encoding="utf-8"))
        for e in arr:
            info = predator_sheet.get(e.get("Type"))
            if not info:
                continue
            location = _actor_location(e, arr)
            if not location:
                continue
            k = f"{info['pal']}|{js_round(location['X'] / 100)}|{js_round(location['Y'] / 100)}"
            if k in pred_seen:
                continue
            pred_seen.add(k)
            base = info["pal"][len("PREDATOR_"):]
            icon_stem = f"T_{base}_icon_normal"
            nm = predator_name(base)
            entry = {"pal": info["pal"], "level": info["level"], "location": location}
            if icon_stem in pal_icon_set:
                entry["icon"] = icon_stem
            if nm:
                entry["nameByLng"] = nm
            predators.append(entry)

    new_type_candidates = _count_new_type_candidates(raw)

    return {
        "bounds": bounds, "pois": pois, "bosses": bosses, "wanted": wanted,
        "predators": predators, "palSpawns": pal_spawns, "palMeta": pal_meta,
        "namesByLang": names_by_lang, "palIcons": pal_icons,
        "newTypeCandidates": new_type_candidates,
    }


def _prefix(path: Path):
    try:
        r = read_rows(path).get("PREDATOR_NAME") or {}
        td = r.get("TextData") or {}
        return td.get("LocalizedString") or td.get("SourceString")
    except (FileNotFoundError, OSError, KeyError, IndexError):
        return None


def write_parsed(raw: Path, out_dir: Path) -> dict:
    from .common import dumps  # local import to avoid cycle at module load
    out = run_extract(raw)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "parsed.json").write_text(dumps(out), encoding="utf-8")
    return out


def read_parsed(out_dir: Path) -> dict:
    p = json.loads((Path(out_dir) / "parsed.json").read_text(encoding="utf-8"))
    return p
