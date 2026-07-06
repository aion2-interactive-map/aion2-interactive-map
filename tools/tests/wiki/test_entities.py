import json

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
        name={"en": "Boss A", "zhCN": "Boss A", "zhTW": "Boss A"},
        spawns_by_map={"World_L_A": [{"x": 1.0, "y": 2.0}]},
        quest_refs=[{"id": 100, "role": "giver"}],
        drop_items=[{"id": 5, "name": {"en": "Sword", "zhCN": "Sword", "zhTW": "Sword"},
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


ITEM = {"id": 5, "name": "IT_A", "descKey": None, "descLongKey": None,
        "iconRes": "Icon_WP_GS_0022_T05", "grade": "legend", "tier": 5,
        "itemLevel": 30, "itemType": "Equip", "category": "Greatsword",
        "race": "all", "sellPrice": 10, "maxStack": 1,
        "stats": [{"key": "Attack", "value": 12}]}


def test_build_item_entity_shape():
    ent = entities.build_item_entity(
        ITEM,
        name={"en": "Sword", "zhCN": "Sword", "zhTW": "Sword"},
        desc={"en": "d", "zhCN": "d", "zhTW": "d"},
        icon="UI/Resource/Texture/Item/Weapon/Icon_WP_GS_0022_T05.webp",
        routes={"monsters": [7], "gather": False, "craft": True, "shop": False, "quests": [3]},
        reward_from=[100, 101],
        dropped_by=[{"id": 7, "name": {"en": "Boss A", "zhCN": "Boss A", "zhTW": "Boss A"}, "level": 12}],
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
