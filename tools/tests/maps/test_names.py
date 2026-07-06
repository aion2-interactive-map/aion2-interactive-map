from aion2.tools.maps.names import tokens
from aion2.tools.maps.subzone_groups_ref import load_frontend_subzone_groups, centroid
from aion2.tools.maps import subzone_groups_yaml_path


def test_tokens_split_camel_and_underscore():
    assert tokens("AltamiaCanyon") == frozenset({"altamia", "canyon"})
    # reordered words still match as a set
    assert tokens("WesternAltamiaHighland") == tokens("AltamiaHighland_Western")


def test_centroid_of_square():
    assert centroid([[0.0, 0.0], [2.0, 0.0], [2.0, 2.0], [0.0, 2.0]]) == (1.0, 1.0)


def test_load_frontend_subzone_groups_world_l_a():
    groups = load_frontend_subzone_groups(subzone_groups_yaml_path("World_L_A"))
    names = {g.name for g in groups}
    assert "AltamiaCanyon" in names
    az = next(g for g in groups if g.name == "AltamiaCanyon")
    assert len(az.points) >= 3        # flattened pixel vertices
