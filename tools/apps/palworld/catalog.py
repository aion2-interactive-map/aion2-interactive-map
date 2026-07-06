"""Catalog stage: emit the item / building / technology encyclopedias.

Companion to ``encyclopedia.py`` (which emits the Pal encyclopedia). This stage
reads the raw item, recipe, building and technology DataTables plus their L10N
text, computes the cross-reference graph (what crafts/drops/unlocks what) and
emits three datasets consumed by the palworld frontend's new /items, /buildings
and /technology pages.

Localized text is layered exactly as ``encyclopedia.py`` layers it (the mojibake
JA ``_Common`` base overlaid per-language from ``L10N/<folder>/Pal``), reusing
``_read_text`` / ``_text_by_lang`` / ``_all_tags`` from that module.

Cross-links (same id space throughout — item id == recipe product id ==
building material id; building id == UnlockBuildObjects entry; UnlockItemRecipes
entry == recipe row-key whose Product_Id is the crafted item):
  * item.recipe          — the recipe that crafts it (materials → item ids)
  * item.droppedBy       — pals that drop it        (inverted from pals.json)
  * item.partnerFor      — pals whose partner skill it unlocks (from pals.json)
  * item.usedInItems     — recipes that consume it  (→ product item ids)
  * item.usedInBuildings — buildings that consume it (→ building ids)
  * item.unlockTech      — techs that unlock its recipe
  * building.materials   — build cost (→ item ids)
  * building.unlockTech  — techs that unlock it
  * tech.unlockItems / tech.unlockBuildings — what a tech grants, by level

Item icons: DT_ItemIconDataTable_Common maps item id -> a texture under
``/Game/Others/InventoryItemIcon/Texture``. That ``Others`` tree lives in
Content/Others (one level above ``RAW`` = Content/Pal) and is now part of the
export, so items carry ``item_<id>.webp`` icons. The conversion is gated on the
PNG actually existing, so it degrades gracefully if a given export omits the tree.

Localized text guard: the game's L10N tables ship per-language PLACEHOLDER strings
for untranslated tier-variant rows (e.g. ``en Text`` / ``zh-hans text`` / ``-`` /
``ko_Text``); only the JA ``_Common`` base carries the real name (with a ``+N``
tier suffix). ``_ph`` detects these placeholders; item names then fall back to the
localized base item's name + the ``+N`` suffix, everything else to the JA base.

Outputs:
  data-palworld/items.json                 {items: [ItemEntry]}
  data-palworld/buildings.json             {buildings: [BuildingEntry]}
  data-palworld/technology.json            {techs: [TechEntry]}
  data-palworld/locales/<tag>/items.json       {id: {name, description?}}
  data-palworld/locales/<tag>/buildings.json   {id: {name, description?}}
  data-palworld/locales/<tag>/technology.json  {id: {name, description?}}
  data-palworld/locales/<tag>/labels.json       {item: {typeA: label}, building: {typeA: label}}
  resource-palworld/icons/build_<id>.webp
  resource-palworld/icons/item_<id>.webp

Run: ``uv run python -m palworld.catalog`` (from the ``tools`` dir), AFTER
``encyclopedia`` (this stage reads data-palworld/pals.json for drop inversion).
"""

from __future__ import annotations

import json
import os
import re
from collections import defaultdict
from pathlib import Path

from PIL import Image

from .encyclopedia import _all_tags, _read_text, _strip, _text_by_lang
from .maps.common import read_rows, round2, write_json

RAW = Path(os.environ.get("PALWORLD_RAW", "E:/SteamLibrary/steamapps/common/Palworld/Exports/Pal/Content/Pal"))
DATA_OUT = Path(os.environ.get("PALWORLD_DATA_OUT", "E:/aion2-map/data-palworld"))
RES_OUT = Path(os.environ.get("PALWORLD_RES_OUT", "E:/aion2-map/resource-palworld"))

_ITEM_A = "EPalItemTypeA::"
_ITEM_B = "EPalItemTypeB::"
_ELEM = "EPalElementType::"
_BLD_A = "EPalBuildObjectTypeA::"
_BLD_B = "EPalBuildObjectTypeB::"
_BLD_UI = "EPalBuildObjectTypeForUIDisplay::"
_ENERGY = "EPalEnergyType::"
_BOSS = "EPalBossType::"

