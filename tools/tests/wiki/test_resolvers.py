from aion2.tools.wiki import resolvers


class FakeTransform:
    def world_to_pixel(self, wx, wy):
        return (wx / 10.0, wy / 10.0)


SPAWNS = [
    {
        "Name": "N_L1_Q_Alice_01",
        "NpcIdList": [{"Value": 42}],
        "Positions": [{"Location": {"X": 100.0, "Y": 200.0, "Z": 5.0}}],
    },
    {
        "Name": "S_other",
        "NpcIdList": [{"Value": 43}],
        "Positions": [
            {"Location": {"X": 300.0, "Y": 400.0, "Z": 0.0}},
            {"Location": {"X": 310.0, "Y": 410.0, "Z": 0.0}},
        ],
    },
]
NPCS = {
    "by_id": {
        42: {
            "id": 42,
            "name": "N_L1_Q_Alice_01",
            "descKey": "STR_Alice",
            "level": 5,
            "named": False,
        },
        43: {
            "id": 43,
            "name": "N_Bob",
            "descKey": "STR_Bob",
            "level": 7,
            "named": True,
        },
    },
    "by_name": {"N_L1_Q_Alice_01": {"id": 42}, "N_Bob": {"id": 43}},
}


def test_spawn_index_by_spawner_name_and_npc_name():
    idx = resolvers.build_spawn_index(SPAWNS, NPCS, FakeTransform())
    assert idx["N_L1_Q_Alice_01"][0] == {"x": 10.0, "y": 20.0}
    assert len(idx["N_Bob"]) == 2


def test_resolve_npc_goal_hits():
    idx = {"World_L_A": resolvers.build_spawn_index(SPAWNS, NPCS, FakeTransform())}
    goal = {
        "type": "AskNpc",
        "values": ["N_L1_Q_Alice_01", "talk"],
        "mapId": 1010,
        "marker": True,
        "optional": False,
    }
    r = resolvers.resolve_goal(goal, map_name="World_L_A", spawn_index=idx)
    assert r["resolved"] is True and r["pois"] == [{"x": 10.0, "y": 20.0}]


def test_resolve_unknown_target_reports_miss():
    r = resolvers.resolve_goal(
        {
            "type": "KillNpc",
            "values": ["N_Missing"],
            "mapId": 1,
            "marker": True,
            "optional": False,
        },
        map_name="World_L_A",
        spawn_index={"World_L_A": {}},
    )
    assert r["resolved"] is False and r["pois"] == []


def test_nonspatial_goal_not_counted_as_miss():
    r = resolvers.resolve_goal(
        {
            "type": "PCLevel",
            "values": ["10"],
            "mapId": None,
            "marker": False,
            "optional": False,
        },
        map_name=None,
        spawn_index={},
    )
    assert r["resolved"] is None


def test_poi_cap():
    many = [
        {
            "Name": "N_Many",
            "NpcIdList": [],
            "Positions": [
                {"Location": {"X": float(i), "Y": 0.0, "Z": 0.0}}
                for i in range(100)
            ],
        }
    ]
    idx = {
        "M": resolvers.build_spawn_index(
            many, {"by_id": {}, "by_name": {}}, FakeTransform()
        )
    }
    r = resolvers.resolve_goal(
        {
            "type": "AskNpc",
            "values": ["N_Many"],
            "mapId": 1,
            "marker": True,
            "optional": False,
        },
        map_name="M",
        spawn_index=idx,
    )
    assert len(r["pois"]) == resolvers.MAX_POIS


def test_spawn_index_env_obj_ids():
    spawns = [{"Name": "SP_1", "EnvObjIdList": [{"Value": 42}],
               "Positions": [{"Location": {"X": 100, "Y": 200}}]}]
    idx = resolvers.build_spawn_index(spawns, {"by_id": {}}, FakeTransform(),
                                      env_objs={42: "Env_Herb_01"})
    assert idx["Env_Herb_01"] == [{"x": 10.0, "y": 20.0}]


