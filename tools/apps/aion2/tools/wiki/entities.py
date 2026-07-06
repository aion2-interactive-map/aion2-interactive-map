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
