from aion2.tools.maps.creatures import build_pet_source_index


def test_build_pet_source_index_maps_npc_to_subtype_and_name():
    vehicle_list = [
        {"Name": "KrallReg_01", "CreatureType": "ECreatureType::Intellect",
         "SoulItemName": "VehicleSoul_KrallReg_01", "Desc": {"Key": "str_veh_KrallReg_01"}},
        # shop/Special pet (no soul item) must be skipped:
        {"Name": "BlackDragon_01", "CreatureType": "ECreatureType::Special",
         "SoulItemName": "None", "Desc": {"Key": "str_veh_BlackDragon_01"}},
    ]
    item_table = [{"Name": "VehicleSoul_KrallReg_01", "ID": {"Value": 534660001}}]
    npc_loot = [
        {"NpcId": {"Value": 2100075}, "VehicleSoulItemId": {"Value": 534660001}},
        # NPC that drops no soul (VehicleSoulItemId 0) must be skipped:
        {"NpcId": {"Value": 9999}, "VehicleSoulItemId": {"Value": 0}},
    ]
    idx = build_pet_source_index(vehicle_list, item_table, npc_loot)
    assert set(idx.keys()) == {2100075}
    assert idx[2100075]["subtype"] == "creatureIntellect"
    assert idx[2100075]["descKey"] == "str_veh_KrallReg_01"
    assert idx[2100075]["petName"] == "KrallReg_01"


from aion2.tools.maps.creatures import cluster_points


def test_cluster_points_groups_within_radius_and_averages_z():
    # (x, y, z); radius 200 keeps the two groups separate; z is averaged per cluster
    pts = [(0, 0, 100), (50, 0, 200), (0, 50, 300), (1000, 1000, 10), (1000, 1050, 30)]
    out = cluster_points(pts, 200)
    assert len(out) == 2
    by_count = {c["count"]: c for c in out}
    assert sorted(by_count) == [2, 3]
    assert by_count[3]["z"] == 200   # (100 + 200 + 300) / 3
    assert by_count[2]["z"] == 20    # (10 + 30) / 2


def test_cluster_points_deterministic_regardless_of_order():
    a = cluster_points([(0, 0, 5), (10, 0, 5), (1000, 0, 5)], 200)
    b = cluster_points([(1000, 0, 5), (10, 0, 5), (0, 0, 5)], 200)
    assert a == b


def test_cluster_points_empty():
    assert cluster_points([], 200) == []


from aion2.tools.maps.creatures import build_creature_markers


class _FakeTransform:
    def world_to_pixel(self, x, y):
        return (x, y)  # identity, so pixel == world for easy assertions


class _FakeL10N:
    def en(self, key):
        return {"str_veh_A": "PetA"}.get(key, "")

    def zh_cn(self, key):
        return {"str_veh_A": "宠物A"}.get(key, "")

    def ko(self, key):
        return {"str_veh_A": "펫A"}.get(key, "")


_PORTRAIT = "UI/Resource/Texture/Portrait/Portrait_Vehicle/UT_Vehicle_Portrait_"


def test_build_creature_markers_clusters_per_pet_with_z_and_icon():
    index = {100: {"subtype": "creatureFeral", "descKey": "str_veh_A", "petName": "Fossa_01"}}
    spawn = [
        {"NpcIdList": [{"Value": 100}],
         "Positions": [{"Location": {"X": 0, "Y": 0, "Z": 100}},
                       {"Location": {"X": 40, "Y": 0, "Z": 300}}]},
        {"NpcIdList": [{"Value": 100}],
         "Positions": [{"Location": {"X": 3000, "Y": 3000, "Z": 50}}]},
        # NPC not in the index contributes nothing:
        {"NpcIdList": [{"Value": 777}], "Positions": [{"Location": {"X": 5, "Y": 5, "Z": 0}}]},
    ]
    out = build_creature_markers(
        spawn, _FakeTransform(), index, _FakeL10N(),
        available_portraits={"UT_Vehicle_Portrait_Fossa_01"}, radius=200,
    )
    assert len(out) == 2  # (0,0)+(40,0) merge; (3000,3000) separate
    assert all(m["kind"] == "creatureFeral" for m in out)
    assert all(
        m["name_en"] == "PetA" and m["name_zhCN"] == "宠物A" and m["name_ko"] == "펫A"
        for m in out
    )
    assert sorted(m["count"] for m in out) == [1, 2]
    assert all(m["petKey"] == "str_veh_A" for m in out)
    # world-Z average carried in Location[2]
    big = next(m for m in out if m["count"] == 2)
    assert big["Location"][2] == 200  # (100 + 300) / 2
    # per-pet portrait icon (available)
    assert all(m["icon"] == _PORTRAIT + "Fossa_01.webp" for m in out)