_NONE = {None, "None", "", "EPalElementType::None", "EPalEnergyType::None", "EPalBossType::None"}

# Tokens embedded in technology name/description text.
_TOKEN_RE = re.compile(r"<(itemName|mapObjectName|uiCommon)\b[^>]*?id=\|([^|]+)\|[^>]*?/>")
_TAG_RE = re.compile(r"<[^>]+>")

# The game's L10N tables use per-language placeholder strings for untranslated
# rows: "en Text", "es_Text", "ko_Text", "zh-hans text", "zh-hant text", "-".
_PLACEHOLDER_RE = re.compile(r"^(?:-+|[a-z]{2}(?:-[a-z0-9]{2,4})?[ _]?text)$", re.IGNORECASE)
# Trailing tier suffix on a variant id (WeakerBow_2, AssaultRifle_Default2).
_VARIANT_SUFFIX_RE = re.compile(r"_?\d+$")


def _ph(s: str | None) -> str:
    """Return s if it's a real translation, else '' (empty or a placeholder)."""
    s = (s or "").strip()
    return "" if not s or _PLACEHOLDER_RE.match(s) else s


def _item_name(iid: str, iname: dict, ja_iname: dict, ja_name_to_id: dict) -> str:
    """Localized item name, healing placeholder tier-variant rows.

    Untranslated variants carry a placeholder in every language ("zh-hans text")
    while the JA base holds the real name with a "+N" tier suffix (アサルトライフル+1).
    We recover the localized name by matching the JA base ("アサルトライフル") back to
    its item id (AssaultRifle_Default1 -> 突击步枪) and re-appending "+N", so the
    result is fully localized (突击步枪+1). The id-suffix strip is a secondary
    heuristic (WeakerBow_2 -> WeakerBow). Failing both, the JA base string, then id.
    """
    nm = _ph(iname.get(iid))
    if nm:
        return nm
    ja = (ja_iname.get(iid) or "").strip()
    m = re.search(r"(\+\d+)$", ja)
    if m:
        base_ja = ja[: m.start()].rstrip()
        base_id = ja_name_to_id.get(base_ja)
        if not base_id:
            cand = _VARIANT_SUFFIX_RE.sub("", iid)
            base_id = cand if cand != iid else None
        if base_id:
            base_nm = _ph(iname.get(base_id))
            if base_nm:
                return base_nm + m.group(1)
    return _ph(ja) or iid


def _ci(d: dict, key: str) -> str | None:
    """Exact then case-insensitive lookup (MapObjectId vs MAPOBJECT_NAME_ key casing differs)."""
    if key in d:
        return d[key]
    lk = key.lower()
    for k, v in d.items():
        if k.lower() == lk:
            return v
    return None


def _materials(r: dict, n: int) -> list[dict]:
    out = []
    for i in range(1, n + 1):
        item = r.get(f"Material{i}_Id")
        cnt = r.get(f"Material{i}_Count", 0) or 0
        if item not in _NONE and cnt > 0:
            out.append({"item": item, "count": cnt})
    return out


def _food(r: dict) -> dict:
    f = {
        "satiety": r.get("RestoreSatiety", 0) or 0,
        "health": r.get("RestoreHealth", 0) or 0,
        "sanity": r.get("RestoreSanity", 0) or 0,
        "concentration": r.get("RestoreConcentration", 0) or 0,
    }
    return {k: v for k, v in f.items() if v}


def _equip(r: dict) -> dict:
    e = {
        "attack": r.get("PhysicalAttackValue", 0) or 0,
        "defense": r.get("PhysicalDefenseValue", 0) or 0,
        "hp": r.get("HPValue", 0) or 0,
        "shield": r.get("ShieldValue", 0) or 0,
        "magicAttack": r.get("MagicAttackValue", 0) or 0,
        "magicDefense": r.get("MagicDefenseValue", 0) or 0,
        "durability": r.get("Durability", 0) or 0,
        "magazine": r.get("MagazineSize", 0) or 0,
    }
    return {k: v for k, v in e.items() if v}


