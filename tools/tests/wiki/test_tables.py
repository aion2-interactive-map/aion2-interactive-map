import json
from pathlib import Path

from aion2.tools.wiki import tables

FIX = Path(__file__).parent / "fixtures"


def _load(name):
    return json.loads((FIX / name).read_text(encoding="utf-8"))


def test_val_unwraps_ue_scalars():
    assert tables.val({"Value": 1100010}) == 1100010
    assert tables.val(7) == 7
    assert tables.val("None") is None
    assert tables.val(None) is None


def test_enum_strips_prefix():
    assert tables.enum("EQuestType::Hero") == "Hero"
    assert tables.enum("ERace::Light") == "Light"
    assert tables.enum("EClassType::None") is None
    assert tables.enum("None") is None
    assert tables.enum(None) is None


def test_parse_quests_builds_records():
    qs = tables.parse_quests(_load("quest_sample.json"))
    q = qs[0]
    assert isinstance(q["id"], int)
    assert q["name"]
    assert q["type"] in {
        "Hero",
        "District",
        "DutyMission",
        "DutyScroll",
        "Ascension",
        "Daevagauge",
        "Exploration",
        "GatherCraftMastery",
    }
    assert q["race"] in {"Light", "Dark", "All"}
    assert "textKey" in q and "part" in q and "nextQuestName" in q


def test_parse_steps_groups_and_sorts_by_order():
    steps = tables.parse_steps(_load("queststep_sample.json"))
    quest_name = next(iter(steps))
    orders = [s["order"] for s in steps[quest_name]]
    assert orders == sorted(orders)
    goal = steps[quest_name][0]["goals"][0]
    assert set(goal) >= {"type", "values", "mapId", "marker", "optional"}


def test_parse_rewards_indexes_by_group():
    rw = tables.parse_rewards(_load("questreward_sample.json"))
    g, r = next(iter(rw.items()))
    assert isinstance(g, str)
    assert isinstance(r["exp"], int)
    assert isinstance(r["items"], list)


def test_parse_npcs_extended_fields():
    npcs = tables.parse_npcs(_load("npcdata_sample.json"))
    rec = next(iter(npcs["by_id"].values()))
    for key in ("npcType", "subType", "grade", "funcType", "relationship"):
        assert key in rec


def test_parse_items_by_id_and_name():
    items = tables.parse_items(_load("item_sample.json"))
    rec = next(iter(items["by_id"].values()))
    assert rec["id"] and rec["name"]
    assert set(rec) >= {"descKey", "descLongKey", "iconRes", "grade", "tier",
                        "itemLevel", "itemType", "category", "race", "stats",
                        "sellPrice", "maxStack"}
    assert items["by_name"][rec["name"]] is rec


def test_parse_items_numeric_tier_and_none_category():
    rows = [{
        "ID": {"Value": 1},
        "Name": "IT_Tiered",
        "Desc": {"Key": "IT_Tiered_desc"},
        "DescLong": {"Key": "None"},
        "IconRes": "Icon_A",
        "ItemGrade": "EItemGrade::Rare",
        "ItemTier": "EItemTier::t2",
        "ItemLevel": 10,
        "ItemType": "EItemType::Equip",
        "EquipCategory": "EEquipCategory::None",
        "ItemRace": "ERace::All",
        "SellPrice": 1,
        "MaxStackCount": 1,
        "MainStats": [{"Key": "EStat::None", "Value": 99}],
    }]
    rec = tables.parse_items(rows)["by_id"][1]
    assert rec["tier"] == 2
    assert rec["category"] is None
    assert rec["stats"] == []


def test_parse_npc_loot():
    loot = tables.parse_npc_loot(_load("npcloot_sample.json"))
    npc_id, item_ids = next(iter(loot.items()))
    assert isinstance(npc_id, int) and all(isinstance(i, int) for i in item_ids)


def test_parse_item_routes():
    routes = tables.parse_item_routes(_load("itemgetroute_sample.json"))
    rec = next(iter(routes.values()))
    assert set(rec) == {"monsters", "gather", "craft", "shop", "quests"}


def test_parse_npc_talks():
    talks = tables.parse_npc_talks(_load("npctalk_sample.json"))
    name, speaker = next(iter(talks.items()))
    assert name and speaker


def test_parse_steps_move_point():
    steps = tables.parse_steps(_load("queststep_sample.json"))
    goal = next(iter(steps.values()))[0]["goals"][0]
    assert "movePoint" in goal
