"""Integration tests for map title L10N resolution (reads the real export)."""
from tools.maps.l10n import L10N
from tools.maps.extract import map_title


def test_map_title_from_mapjson_desc_key():
    l = L10N()
    assert map_title("World_L_A", l)["en"] == "Verteron"
    assert map_title("World_D_A", l)["en"] == "Altgard"


def test_map_title_starter_resolves_via_poeta_and_ishalgen():
    l = L10N()
    # World_L_Starter's Map.json Desc.Key is STR_Map_Poeta.
    assert map_title("World_L_Starter", l)["en"] == "Poeta"
    assert map_title("World_D_Starter", l)["en"] == "Ishalgen"


def test_map_title_fallback_for_maps_absent_from_mapjson():
    l = L10N()
    # World_L_B / World_D_B are NOT in Map.json; fall back to STR_Map_<name>.
    assert map_title("World_L_B", l)["en"] == "Eltnen"
    assert map_title("World_D_B", l)["en"] == "Morheim"


def test_map_title_abyss():
    l = L10N()
    assert map_title("Abyss_Reshanta_A", l)["en"] == "Chaotic Lower Reshanta"
    assert map_title("Abyss_Reshanta_C", l)["en"] == "Chaotic Middle Reshanta"


def test_map_title_zhcn_is_present_and_localized():
    l = L10N()
    t = map_title("World_L_A", l)
    assert t["zhCN"]                      # non-empty
    assert t["zhCN"] != t["en"]           # actually translated