def test_build_creature_markers_omits_icon_when_portrait_missing():
    index = {100: {"subtype": "creatureFeral", "descKey": "str_veh_A", "petName": "NoArt_01"}}
    spawn = [{"NpcIdList": [{"Value": 100}],
              "Positions": [{"Location": {"X": 0, "Y": 0, "Z": 0}}]}]
    out = build_creature_markers(
        spawn, _FakeTransform(), index, _FakeL10N(), available_portraits=set(), radius=200,
    )
    assert len(out) == 1
    assert "icon" not in out[0]


def test_build_creature_markers_deoverlaps_to_min_separation():
    # different pets at (nearly) the same point are pushed >= MIN_SEPARATION apart
    # (a single fan-out used to leave close pairs overlapping), yet stay nearby.
    from aion2.tools.maps.creatures import MIN_SEPARATION
    index = {
        100: {"subtype": "creatureFeral", "descKey": "str_veh_A", "petName": "A_01"},
        200: {"subtype": "creatureNature", "descKey": "str_veh_B", "petName": "B_01"},
        300: {"subtype": "creatureNature", "descKey": "str_veh_C", "petName": "C_01"},
    }
    spawn = [
        {"NpcIdList": [{"Value": 100}], "Positions": [{"Location": {"X": 500, "Y": 500, "Z": 0}}]},
        {"NpcIdList": [{"Value": 200}], "Positions": [{"Location": {"X": 500, "Y": 500, "Z": 0}}]},
        {"NpcIdList": [{"Value": 300}], "Positions": [{"Location": {"X": 510, "Y": 505, "Z": 0}}]},
    ]
    out = build_creature_markers(spawn, _FakeTransform(), index, _FakeL10N(), radius=200)
    assert len(out) == 3
    for a in range(len(out)):
        for b in range(a + 1, len(out)):
            d = ((out[a]["px"][0] - out[b]["px"][0]) ** 2
                 + (out[a]["px"][1] - out[b]["px"][1]) ** 2) ** 0.5
            assert d >= MIN_SEPARATION - 0.5   # guaranteed spacing (minus rounding)
    for m in out:                              # still near the original cluster
        assert ((m["px"][0] - 503) ** 2 + (m["px"][1] - 503) ** 2) ** 0.5 <= 3 * MIN_SEPARATION


def test_build_creature_markers_no_transform_returns_empty():
    index = {100: {"subtype": "creatureFeral", "descKey": "str_veh_A", "petName": "A_01"}}
    spawn = [{"NpcIdList": [{"Value": 100}], "Positions": [{"Location": {"X": 0, "Y": 0, "Z": 0}}]}]
    assert build_creature_markers(spawn, None, index, _FakeL10N()) == []


def test_extract_world_l_a_emits_creature_markers():
    """Integration: parse the real World_L_A export and check creature markers.

    Requires the raw export (RAW_DATA_PATH from tools/.env, loaded by
    aion2.tools.__init__). The expected count band is wide because the
    deterministic (sorted) clusterer differs slightly from exploratory counts.
    """
    from aion2.tools.maps.extract import extract_map
    from aion2.tools.maps.l10n import L10N

    data = extract_map("World_L_A", L10N())
    creatures = [w for w in data["WorldMarkers"] if str(w["kind"]).startswith("creature")]
    assert 250 <= len(creatures) <= 500
    assert {w["kind"] for w in creatures} <= {
        "creatureIntellect", "creatureFeral", "creatureNature",
        "creatureTrans", "creatureSpecial",
    }
    for w in creatures:
        assert w["px"] and 0 <= w["px"][0] <= 8192 and 0 <= w["px"][1] <= 8192
        assert w["name_en"]      # localized pet name, non-empty
        assert w["name_ko"]      # localized pet name, non-empty
        assert w["count"] >= 1
        assert w.get("Location") and w["Location"][2] is not None   # world-Z carried
    # nearly every pet has a portrait icon (only a handful lack raw art)
    assert sum(1 for w in creatures if w.get("icon")) >= 0.9 * len(creatures)


