"""Pure parsers: UE columnar table rows -> plain dict records. No IO here."""
from __future__ import annotations

import re


def val(x):
    """Unwrap UE ``{"Value": v}`` scalars; normalize empty sentinels to None."""
    if isinstance(x, dict) and "Value" in x:
        x = x["Value"]
    if x in (None, "None", ""):
        return None
    return x


def enum(x):
    """Convert ``EQuestType::Hero`` to ``Hero``."""
    if not x or x == "None":
        return None
    out = str(x).split("::")[-1]
    return None if out in ("None", "") else out


def item_tier(x) -> int:
    """Convert ``EItemTier::t2`` to ``2``; unknown/missing tiers become 0."""
    tier = enum(x)
    if not tier:
        return 0
    match = re.fullmatch(r"t(\d+)", str(tier), flags=re.IGNORECASE)
    return int(match.group(1)) if match else 0


def l10n_key(x):
    """Unwrap ``{"Key": "STR_..."}`` localization-key fields."""
    if isinstance(x, dict):
        key = x.get("Key")
        return None if key in (None, "None", "") else key
    return None if x in (None, "None", "") else x


def parse_quests(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        out.append(
            {
                "id": val(r["ID"]),
                "name": r.get("Name"),
                "type": enum(r.get("Type")),
                "race": enum(r.get("Race")),
                "part": val(r.get("Part")),
                "grade": enum(r.get("Grade")),
                "unlockLevel": val(r.get("UnlockLevel")) or 0,
                "recommendedLevel": val(r.get("RecommendedLevel")) or 0,
                "textKey": r.get("QuestText"),
                "acquireMapId": val(r.get("AcquireMapId")),
                "acquireBeforeNpcTalk": val(r.get("AcquireBeforeNpcTalk")),
                "acquireAfterNpcTalk": val(r.get("AcquireAfterNpcTalk")),
                "completeMapId": val(r.get("CompleteMapId")),
                "completeNpcTalk": val(r.get("CompleteNpcTalk")),
                "nextQuestName": val(r.get("NextQuestName")),
                "repeatType": enum(r.get("RepeatType")),
            }
        )
    return out


def parse_steps(rows: list[dict]) -> dict[str, list[dict]]:
    """QuestName -> steps sorted by Order, each with parsed goals."""
    by_quest: dict[str, list[dict]] = {}
    for r in rows:
        goals = []
        for g in r.get("GoalList") or []:
            values = [v for v in (val(v) for v in (g.get("Value") or [])) if v]
            goals.append(
                {
                    "type": enum(g.get("Type")),
                    "values": values,
                    "mapId": val(g.get("MapId")),
                    "movePoint": val(g.get("QuestMovePointName")),
                    "marker": bool(g.get("bMarker")),
                    "optional": bool(g.get("bOptional")),
                }
            )
        by_quest.setdefault(r["QuestName"], []).append(
            {"order": r.get("Order") or 0, "goals": goals}
        )
    for steps in by_quest.values():
        steps.sort(key=lambda s: s["order"])
    return by_quest


def parse_rewards(rows: list[dict]) -> dict[str, dict]:
    """Group -> rewards, merging fixed item reward arrays; select stays separate."""
    out: dict[str, dict] = {}
    for r in rows:
        items = [
            {"item": i.get("Item"), "count": val(i.get("Count")) or 0}
            for i in (r.get("ItemRewards") or []) + (r.get("ItemNormalRewards") or [])
            if i.get("Item")
        ]
        select = [
            {"item": i.get("Item"), "count": val(i.get("Count")) or 0}
            for i in (r.get("ItemSelectRewards") or [])
            if i.get("Item")
        ]
        out[str(r.get("Group")).lstrip("0")] = {
            "exp": val(r.get("ExpReward")) or 0,
            "items": items,
            "select": select,
        }
    return out


def parse_npcs(rows: list[dict]) -> dict:
    """Build NPC indexes by numeric id and by string table name."""
    by_id, by_name = {}, {}
    for r in rows:
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
        if rec["id"] is not None:
            by_id[rec["id"]] = rec
        if rec["name"]:
            by_name[rec["name"]] = rec
    return {"by_id": by_id, "by_name": by_name}


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
            "tier": item_tier(r.get("ItemTier")),
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
