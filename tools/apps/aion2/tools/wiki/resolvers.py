"""Objective -> map POI resolvers. Pure functions; caller supplies spawn indexes."""
from __future__ import annotations

MAX_POIS = 12
NPC_GOALS = {"AskNpc", "KillNpc", "CloseNpc"}
ENV_GOALS = {"UseEnvObj", "CollectItem"}
NONSPATIAL = {
    "PCLevel",
    "ClearQuest",
    "ClearQuestType",
    "ClearQuestExplorationType",
    "CloseNote",
    "CollectFakeItem",
    "UseFakeItem",
    "KillPC",
    "KillPCAbyssGrade",
    "CompleteCelviceTalk",
    "ClearMapEvent",
    "EngraveTeleportArtifact",
}


def build_spawn_index(spawn_info_list, npcs, transform, env_objs=None) -> dict[str, list[dict]]:
    """Index target name -> [{x,y}], by spawner Name and by NPC string name."""
    idx: dict[str, list[dict]] = {}

    def add(key: str | None, pts: list[dict]) -> None:
        if key:
            idx.setdefault(key, []).extend(pts)

    for s in spawn_info_list or []:
        pts = []
        for p in s.get("Positions") or []:
            loc = p.get("Location") or {}
            if "X" in loc and "Y" in loc:
                x, y = transform.world_to_pixel(loc["X"], loc["Y"])
                pts.append({"x": round(x, 1), "y": round(y, 1)})
        if not pts:
            continue

        add(s.get("Name"), pts)
        for nid in s.get("NpcIdList") or []:
            v = nid.get("Value") if isinstance(nid, dict) else nid
            npc = npcs["by_id"].get(v)
            if npc and npc.get("name") and npc["name"] != s.get("Name"):
                add(npc["name"], pts)
        for eid in s.get("EnvObjIdList") or []:
            v = eid.get("Value") if isinstance(eid, dict) else eid
            ename = (env_objs or {}).get(v)
            if ename and ename != s.get("Name"):
                add(ename, pts)
    return idx


def build_point_index(map_data: dict, transform) -> dict[str, dict]:
    """Label/name -> single {x,y} point from volumes, triggers, move points."""
    idx: dict[str, dict] = {}

    def add(name, loc):
        if name and isinstance(loc, dict) and "X" in loc and "Y" in loc:
            x, y = transform.world_to_pixel(loc["X"], loc["Y"])
            idx.setdefault(name, {"x": round(x, 1), "y": round(y, 1)})

    for e in map_data.get("SubzoneVolumeInfoMap") or []:
        v = e.get("Value") or e
        add(v.get("LabelName"), v.get("Location"))
    for e in map_data.get("TriggerActorDataMap") or []:
        v = e.get("Value") or e
        add(v.get("Name"), v.get("Location"))
    for e in map_data.get("QuestMovePointDataMap") or []:
        v = e.get("Value") or e
        add(v.get("LabelName"), v.get("Location"))
    return idx


def build_subzone_index(map_data: dict) -> dict[str, str]:
    """Subzone volume label -> numeric SubzoneTableId string."""
    idx: dict[str, str] = {}
    for e in map_data.get("SubzoneVolumeInfoMap") or []:
        v = e.get("Value") or e
        label = v.get("LabelName")
        table_id = _scalar(v.get("SubzoneTableId"))
        if label and table_id is not None:
            idx.setdefault(label, str(table_id))
    return idx


def _scalar(x):
    if isinstance(x, dict) and "Value" in x:
        return x.get("Value")
    return x


def _round2(v: float) -> float:
    return round(float(v), 2)


def build_region_geometry(map_data: dict, transform) -> list[dict]:
    """SubzoneTableId -> pixel polygon rings for wiki region highlights."""
    by_id: dict[str, dict] = {}
    for e in map_data.get("SubzoneVolumeInfoMap") or []:
        v = e.get("Value") or e
        table_id = _scalar(v.get("SubzoneTableId"))
        points = v.get("Points") or []
        if table_id is None or len(points) < 3:
            continue

        ring = []
        for p in points:
            if not isinstance(p, dict) or "X" not in p or "Y" not in p:
                continue
            x, y = transform.world_to_pixel(p["X"], p["Y"])
            ring.append([_round2(x), _round2(y)])
        if len(ring) < 3:
            continue
        if ring[0] != ring[-1]:
            ring = ring + [ring[0]]

        key = str(table_id)
        by_id.setdefault(key, {"id": key, "borders": []})["borders"].append(ring)
    return sorted(by_id.values(), key=lambda r: r["id"])


def build_npc_spawns(spawn_info_list, transform) -> dict[int, list[dict]]:
    """NPC id -> [{x,y}] on this map."""
    out: dict[int, list[dict]] = {}
    for s in spawn_info_list or []:
        pts = []
        for p in s.get("Positions") or []:
            loc = p.get("Location") or {}
            if "X" in loc and "Y" in loc:
                x, y = transform.world_to_pixel(loc["X"], loc["Y"])
                pts.append({"x": round(x, 1), "y": round(y, 1)})
        if not pts:
            continue
        for nid in s.get("NpcIdList") or []:
            v = nid.get("Value") if isinstance(nid, dict) else nid
            if v is not None:
                out.setdefault(int(v), []).extend(pts)
    return out


def resolve_goal(goal, map_name, spawn_index, point_index=None, subzone_index=None):
    """Return {resolved: True|False|None, pois: [...], region: {...}|None}."""
    gtype = goal["type"]
    per_map_points = (point_index or {}).get(map_name or "", {})
    per_map_subzones = (subzone_index or {}).get(map_name or "", {})
    out = {"resolved": None, "pois": [], "region": None}

    if gtype == "EnterSubZone":
        label = goal["values"][0] if goal["values"] else None
        table_id = per_map_subzones.get(label)
        if table_id is not None and map_name:
            out["region"] = {"mapName": map_name, "id": table_id}
        return out

    per_map = spawn_index.get(map_name or "", {})
    pois: list[dict] = []
    target = goal["values"][0] if goal["values"] else None
    if gtype in NPC_GOALS or gtype in ENV_GOALS:
        pois = list(per_map.get(target, [])) if target else []
    elif gtype == "EnterVolumePC":
        if target and target in per_map_points:
            pois = [per_map_points[target]]

    if not pois and goal.get("movePoint") and goal["movePoint"] in per_map_points:
        pois = [per_map_points[goal["movePoint"]]]

    if not pois and gtype in NONSPATIAL:
        return out
    out["resolved"] = bool(pois)
    out["pois"] = pois[:MAX_POIS]
    return out
