"""Emit data/wiki/** from raw quest tables.

Run:  uv run python -m aion2.tools.wiki.emit_wiki
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import yaml
from opencc import OpenCC

from aion2.tools.maps import TOOLS_ROOT, map_table_key, worldmap_path
from aion2.tools.maps.extract import ORIENTATION, _table
from aion2.tools.maps.l10n import L10N
from aion2.tools.maps.subzones import map_data_path
from aion2.tools.maps.transform import WorldMapTransform
from aion2.tools.maps.worldmap import WorldMapMeta
from aion2.tools.wiki import entities, resolvers, tables, taxonomy

DATA_REPO = TOOLS_ROOT.parent / "data"
RESOURCE_REPO = TOOLS_ROOT.parent / "resource"
WIKI_CFG = TOOLS_ROOT / "data_src" / "wiki.yaml"
LANGS = ("en-US", "zh-CN", "zh-TW", "ko-KR")
_s2t = OpenCC("s2t")


def _write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(obj, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def ltext(l10n, key) -> dict:
    en, cn = l10n.en(key), l10n.zh_cn(key)
    ko = l10n.ko(key) or en
    return {"en": en, "zhCN": cn, "zhTW": _s2t.convert(cn) if cn else "", "ko": ko}


def _has_text(text: dict) -> bool:
    return any(text.values())


def _fallback_ltext(value: str | None) -> dict:
    value = value or ""
    return {"en": value, "zhCN": value, "zhTW": value, "ko": value}


def _ltext_or_fallback(l10n, key, fallback: str | None) -> dict:
    if key:
        text = ltext(l10n, key)
        if _has_text(text):
            return text
    return _fallback_ltext(fallback)


def _quest_ltext(l10n, quest_text_key: str | None, suffix: str) -> dict | None:
    if not quest_text_key:
        return None
    text = ltext(l10n, f"QuestString_{quest_text_key}_{suffix}")
    return text if _has_text(text) else None


def _emitted_map_names() -> list[str]:
    maps_json = DATA_REPO / "maps.json"
    if not maps_json.exists():
        return []
    return [
        m["name"]
        for m in json.loads(maps_json.read_text(encoding="utf-8")).get("maps", [])
    ]


def build_mapid_to_name(map_rows, wanted: set[str]) -> dict[int, str]:
    """Map table ID -> frontend map name for already-emitted maps."""
    by_table_name = {r.get("Name"): r for r in map_rows}
    out: dict[int, str] = {}
    for frontend_name in wanted:
        row = by_table_name.get(map_table_key(frontend_name))
        if not row:
            continue
        mid = tables.val(row.get("MapId")) or tables.val(row.get("ID"))
        if mid is not None:
            out[int(mid)] = frontend_name
    return out


def build_map_name_ltexts(l10n, map_rows, map_names: list[str]) -> dict[str, dict]:
    by_table_name = {r.get("Name"): r for r in map_rows}
    out: dict[str, dict] = {}
    for name in map_names:
        row = by_table_name.get(map_table_key(name))
        key = tables.l10n_key((row or {}).get("Desc"))
        out[name] = _ltext_or_fallback(l10n, key, name)
    return out


def build_spawn_indexes(
    map_names: list[str], npcs, env_objs=None
) -> tuple[dict, dict, dict, dict, dict]:
    spawn_idx, point_idx, npc_spawns = {}, {}, {}
    subzone_idx, region_geometry = {}, {}
    for name in map_names:
        md = json.loads(map_data_path(name).read_text(encoding="utf-8"))
        data = md["Properties"]["Data"]
        meta = WorldMapMeta.from_json(worldmap_path(name), name)
        tr = WorldMapTransform(meta, ORIENTATION)
        spawns = data.get("SpawnInfoList") or []
        spawn_idx[name] = resolvers.build_spawn_index(
            spawns, npcs, tr, env_objs=env_objs
        )
        point_idx[name] = resolvers.build_point_index(data, tr)
        subzone_idx[name] = resolvers.build_subzone_index(data)
        region_geometry[name] = resolvers.build_region_geometry(data, tr)
        for npc_id, pts in resolvers.build_npc_spawns(spawns, tr).items():
            npc_spawns.setdefault(npc_id, {})[name] = pts
    return spawn_idx, point_idx, npc_spawns, subzone_idx, region_geometry


def build_icon_index() -> dict[str, str]:
    root = RESOURCE_REPO / "UI" / "Resource" / "Texture" / "Item"
    if not root.exists():
        return {}
    return {
        p.stem: str(p.relative_to(RESOURCE_REPO)).replace("\\", "/")
        for p in root.rglob("*.webp")
    }


def _item_name_ltext(l10n, item) -> dict:
    return _ltext_or_fallback(l10n, item.get("descKey"), item.get("name"))


def _item_desc_ltext(l10n, item) -> dict | None:
    key = item.get("descLongKey")
    if not key:
        return None
    text = ltext(l10n, key)
    return text if _has_text(text) else None


def _npc_name_ltext(l10n, npc) -> dict:
    return _ltext_or_fallback(l10n, npc.get("descKey"), npc.get("name"))


def build_item_names(l10n, items=None) -> dict[str, dict]:
    if items is not None:
        return {
            item["name"]: _item_name_ltext(l10n, item)
            for item in items["by_id"].values()
            if item.get("name")
        }
    out = {}
    for r in _table("Item.json"):
        name = tables.val(r.get("Name"))
        key = tables.l10n_key(r.get("Desc")) or tables.l10n_key(r.get("DisplayName"))
        if name:
            out[name] = (
                ltext(l10n, key)
                if key
                else {"en": name, "zhCN": name, "zhTW": name, "ko": name}
            )
    return out


def build_npc_names(l10n, npcs) -> dict[str, dict]:
    return {
        n["name"]: _npc_name_ltext(l10n, n)
        for n in npcs["by_id"].values()
        if n.get("name")
    }


def _label_for_lang(labels: dict, lk: str) -> str:
    if lk == "zhTW" and labels.get("zhCN"):
        return _s2t.convert(labels["zhCN"])
    return labels.get(lk) or labels.get("en") or ""


def _section_label_for_lang(
    slug: str,
    lk: str,
    cfg: dict,
    map_name_ltext: dict[str, dict],
    fallback_sections: set[str],
) -> str:
    labels = (cfg.get("sections") or {}).get(slug)
    if labels:
        return _label_for_lang(labels, lk)
    if slug in map_name_ltext:
        return map_name_ltext[slug].get(lk) or map_name_ltext[slug].get("en") or slug
    fallback_sections.add(slug)
    return taxonomy.section_label(slug)


def _goal_label(goal, target_names: dict, l10n) -> dict:
    """Objective label: '<Type>: <localized target>' with raw-key fallback."""
    target = goal["values"][0] if goal["values"] else ""
    loc = target_names.get(target)
    base = loc if loc else {"en": target, "zhCN": target, "zhTW": target, "ko": target}
    return {k: f"{goal['type']}: {v}" if v else goal["type"] for k, v in base.items()}


def build_quest_entity(
    q,
    steps,
    rewards,
    l10n,
    mapid_to_name,
    spawn_index,
    name_to_id,
    prev_index,
    item_names,
    npc_names=None,
    item_ids=None,
    npc_name_to_id=None,
    point_index=None,
    subzone_index=None,
) -> dict:
    npc_names = npc_names or {}
    item_ids = item_ids or {}
    npc_name_to_id = npc_name_to_id or {}
    ent_steps = []
    for st in steps:
        objectives = []
        for index, g in enumerate(st["goals"], start=1):
            map_name = mapid_to_name.get(g["mapId"]) if g["mapId"] else None
            r = resolvers.resolve_goal(
                g,
                map_name,
                spawn_index,
                point_index=point_index,
                subzone_index=subzone_index,
            )
            label = _quest_ltext(
                l10n, q["textKey"], f"step{st['order']}_obj_{index}"
            ) or _goal_label(g, npc_names, l10n)
            objectives.append(
                {
                    "type": g["type"],
                    "label": label,
                    "marker": g["marker"],
                    "optional": g["optional"],
                    "mapName": map_name,
                    "pois": r["pois"],
                    "resolved": r["resolved"],
                    "target": (
                        {"type": "npc", "id": npc_name_to_id[g["values"][0]]}
                        if g["type"] in resolvers.NPC_GOALS and g["values"]
                        and g["values"][0] in npc_name_to_id
                        else None
                    ),
                    "region": r["region"],
                }
            )
        ent_steps.append({"order": st["order"], "objectives": objectives})

    rw = rewards.get(str(q["id"]).lstrip("0"), {"exp": 0, "items": [], "select": []})
    rw_items = [
        {
            "id": item_ids.get(i["item"]),
            "name": item_names.get(
                i["item"], {"en": i["item"], "zhCN": i["item"], "zhTW": i["item"], "ko": i["item"]}
            ),
            "count": i["count"],
        }
        for i in rw["items"]
    ]
    name = _quest_ltext(l10n, q["textKey"], "quest_title") or {
        "en": q["name"],
        "zhCN": q["name"],
        "zhTW": q["name"],
        "ko": q["name"],
    }
    return {
        "id": q["id"],
        "type": "quest",
        "name": name,
        "questType": q["type"],
        "race": (q["race"] or "All").lower(),
        "unlockLevel": q["unlockLevel"],
        "recommendedLevel": q["recommendedLevel"],
        "repeatable": q["repeatType"] == "Infinitely",
        "acquireMapName": (
            mapid_to_name.get(q["acquireMapId"]) if q["acquireMapId"] else None
        ),
        "steps": ent_steps,
        "rewards": {"exp": rw["exp"], "items": rw_items},
        "chain": {
            "next": name_to_id.get(q["nextQuestName"]),
            "prev": prev_index.get(q["name"], []),
        },
    }


def emit() -> None:
    l10n = L10N()
    quests = tables.parse_quests(_table("Quest.json"))
    steps = tables.parse_steps(_table("QuestStep.json"))
    rewards = tables.parse_rewards(_table("QuestReward.json"))
    npcs = tables.parse_npcs(_table("NpcData.json"))
    items = tables.parse_items(_table("Item.json"))
    loot = tables.parse_npc_loot(_table("NpcLoot.json"))
    routes = tables.parse_item_routes(_table("ItemGetRoute.json"))
    talks = tables.parse_npc_talks(_table("NpcTalk.json"))
    env_objs = {
        tables.val(r.get("ID")): tables.val(r.get("Name"))
        for r in _table("EnvObjData.json")
        if tables.val(r.get("ID")) is not None
    }
    cfg = yaml.safe_load(WIKI_CFG.read_text(encoding="utf-8"))

    map_rows = _table("Map.json")
    map_names = _emitted_map_names()
    mapid_to_name = build_mapid_to_name(map_rows, set(map_names))
    map_name_ltext = build_map_name_ltexts(l10n, map_rows, map_names)
    (
        spawn_index,
        point_index,
        npc_spawns,
        subzone_index,
        region_geometry,
    ) = build_spawn_indexes(map_names, npcs, env_objs)
    icon_index = build_icon_index()
    item_names = build_item_names(l10n, items)
    item_ids = {name: rec["id"] for name, rec in items["by_name"].items()}
    npc_names = build_npc_names(l10n, npcs)
    npc_name_to_id = {name: rec["id"] for name, rec in npcs["by_name"].items()}

    name_to_id = {q["name"]: q["id"] for q in quests}
    prev_index: dict[str, list[int]] = {}
    for q in quests:
        if q["nextQuestName"]:
            prev_index.setdefault(q["nextQuestName"], []).append(q["id"])

    quest_tree, unmatched = taxonomy.build_quest_tree(cfg, quests)
    quest_node = quest_tree["types"][0]
    quest_group_of = taxonomy.group_lookup(cfg["quest"])

    quest_docs, cover = [], {}
    for q in quests:
        ent = build_quest_entity(
            q,
            steps.get(q["name"], []),
            rewards,
            l10n,
            mapid_to_name,
            spawn_index,
            name_to_id,
            prev_index,
            item_names,
            npc_names,
            item_ids=item_ids,
            npc_name_to_id=npc_name_to_id,
            point_index=point_index,
            subzone_index=subzone_index,
        )
        _write_json(DATA_REPO / "wiki" / "quest" / f"{q['id']}.json", ent)
        quest_docs.append(
            {
                "id": q["id"],
                "group": quest_group_of.get(q["type"]),
                "section": q["part"] or "other",
                "race": ent["race"],
                "level": q["recommendedLevel"],
                "mapId": ent["acquireMapName"],
            }
        )
        for st in ent["steps"]:
            for ob in st["objectives"]:
                if ob["resolved"] is not None:
                    k = ob["type"]
                    hit, tot = cover.get(k, (0, 0))
                    cover[k] = (hit + (1 if ob["resolved"] else 0), tot + 1)

    quest_refs = entities.build_npc_quest_refs(quests, steps, talks)
    npc_docs: list[dict] = []
    emitted_npc_ids: list[int] = []
    for npc_id, npc in sorted(npcs["by_id"].items()):
        spawns_by_map = npc_spawns.get(npc_id, {})
        refs = quest_refs.get(npc.get("name"), [])
        if not spawns_by_map and not refs and not npc.get("named"):
            continue

        drops = []
        for item_id in loot.get(npc_id, []):
            item = items["by_id"].get(item_id)
            if not item:
                continue
            drops.append(
                {
                    "id": item["id"],
                    "name": _item_name_ltext(l10n, item),
                    "grade": item["grade"],
                    "icon": icon_index.get(item.get("iconRes")),
                }
            )
        ent = entities.build_npc_entity(
            npc, _npc_name_ltext(l10n, npc), spawns_by_map, refs, drops
        )
        _write_json(DATA_REPO / "wiki" / "npc" / f"{npc_id}.json", ent)
        emitted_npc_ids.append(npc_id)

        group = taxonomy.classify_npc(npc)
        if spawns_by_map:
            section = sorted(
                spawns_by_map.items(), key=lambda item: (-len(item[1]), item[0])
            )[0][0]
        else:
            section = "unknown"
        if group is not None:
            npc_docs.append(
                {
                    "id": npc["id"],
                    "group": group,
                    "section": section,
                    "race": taxonomy.npc_race(npc),
                    "level": npc["level"],
                    "mapId": section if section != "unknown" else None,
                    "grade": npc["grade"],
                }
            )

    dropped_by_ids: dict[int, set[int]] = {}
    for npc_id, item_ids_for_npc in loot.items():
        for item_id in item_ids_for_npc:
            dropped_by_ids.setdefault(item_id, set()).add(npc_id)
    for item_id, rec in routes.items():
        for npc_id in rec.get("monsters", []):
            dropped_by_ids.setdefault(item_id, set()).add(npc_id)

    dropped_by_index: dict[int, list[dict]] = {}
    for item_id, npc_ids in dropped_by_ids.items():
        rows = []
        for npc_id in sorted(npc_ids):
            npc = npcs["by_id"].get(npc_id)
            if not npc:
                continue
            rows.append(
                {
                    "id": npc["id"],
                    "name": _npc_name_ltext(l10n, npc),
                    "level": npc["level"],
                }
            )
        if rows:
            dropped_by_index[item_id] = rows

    valid_quest_ids = {str(v) for v in name_to_id.values()}
    reward_from_sets: dict[int, set[int]] = {}
    for quest_id_text, rw in rewards.items():
        if quest_id_text not in valid_quest_ids:
            continue
        quest_id = int(quest_id_text)
        for reward in (rw.get("items") or []) + (rw.get("select") or []):
            item = items["by_name"].get(reward.get("item"))
            if item:
                reward_from_sets.setdefault(item["id"], set()).add(quest_id)
    reward_from_index = {
        item_id: sorted(quest_ids)
        for item_id, quest_ids in reward_from_sets.items()
    }

    item_group_of = taxonomy.group_lookup(cfg["item"])
    item_docs: list[dict] = []
    for item_id, item in sorted(items["by_id"].items()):
        section = (
            item.get("category")
            or ("currency" if item.get("itemType") == "Currency" else "unknown")
        ).lower()
        ent = entities.build_item_entity(
            item,
            _item_name_ltext(l10n, item),
            _item_desc_ltext(l10n, item),
            icon_index.get(item.get("iconRes")),
            routes.get(item_id),
            reward_from_index.get(item_id, []),
            dropped_by_index.get(item_id, []),
        )
        _write_json(DATA_REPO / "wiki" / "item" / f"{item_id}.json", ent)
        item_docs.append(
            {
                "id": item["id"],
                "group": item_group_of.get(item["itemType"]),
                "section": section,
                "race": item["race"],
                "level": item["itemLevel"],
                "mapId": None,
                "grade": item["grade"],
            }
        )

    npc_node = taxonomy.build_type_node(
        "npc",
        cfg["npc"]["groups"],
        [
            {"group": d["group"], "section": d["section"], "sort": d["level"]}
            for d in npc_docs
        ],
    )
    item_node = taxonomy.build_type_node(
        "item",
        cfg["item"]["groups"],
        [
            {"group": d["group"], "section": d["section"], "sort": d["level"]}
            for d in item_docs
        ],
    )
    tree = {"types": [quest_node, npc_node, item_node]}

    _write_json(DATA_REPO / "wiki" / "index" / "quest.json", {"docs": quest_docs})
    _write_json(DATA_REPO / "wiki" / "index" / "npc.json", {"docs": npc_docs})
    _write_json(DATA_REPO / "wiki" / "index" / "item.json", {"docs": item_docs})
    _write_json(DATA_REPO / "wiki" / "taxonomy.json", tree)
    for map_name, regions in region_geometry.items():
        _write_json(
            DATA_REPO / "wiki" / "regions" / f"{map_name}.json",
            {"regions": regions},
        )

    def lang_key(lng):
        return {"en-US": "en", "zh-CN": "zhCN", "zh-TW": "zhTW", "ko-KR": "ko"}[lng]

    fallback_sections: set[str] = set()
    for lng in LANGS:
        lk = lang_key(lng)
        tax_loc = {}
        for type_slug in ("quest", "npc", "item"):
            type_cfg = cfg[type_slug]
            tax_loc[f"types.{type_slug}"] = {
                "name": _label_for_lang(type_cfg["labels"], lk)
            }
            for g in type_cfg["groups"]:
                tax_loc[f"groups.{type_slug}.{g['slug']}"] = {
                    "name": _label_for_lang(g["labels"], lk)
                }
        for t in tree["types"]:
            for g in t["groups"]:
                for s in g["sections"]:
                    tax_loc.setdefault(
                        f"sections.{s['slug']}",
                        {
                            "name": _section_label_for_lang(
                                s["slug"], lk, cfg, map_name_ltext, fallback_sections
                            )
                        },
                    )
        _write_json(DATA_REPO / "locales" / lng / "wiki" / "taxonomy.json", tax_loc)

        q_loc = {}
        for q in quests:
            nm = _quest_ltext(l10n, q["textKey"], "quest_title")
            q_loc[str(q["id"])] = {"name": (nm or {}).get(lk) or q["name"]}
        _write_json(DATA_REPO / "locales" / lng / "wiki" / "quest.json", q_loc)

        npc_loc = {}
        for npc_id in emitted_npc_ids:
            npc = npcs["by_id"][npc_id]
            nm = _npc_name_ltext(l10n, npc)
            npc_loc[str(npc_id)] = {"name": nm.get(lk) or npc["name"]}
        _write_json(DATA_REPO / "locales" / lng / "wiki" / "npc.json", npc_loc)

        item_loc = {}
        for item_id, item in sorted(items["by_id"].items()):
            nm = _item_name_ltext(l10n, item)
            item_loc[str(item_id)] = {"name": nm.get(lk) or item["name"]}
        _write_json(DATA_REPO / "locales" / lng / "wiki" / "item.json", item_loc)

    base = os.environ.get("SITE_BASE_URL", "https://example.invalid").rstrip("/")
    urls = [f"{base}/wiki"]
    entity_ids_by_type = {
        "quest": [d["id"] for d in quest_docs],
        "npc": emitted_npc_ids,
        "item": [d["id"] for d in item_docs],
    }
    for t in tree["types"]:
        type_slug = t["slug"]
        urls.append(f"{base}/wiki/{type_slug}")
        urls += [f"{base}/wiki/{type_slug}/{g['slug']}" for g in t["groups"]]
        urls += [
            f"{base}/wiki/{type_slug}/{entity_id}"
            for entity_id in entity_ids_by_type.get(type_slug, [])
        ]
    xml = "\n".join(
        [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            *[f"  <url><loc>{u}</loc></url>" for u in urls],
            "</urlset>",
        ]
    )
    (DATA_REPO / "wiki" / "sitemap.xml").parent.mkdir(parents=True, exist_ok=True)
    (DATA_REPO / "wiki" / "sitemap.xml").write_text(xml, encoding="utf-8")

    print(f"quests: {len(quests)}   unmatched types: {unmatched or 'none'}")
    for k, (hit, tot) in sorted(cover.items()):
        print(f"  {k:<14} {hit}/{tot} resolved ({hit / tot:.0%})")
    print(f"npcs: {len(emitted_npc_ids)} emitted, {len(npc_docs)} indexed")
    print(f"items: {len(item_docs)} emitted")
    if fallback_sections:
        print(f"WARN missing section labels: {sorted(fallback_sections)}")


def main() -> None:
    argparse.ArgumentParser(description="Emit wiki dataset").parse_args()
    emit()


if __name__ == "__main__":
    main()
