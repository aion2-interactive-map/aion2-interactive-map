import json
from pathlib import Path

import yaml

CLASSES = [
    "Gladiator", "Templar", "Ranger", "Assassin",
    "Elementalist", "Sorcerer", "Cleric", "Chanter",
]

# Boards JSON: downloads/<boardId>.json  (from daevanion/detail)
BOARDS_DIR = Path("downloads")

# Equipment JSON (contains skillList): downloads_equipment/<job>.json  (from /character/equipment)
EQUIP_DIR = Path("../characters")

OUT_DIR = Path("parsed")


def board_ids_for_job(job: str) -> list[int]:
    try:
        idx = CLASSES.index(job)
    except ValueError as e:
        raise RuntimeError(f"Unknown job: {job}. Must be one of: {', '.join(CLASSES)}") from e
    start = 11 + idx * 10
    return list(range(start, start + 7))


def build_skill_name_to_id(job: str) -> dict[str, int]:
    path = EQUIP_DIR / f"{job}.json"
    if not path.exists():
        raise RuntimeError(f"Missing equipment file for job '{job}': {path}")

    data = json.loads(path.read_text(encoding="utf-8"))
    skill_list = (((data or {}).get("skill") or {}).get("skillList")) or []

    out: dict[str, int] = {}
    for s in skill_list:
        name = (s.get("name") or "").strip()
        sid = s.get("id")
        if name and sid is not None:
            out[name] = int(sid)
    return out


def split_stats(name: str) -> list[str]:
    # "Attack, Defense" -> ["Attack", "Defense"]
    return [p.strip().replace(" ", "") for p in name.split(",") if p.strip()]


def classify_node(node, node_name: str, skill_map: dict[str, int]) -> dict:
    name = (node_name or "").strip()

    if name.startswith("Skill Level Up - "):
        skill_name_desc = node.get("effectList")[0]["desc"]
        skill_name = skill_name_desc.removesuffix("+1").strip()
        skill_id = skill_map.get(skill_name)
        # If missing, keep null but still mark as SkillLevel (so you can spot issues).
        return {"skillId": skill_id}

    if name.endswith(" - Start"):
        # "Nezekan - Start" => Start, value null
        return {}

    # Otherwise: Stat
    return {"stats": split_stats(name)}


def parse_board(path: Path, skill_map: dict[str, int]) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    node_list = data.get("nodeList", []) or []

    board_id = None
    nodes_out = []

    for n in node_list:
        if n.get("type") == "None":
            continue

        node_id = n.get("nodeId")
        if node_id is None:
            continue

        if board_id is None:
            board_id = n.get("boardId")

        raw_name = (n.get("name") or "").strip()
        classified = classify_node(n, raw_name, skill_map)

        node_obj = {"id": int(node_id),"grade": n.get("grade"), **classified}


        nodes_out.append(node_obj)

    return {"id": int(board_id) if board_id is not None else None, "nodes": nodes_out}


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for job in CLASSES:
        skill_map = build_skill_name_to_id(job)

        boards = []
        missing = []

        for board_id in board_ids_for_job(job):
            src = BOARDS_DIR / f"{board_id}.json"
            if not src.exists():
                missing.append(board_id)
                continue
            boards.append(parse_board(src, skill_map))

        result = {"boards": boards}

        out_path = OUT_DIR / f"{job}.yaml"
        out_path.write_text(
            yaml.safe_dump(result, allow_unicode=True, sort_keys=False),
            encoding="utf-8",
        )

        if missing:
            print(f"[{job}] wrote {out_path} (missing boards: {missing})")
        else:
            print(f"[{job}] wrote {out_path}")


if __name__ == "__main__":
    main()
