"""Taxonomy tree (types -> groups -> sections) from data_src/wiki.yaml config."""
from __future__ import annotations


def group_lookup(type_cfg: dict) -> dict[str, str]:
    """Game enum value -> group slug."""
    out: dict[str, str] = {}
    for g in type_cfg["groups"]:
        for t in g["types"]:
            out[t] = g["slug"]
    return out


def section_label(slug: str) -> str:
    return " ".join(p.capitalize() for p in slug.replace("-", "_").split("_"))


BOSS_SUBTYPES = {"EliteMonster", "HeroMonster", "LegendMonster"}


def classify_npc(npc: dict) -> str | None:
    if npc.get("named") and npc.get("subType") in BOSS_SUBTYPES:
        return "boss"
    if npc.get("npcType") == "Monster":
        return "monster"
    if npc.get("npcType") == "Citizen":
        return "citizen"
    return None


def npc_race(npc: dict) -> str:
    rel = npc.get("relationship") or ""
    if rel == "NPC_Light":
        return "light"
    if rel == "NPC_Dark":
        return "dark"
    return "all"


def build_type_node(type_slug: str, groups_cfg: list[dict], records: list[dict]) -> dict:
    """Generic tree node. records: [{group, section, sort}]; sections sorted by min sort.

    'other'/'unknown' sections sort last.
    """
    per_group: dict[str, dict[str, int]] = {g["slug"]: {} for g in groups_cfg}
    min_sort: dict[str, dict[str, float]] = {g["slug"]: {} for g in groups_cfg}
    counts: dict[str, int] = {g["slug"]: 0 for g in groups_cfg}
    for r in records:
        slug = r.get("group")
        if slug not in per_group:
            continue
        counts[slug] += 1
        section = r.get("section") or "other"
        per_group[slug][section] = per_group[slug].get(section, 0) + 1
        sort = r.get("sort") or 0
        min_sort[slug][section] = min(sort, min_sort[slug].get(section, sort))
    groups = []
    for g in groups_cfg:
        slug = g["slug"]

        def key(item):
            section, _ = item
            return (section in ("other", "unknown"), min_sort[slug][section], section.lower())

        sections = [{"slug": s, "count": n} for s, n in sorted(per_group[slug].items(), key=key)]
        groups.append({"slug": slug, "count": counts[slug], "sections": sections})
    return {"slug": type_slug, "count": sum(counts.values()), "groups": groups}


def build_quest_tree(cfg: dict, quests: list[dict]) -> tuple[dict, list[str]]:
    """Return (taxonomy tree, unmatched game-type names)."""
    qcfg = cfg["quest"]
    lookup = group_lookup(qcfg)
    records = [
        {
            "group": lookup.get(q["type"]),
            "section": q.get("part") or "other",
            "sort": q.get("recommendedLevel") or 0,
        }
        for q in quests
    ]
    unmatched: list[str] = []
    for q in quests:
        qtype = q["type"]
        if qtype not in lookup:
            if qtype not in unmatched:
                unmatched.append(qtype)
    node = build_type_node("quest", qcfg["groups"], records)
    return {"types": [node]}, unmatched
