import json
from pathlib import Path

from aion2.tools.wiki import emit_wiki, tables

FIX = Path(__file__).parent / "fixtures"


class FakeL10N:
    def en(self, key):
        return f"EN:{key}" if key else ""

    def zh_cn(self, key):
        return f"CN:{key}" if key else ""

    def ko(self, key):
        return f"KO:{key}" if key else ""


def test_build_quest_entity_shape():
    quests = tables.parse_quests(
        json.loads((FIX / "quest_sample.json").read_text(encoding="utf-8"))
    )
    steps = tables.parse_steps(
        json.loads((FIX / "queststep_sample.json").read_text(encoding="utf-8"))
    )
    q = quests[0]
    ent = emit_wiki.build_quest_entity(
        q,
        steps.get(q["name"], []),
        rewards={},
        l10n=FakeL10N(),
        mapid_to_name={},
        spawn_index={},
        name_to_id={q["name"]: q["id"]},
        prev_index={},
        item_names={},
    )
    assert ent["id"] == q["id"] and ent["type"] == "quest"
    assert set(ent["name"]) == {"en", "zhCN", "zhTW", "ko"}
    assert isinstance(ent["steps"], list)
    for st in ent["steps"]:
        for ob in st["objectives"]:
            assert set(ob) >= {"type", "label", "marker", "optional", "pois", "mapName"}
    assert "rewards" in ent and "chain" in ent


def test_quest_entity_reward_items_have_id_and_objective_target():
    quests = tables.parse_quests(
        json.loads((FIX / "quest_sample.json").read_text(encoding="utf-8"))
    )
    steps = tables.parse_steps(
        json.loads((FIX / "queststep_sample.json").read_text(encoding="utf-8"))
    )
    q = quests[0]
    steps_for_q = [dict(st, goals=list(st["goals"])) for st in steps.get(q["name"], [])]
    steps_for_q.append({
        "order": 99,
        "goals": [{
            "type": "KillNpc",
            "values": ["NPC_A"],
            "mapId": 1000,
            "movePoint": None,
            "marker": True,
            "optional": False,
        }],
    })
    ent = emit_wiki.build_quest_entity(
        q,
        steps_for_q,
        rewards={str(q["id"]): {"exp": 0, "items": [{"item": "IT_A", "count": 1}], "select": []}},
        l10n=FakeL10N(),
        mapid_to_name={1000: "World_L_A"},
        spawn_index={},
        name_to_id={q["name"]: q["id"]},
        prev_index={},
        item_names={"IT_A": {"en": "Item A", "zhCN": "Item A", "zhTW": "Item A", "ko": "Item A"}},
        item_ids={"IT_A": 5},
        npc_name_to_id={"NPC_A": 7},
    )
    assert ent["rewards"]["items"][0]["id"] == 5
    kill = next(o for st in ent["steps"] for o in st["objectives"] if o["type"] == "KillNpc")
    assert kill["target"] == {"type": "npc", "id": 7}
    assert "region" in kill


def test_quest_entity_enter_subzone_region_uses_numeric_id():
    quests = tables.parse_quests(
        json.loads((FIX / "quest_sample.json").read_text(encoding="utf-8"))
    )
    q = quests[0]
    ent = emit_wiki.build_quest_entity(
        q,
        [{"order": 1, "goals": [{
            "type": "EnterSubZone",
            "values": ["SZ_A"],
            "mapId": 1000,
            "movePoint": None,
            "marker": True,
            "optional": False,
        }]}],
        rewards={},
        l10n=FakeL10N(),
        mapid_to_name={1000: "World_L_A"},
        spawn_index={},
        name_to_id={q["name"]: q["id"]},
        prev_index={},
        item_names={},
        subzone_index={"World_L_A": {"SZ_A": "2096"}},
    )
    objective = ent["steps"][0]["objectives"][0]
    assert objective["region"] == {"mapName": "World_L_A", "id": "2096"}