def test_build_point_index():
    data = {
        "SubzoneVolumeInfoMap": [
            {"Key": "SZ_A", "Value": {"LabelName": "SZ_A", "Location": {"X": 100, "Y": 100},
                                      "SubzoneTableId": 2096}}
        ],
        "TriggerActorDataMap": [
            {"Key": {"Value": 1}, "Value": {"Name": "TR_B", "Location": {"X": 200, "Y": 200}}}
        ],
        "QuestMovePointDataMap": [
            {"Key": "MP_C", "Value": {"LabelName": "MP_C", "Location": {"X": 300, "Y": 300}}}
        ],
    }
    idx = resolvers.build_point_index(data, FakeTransform())
    assert idx["SZ_A"] == {"x": 10.0, "y": 10.0}
    assert idx["TR_B"] == {"x": 20.0, "y": 20.0}
    assert idx["MP_C"] == {"x": 30.0, "y": 30.0}


def test_build_subzone_index():
    data = {"SubzoneVolumeInfoMap": [
        {"Key": "SZ_A", "Value": {"LabelName": "SZ_A", "SubzoneTableId": 2096}},
        {"Key": "SZ_NoId", "Value": {"LabelName": "SZ_NoId"}},
    ]}
    assert resolvers.build_subzone_index(data) == {"SZ_A": "2096"}


def test_build_region_geometry_groups_rings_by_subzone_table_id():
    data = {
        "SubzoneVolumeInfoMap": [
            {
                "Key": "SZ_A",
                "Value": {
                    "SubzoneTableId": 2096,
                    "Points": [
                        {"X": 100.0, "Y": 200.0},
                        {"X": 111.25, "Y": 200.0},
                        {"X": 111.25, "Y": 222.25},
                    ],
                },
            },
            {
                "Key": "SZ_A_2",
                "Value": {
                    "SubzoneTableId": {"Value": 2096},
                    "Points": [
                        {"X": 300.0, "Y": 400.0},
                        {"X": 310.0, "Y": 400.0},
                        {"X": 310.0, "Y": 410.0},
                        {"X": 300.0, "Y": 400.0},
                    ],
                },
            },
            {
                "Key": "SZ_Short",
                "Value": {
                    "SubzoneTableId": 3000,
                    "Points": [{"X": 1.0, "Y": 2.0}, {"X": 3.0, "Y": 4.0}],
                },
            },
        ]
    }
    assert resolvers.build_region_geometry(data, FakeTransform()) == [
        {
            "id": "2096",
            "borders": [
                [[10.0, 20.0], [11.12, 20.0], [11.12, 22.23], [10.0, 20.0]],
                [[30.0, 40.0], [31.0, 40.0], [31.0, 41.0], [30.0, 40.0]],
            ],
        }
    ]


def test_build_npc_spawns():
    idx = resolvers.build_npc_spawns(SPAWNS, FakeTransform())
    assert idx[42] == [{"x": 10.0, "y": 20.0}]
    assert idx[43] == [{"x": 30.0, "y": 40.0}, {"x": 31.0, "y": 41.0}]


def test_resolve_enter_volume_pc():
    r = resolvers.resolve_goal(
        {"type": "EnterVolumePC", "values": ["TR_B"], "movePoint": None},
        "World_L_A", {}, point_index={"World_L_A": {"TR_B": {"x": 20.0, "y": 20.0}}})
    assert r["resolved"] is True and r["pois"] == [{"x": 20.0, "y": 20.0}]


def test_resolve_move_point_fallback():
    goal = {"type": "KillNpc", "values": ["NoSuchNpc"], "movePoint": "MP_C"}
    r = resolvers.resolve_goal(goal, "World_L_A", {},
                               point_index={"World_L_A": {"MP_C": {"x": 30.0, "y": 30.0}}})
    assert r["resolved"] is True and r["pois"] == [{"x": 30.0, "y": 30.0}]


def test_resolve_enter_subzone_region():
    goal = {"type": "EnterSubZone", "values": ["SZ_A"], "movePoint": None}
    r = resolvers.resolve_goal(
        goal, "World_L_A", {}, subzone_index={"World_L_A": {"SZ_A": "2096"}}
    )
    assert r["region"] == {"mapName": "World_L_A", "id": "2096"}
    assert r["resolved"] is None and r["pois"] == []


def test_resolve_enter_subzone_region_missing_label():
    goal = {"type": "EnterSubZone", "values": ["SZ_Missing"], "movePoint": None}
    r = resolvers.resolve_goal(
        goal, "World_L_A", {}, subzone_index={"World_L_A": {"SZ_A": "2096"}}
    )
    assert r["region"] is None
    assert r["resolved"] is None and r["pois"] == []


def test_resolve_goal_region_default_none():
    r = resolvers.resolve_goal({"type": "AskNpc", "values": [], "movePoint": None}, None, {})
    assert r["region"] is None
