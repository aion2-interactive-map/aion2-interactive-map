"""Integration tests for composed map display names (base L10N + faction suffix)."""
from tools.maps.l10n import L10N
from tools.maps.emit_frontend import _faction, _map_display

_L10N = L10N()


def test_faction_from_machine_name():
    assert _faction("World_L_A") == "light"
    assert _faction("World_D_B") == "dark"
    assert _faction("World_L_Starter") == "light"
    assert _faction("Abyss_Reshanta_A") is None


def test_world_map_gets_localized_base_plus_faction_suffix():
    d = _map_display("World_L_A", _L10N)
    assert d["name_en"] == "Verteron (Elyos)"
    assert d["name_zhCN"].endswith("（天）")
    assert d["name_zhCN"] != d["name_en"]


def test_abyss_map_has_no_suffix():
    d = _map_display("Abyss_Reshanta_A", _L10N)
    assert d["name_en"] == "Chaotic Lower Reshanta"
    assert "(" not in d["name_en"]          # no faction suffix


def test_starter_uses_real_name_plus_faction():
    assert _map_display("World_L_Starter", _L10N)["name_en"] == "Poeta (Elyos)"
    assert _map_display("World_D_Starter", _L10N)["name_en"] == "Ishalgen (Asmodian)"


def test_maps_absent_from_mapjson_still_localize():
    assert _map_display("World_L_B", _L10N)["name_en"] == "Eltnen (Elyos)"
    assert _map_display("World_D_B", _L10N)["name_en"] == "Morheim (Asmodian)"