def test_emit_frontend_routes_creature_marker():
    from aion2.tools.maps.emit_frontend import build_markers

    map_data = {
        "Name": "TestMap",
        "WorldMarkers": [
            {"kind": "creatureFeral", "px": [100.0, 200.0],
             "name_en": "Fossa", "name_zhCN": "波沙", "name_ko": "포사", "count": 7},
        ],
    }
    markers, locale = build_markers(map_data)
    m = next(m for m in markers if m["subtype"] == "creatureFeral")
    assert m["category"] == "creature"
    assert m["tier"] == 3
    assert m["count"] == 7  # cluster size drives the on-map count badge
    assert m["x"] == 100.0 and m["y"] == 200.0
    assert locale[m["id"]]["name_en"] == "Fossa"
    assert locale[m["id"]]["name_ko"] == "포사"
    assert locale[m["id"]]["desc_en"] == "7 spawn points"
    assert locale[m["id"]]["desc_zhCN"] == "7 处刷新点"
    assert locale[m["id"]]["desc_ko"] == "7곳의 리젠 지점"


def test_emit_frontend_creature_index_is_per_pet():
    """The same pet counts once in the sidebar: every spawn cluster of a pet
    shares one indexInSubtype (what subtypeCounts tallies), while each cluster
    keeps a unique marker id."""
    from collections import Counter
    from aion2.tools.maps.emit_frontend import build_markers

    map_data = {
        "Name": "TestMap",
        "WorldMarkers": [
            {"kind": "creatureFeral", "px": [10.0, 10.0], "name_en": "A",
             "name_zhCN": "甲", "count": 3, "petKey": "str_veh_A"},
            {"kind": "creatureFeral", "px": [900.0, 900.0], "name_en": "A",
             "name_zhCN": "甲", "count": 2, "petKey": "str_veh_A"},
            {"kind": "creatureFeral", "px": [50.0, 50.0], "name_en": "B",
             "name_zhCN": "乙", "count": 1, "petKey": "str_veh_B"},
        ],
    }
    markers, _ = build_markers(map_data)
    feral = [m for m in markers if m["subtype"] == "creatureFeral"]
    assert len(feral) == 3
    assert len({m["id"] for m in feral}) == 3        # unique id per cluster
    idx_counts = Counter(m["indexInSubtype"] for m in feral)
    assert len(idx_counts) == 2                       # 2 distinct pets -> sidebar counts 2
    assert sorted(idx_counts.values()) == [1, 2]      # pet A's 2 clusters share 1 index; pet B: 1


def test_emit_frontend_creature_z_and_icon():
    """Creature markers carry a pixel-scaled z (from world Z) and their per-pet icon."""
    from aion2.tools.maps.emit_frontend import build_markers

    scale = 8192 / 816000  # World_L_A pixel scale
    map_data = {
        "Name": "World_L_A",
        "WorldMarkers": [
            {"kind": "creatureFeral", "px": [100.0, 200.0], "name_en": "Fossa",
             "name_zhCN": "波沙", "count": 7, "petKey": "str_veh_Fossa_01",
             "Location": [None, None, 10000.0],
             "icon": _PORTRAIT + "Fossa_01.webp"},
        ],
    }
    markers, _ = build_markers(map_data)
    m = next(m for m in markers if m["subtype"] == "creatureFeral")
    assert m["icon"].endswith("UT_Vehicle_Portrait_Fossa_01.webp")
    assert abs(m["z"] - 10000.0 * scale) < 0.5


def test_emit_frontend_adds_z_to_non_creature_markers():
    """z is added to ALL markers (e.g. boss), scaled from world Z."""
    from aion2.tools.maps.emit_frontend import build_markers

    scale = 8192 / 816000
    map_data = {
        "Name": "World_L_A",
        "WorldMarkers": [
            {"kind": "boss", "px": [10.0, 20.0], "name_en": "X", "name_zhCN": "X",
             "Location": [1000.0, 2000.0, 5000.0]},
        ],
    }
    markers, _ = build_markers(map_data)
    m = next(m for m in markers if m["subtype"] == "boss")
    assert abs(m["z"] - 5000.0 * scale) < 0.5