def _icon_basename(icon_rows: dict, bid: str) -> str | None:
    row = icon_rows.get(bid) or {}
    for field in ("SoftIcon", "Icon"):
        path = (row.get(field) or {}).get("AssetPathName")
        if path and path != "None":
            return path.split("/")[-1].split(".")[0]
    return None


def _resolve_tokens(text: str, item_names: dict, mapobj_names: dict, ui_names: dict) -> str:
    if not text:
        return ""

    def repl(m: re.Match) -> str:
        tag, tid = m.group(1), m.group(2)
        if tag == "itemName":
            return _ci(item_names, tid) or tid
        if tag == "mapObjectName":
            return _ci(mapobj_names, tid) or tid
        return _ci(ui_names, tid) or tid

    s = _TOKEN_RE.sub(repl, text)
    s = _TAG_RE.sub("", s)
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in s.split("\n")]
    return "\n".join(lines).strip()


def run_catalog(raw: Path, data_out: Path, res_out: Path) -> dict:
    raw, data_out, res_out = Path(raw), Path(data_out), Path(res_out)

    item_rows = read_rows(raw / "DataTable/Item/DT_ItemDataTable_Common.json")
    item_icon_rows = read_rows(raw / "DataTable/Item/DT_ItemIconDataTable_Common.json")
    recipe_rows = read_rows(raw / "DataTable/Item/DT_ItemRecipeDataTable_Common.json")
    bld_rows = read_rows(raw / "DataTable/MapObject/Building/DT_BuildObjectDataTable_Common.json")
    bld_icon_rows = read_rows(raw / "DataTable/MapObject/Building/DT_BuildObjectIconDataTable_Common.json")
    tech_rows = read_rows(raw / "DataTable/Technology/DT_TechnologyRecipeUnlock_Common.json")

    # --- localized text (all layered ja base + per-language) -----------------
    item_name_by_lang = _text_by_lang(raw, "DataTable/Text/DT_ItemNameText_Common.json", "ITEM_NAME_")
    item_desc_by_lang = _text_by_lang(raw, "DataTable/Text/DT_ItemDescriptionText_Common.json", "ITEM_DESC_")
    bld_name_by_lang = _text_by_lang(raw, "DataTable/Text/DT_MapObjectNameText_Common.json", "MAPOBJECT_NAME_")
    bld_desc_by_lang = _text_by_lang(raw, "DataTable/Text/DT_BuildObjectDescText_Common.json", "BUILDOBJECT_DESC_")
    tech_name_by_lang = _text_by_lang(raw, "DataTable/Text/DT_TechnologyNameText_Common.json", "")
    tech_desc_by_lang = _text_by_lang(raw, "DataTable/Text/DT_TechnologyDescText_Common.json", "")
    ui_by_lang = _text_by_lang(raw, "DataTable/Text/DT_UI_Common_Text_Common.json", "")
    # category labels: item TypeA -> COMMON_ITEMTYPE_A_<X> (in the UI table),
    # building TypeA -> CATEGORY_TYPE_A_<X> (in the build-object category table).
    item_type_by_lang = _text_by_lang(raw, "DataTable/Text/DT_UI_Common_Text_Common.json", "COMMON_ITEMTYPE_A_")
    bld_type_by_lang = _text_by_lang(raw, "DataTable/Text/DT_BuildObjectCategoryText.json", "CATEGORY_TYPE_A_")

    tags = _all_tags()

    def item_has_name(iid: str) -> bool:
        return any((item_name_by_lang.get(t, {}).get(iid) or "").strip() for t in tags)

    # --- items (inclusion gate: legal + has a localized name) ----------------
    item_ids = [
        iid for iid, r in item_rows.items()
        if r.get("bLegalInGame", True) and item_has_name(iid)
    ]
    item_id_set = set(item_ids)

    # recipe that crafts each item (row-key == product id in the vast majority;
    # index by Product_Id and keep the first).
    recipe_by_product: dict[str, dict] = {}
    for rid, r in recipe_rows.items():
        pid = r.get("Product_Id")
        if pid and pid not in _NONE and pid not in recipe_by_product:
            recipe_by_product[pid] = r

    # --- cross-reference indices --------------------------------------------
    used_in_items: dict[str, set] = defaultdict(set)
    used_in_buildings: dict[str, set] = defaultdict(set)
    dropped_by: dict[str, set] = defaultdict(set)
    partner_for: dict[str, set] = defaultdict(set)
    item_unlock_tech: dict[str, set] = defaultdict(set)
    bld_unlock_tech: dict[str, set] = defaultdict(set)

    for rid, r in recipe_rows.items():
        prod = r.get("Product_Id")
        if prod not in item_id_set:
            continue
        for m in _materials(r, 5):
            if m["item"] in item_id_set:
                used_in_items[m["item"]].add(prod)

    # buildings
    buildings = []
    for bid, r in bld_rows.items():
        name = any((bld_name_by_lang.get(t, {}) and _ci(bld_name_by_lang[t], bid)) for t in tags)
        if not name:
            continue
        mats = _materials(r, 4)
        for m in mats:
            if m["item"] in item_id_set:
                used_in_buildings[m["item"]].add(bid)
        buildings.append({"id": bid, "row": r, "materials": mats})

    building_id_set = {b["id"] for b in buildings}

    # pal drops / partner unlocks (from the already-emitted pal encyclopedia)
    pals_path = data_out / "pals.json"
    if pals_path.exists():
        pj = json.loads(pals_path.read_text(encoding="utf-8"))
        for p in pj.get("pals", []):
            for d in p.get("drops", []):
                if d.get("item") in item_id_set:
                    dropped_by[d["item"]].add(p["id"])
            ui = (p.get("partnerSkill") or {}).get("unlockItem")
            if ui in item_id_set:
                partner_for[ui].add(p["id"])
    else:
        print("catalog: WARNING data-palworld/pals.json missing — run encyclopedia first (no droppedBy)")

    # technology
    techs = []
    for tid, r in tech_rows.items():
        unlock_items, seen_i = [], set()
        for recipe_id in r.get("UnlockItemRecipes") or []:
            prod = (recipe_rows.get(recipe_id) or {}).get("Product_Id")
            if prod in item_id_set and prod not in seen_i:
                seen_i.add(prod)
                unlock_items.append(prod)
                item_unlock_tech[prod].add(tid)
        unlock_bld = []
        for b in r.get("UnlockBuildObjects") or []:
            if b in building_id_set:
                unlock_bld.append(b)
                bld_unlock_tech[b].add(tid)
        entry = {
            "id": tid,
            "level": r.get("LevelCap", 1),
            "cost": r.get("Cost", 0),
            "isBoss": bool(r.get("IsBossTechnology")),
            "unlockItems": unlock_items,
            "unlockBuildings": unlock_bld,
        }
        boss = _strip(r.get("RequireDefeatTowerBoss"), _BOSS)
        if boss and boss != "None":
            entry["requireBoss"] = boss
        req = r.get("RequireTechnology")
        if req and req not in _NONE:
            entry["requireTech"] = req
        techs.append(entry)
    techs.sort(key=lambda t: (t["level"], t["isBoss"], t["id"]))

    # --- assemble item entries ----------------------------------------------
    items = []
    for iid in item_ids:
        r = item_rows[iid]
        entry: dict = {
            "id": iid,
            "typeA": _strip(r.get("TypeA"), _ITEM_A),
            "typeB": _strip(r.get("TypeB"), _ITEM_B),
            "rarity": r.get("Rarity", 0),
            "rank": r.get("Rank", 0),
            "weight": round2(r.get("Weight", 0.0)),
            "price": int(r.get("Price", 0)),
            "maxStack": r.get("MaxStackCount", 0),
            "handcraft": bool(r.get("bEnableHandcraft")),
        }
        elem = _strip(r.get("ElementType"), _ELEM)
        if elem and elem != "None":
            entry["element"] = elem
        food = _food(r)
        if food:
            entry["food"] = food
        equip = _equip(r)
        if equip:
            entry["equip"] = equip
        rc = recipe_by_product.get(iid)
        if rc:
            recipe = {"work": round2(rc.get("WorkAmount", 0.0)), "materials": _materials(rc, 5)}
            gate = rc.get("UnlockItemID")
            if gate and gate not in _NONE:
                recipe["unlockItemId"] = gate
            entry["recipe"] = recipe
        if iid in dropped_by:
            entry["droppedBy"] = sorted(dropped_by[iid])
        if iid in partner_for:
            entry["partnerFor"] = sorted(partner_for[iid])
        if iid in used_in_items:
            entry["usedInItems"] = sorted(used_in_items[iid])
        if iid in used_in_buildings:
            entry["usedInBuildings"] = sorted(used_in_buildings[iid])
        if iid in item_unlock_tech:
            entry["unlockTech"] = sorted(item_unlock_tech[iid])
        items.append(entry)
    items.sort(key=lambda e: (e["typeA"], e["typeB"], e["id"]))

    # --- assemble building entries + icons -----------------------------------
    icons_dir = res_out / "icons"
    icons_dir.mkdir(parents=True, exist_ok=True)
    converted = 0

    def convert(src: Path, dest: Path) -> int:
        if dest.exists() or not src.exists():
            return 0
        with Image.open(src) as img:
            img = img.convert("RGBA") if img.mode not in ("RGB", "RGBA") else img
            img.save(dest, "WEBP", quality=90, method=6)
        return 1

    bld_out = []
    png_dirs = [raw / "Texture/BuildObject/PNG", raw / "Texture/BuildObject/Icon"]
    for b in buildings:
        bid, r, mats = b["id"], b["row"], b["materials"]
        entry = {
            "id": bid,
            "typeA": _strip(r.get("TypeA"), _BLD_A),
            "typeB": _strip(r.get("TypeB"), _BLD_B),
            "typeUI": _strip(r.get("TypeUIDisplay"), _BLD_UI),
            "rank": r.get("Rank", 0),
            "work": round2(r.get("RequiredBuildWorkAmount", 0.0)),
            "materials": mats,
        }
        energy = _strip(r.get("RequiredEnergyType"), _ENERGY)
        if energy and energy != "None":
            entry["energyType"] = energy
        if bid in bld_unlock_tech:
            entry["unlockTech"] = sorted(bld_unlock_tech[bid])
        # icon
        base = _icon_basename(bld_icon_rows, bid) or f"T_icon_buildObject_{bid}"
        dest = icons_dir / f"build_{bid}.webp"
        for d in png_dirs:
            if convert(d / f"{base}.png", dest):
                converted += 1
                break
        if dest.exists():
            entry["icon"] = f"build_{bid}"
        bld_out.append(entry)

    # item icons: DT_ItemIconDataTable_Common maps item id -> a texture under
    # /Game/Others/InventoryItemIcon/Texture. That tree lives in Content/Others,
    # one level above RAW (=Content/Pal). Gated on the PNG existing so it degrades
    # gracefully if the Others tree is absent from a given export.
    item_icon_dir = raw.parent / "Others/InventoryItemIcon/Texture"
    item_icons = 0
    for entry in items:
        base = _icon_basename(item_icon_rows, entry["id"])
        if not base:
            continue
        dest = icons_dir / f"item_{entry['id']}.webp"
        if convert(item_icon_dir / f"{base}.png", dest):
            item_icons += 1
        if dest.exists():
            entry["icon"] = f"item_{entry['id']}"

    write_json(data_out / "items.json", {"items": items})
    write_json(data_out / "buildings.json", {"buildings": bld_out})
    write_json(data_out / "technology.json", {"techs": techs})

    # --- localized text ------------------------------------------------------
    # JA base tables (tags[0] == JA_TAG): the only source with real strings for
    # rows the game left as per-language placeholders. Used as the last resort.
    ja = tags[0]
    ja_iname, ja_idesc = item_name_by_lang[ja], item_desc_by_lang[ja]
    ja_bname, ja_bdesc = bld_name_by_lang[ja], bld_desc_by_lang[ja]
    ja_tname, ja_tdesc = tech_name_by_lang[ja], tech_desc_by_lang[ja]
    ja_itype, ja_btype = item_type_by_lang[ja], bld_type_by_lang[ja]

    # category typeA values actually present in the emitted datasets
    item_types = sorted({e["typeA"] for e in items})
    bld_types = sorted({e["typeA"] for e in bld_out})

    # JA base name -> item id, so a variant's placeholder ("アサルトライフル+1")
    # can be re-localized via its base item (AssaultRifle_Default1 -> 突击步枪).
    ja_name_to_id: dict[str, str] = {}
    for iid in item_ids:
        n = _ph(ja_iname.get(iid))
        if n and n not in ja_name_to_id:
            ja_name_to_id[n] = iid

    tech_by_id = {t["id"]: t for t in techs}
    for tag in tags:
        iname, idesc = item_name_by_lang[tag], item_desc_by_lang[tag]
        bname, bdesc = bld_name_by_lang[tag], bld_desc_by_lang[tag]
        tname, tdesc, ui = tech_name_by_lang[tag], tech_desc_by_lang[tag], ui_by_lang[tag]

        items_loc = {}
        for iid in item_ids:
            nm = _item_name(iid, iname, ja_iname, ja_name_to_id)
            e = {"name": _resolve_tokens(nm, iname, bname, ui) or iid}
            d = _ph(idesc.get(iid)) or _ph(ja_idesc.get(iid))
            d = _resolve_tokens(d, iname, bname, ui)
            if d:
                e["description"] = d
            items_loc[iid] = e
        write_json(data_out / "locales" / tag / "items.json", items_loc)

        bld_loc = {}
        for b in bld_out:
            bid = b["id"]
            nm = _ph(_ci(bname, bid)) or _ph(_ci(ja_bname, bid)) or bid
            e = {"name": _resolve_tokens(nm, iname, bname, ui) or bid}
            d = _ph(_ci(bdesc, bid)) or _ph(_ci(ja_bdesc, bid))
            d = _resolve_tokens(d, iname, bname, ui)
            if d:
                e["description"] = d
            bld_loc[bid] = e
        write_json(data_out / "locales" / tag / "buildings.json", bld_loc)

        tech_loc = {}
        for tid, r in tech_rows.items():
            if tid not in tech_by_id:
                continue
            name_key, desc_key = r.get("Name") or "", r.get("Description") or ""
            raw_name = _ph(tname.get(name_key)) or _ph(ja_tname.get(name_key))
            name = _resolve_tokens(raw_name, iname, bname, ui)
            if not name:
                # fall back to the first unlocked entity's name
                t = tech_by_id[tid]
                if t["unlockBuildings"]:
                    bid0 = t["unlockBuildings"][0]
                    name = _ph(_ci(bname, bid0)) or _ph(_ci(ja_bname, bid0)) or bid0
                elif t["unlockItems"]:
                    name = _item_name(t["unlockItems"][0], iname, ja_iname, ja_name_to_id)
                else:
                    name = tid
            e = {"name": name}
            desc = _ph(tdesc.get(desc_key)) or _ph(ja_tdesc.get(desc_key))
            desc = _resolve_tokens(desc, iname, bname, ui)
            if desc:
                e["description"] = desc
            tech_loc[tid] = e
        write_json(data_out / "locales" / tag / "technology.json", tech_loc)

        itype, btype = item_type_by_lang[tag], bld_type_by_lang[tag]
        labels = {
            "item": {k: _ph(itype.get(k)) or _ph(ja_itype.get(k)) or k for k in item_types},
            "building": {k: _ph(btype.get(k)) or _ph(ja_btype.get(k)) or k for k in bld_types},
        }
        write_json(data_out / "locales" / tag / "labels.json", labels)

    print(
        f"catalog: {len(items)} items, {len(bld_out)} buildings, {len(techs)} techs, "
        f"{len(tags)} locales, {converted} building icons, {item_icons} item icons converted"
    )
    return {"items": items, "buildings": bld_out, "techs": techs}


if __name__ == "__main__":
    run_catalog(RAW, DATA_OUT, RES_OUT)
