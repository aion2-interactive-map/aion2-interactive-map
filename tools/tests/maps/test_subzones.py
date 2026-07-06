from aion2.tools.maps.subzones import parse_subzones, map_data_path


def test_parse_subzones_world_l_a_has_altamia_canyon():
    subs = parse_subzones(map_data_path("World_L_A"))
    by_name = {s.name: s for s in subs}
    assert "AltamiaCanyon" in by_name           # "_Subzone" stripped
    az = by_name["AltamiaCanyon"]
    assert az.label == "AltamiaCanyon_Subzone"
    # Location from the real export (verified 2026-06-27)
    assert abs(az.location[0] - 97417.2578125) < 1e-3
    assert abs(az.location[1] - 76876.796875) < 1e-3
    assert len(az.points) >= 3                  # a real polygon
    assert len(subs) > 20                        # World_L_A has many subzones
