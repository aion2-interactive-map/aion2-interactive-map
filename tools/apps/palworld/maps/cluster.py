"""Deterministic greedy clustering (port of cluster.mjs).

Sort by (x, y, z); assign each point to the first existing cluster whose running
centroid is within `radius`, else start a new cluster. Order-sensitive by design
so marker ids stay stable across runs.
"""

from __future__ import annotations

from .common import round2


def cluster_points(points: list[dict], radius: float) -> list[dict]:
    ordered = sorted(points, key=lambda p: (p["x"], p["y"], p.get("z", 0) or 0))
    r2 = radius * radius
    clusters: list[dict] = []
    for p in ordered:
        pz = p.get("z", 0) or 0
        placed = False
        for c in clusters:
            n = len(c["items"])
            dx = p["x"] - c["sx"] / n
            dy = p["y"] - c["sy"] / n
            if dx * dx + dy * dy <= r2:
                c["items"].append(p)
                c["sx"] += p["x"]
                c["sy"] += p["y"]
                c["sz"] += pz
                placed = True
                break
        if not placed:
            clusters.append({"items": [p], "sx": p["x"], "sy": p["y"], "sz": pz})
    return [
        {
            "x": round2(c["sx"] / len(c["items"])),
            "y": round2(c["sy"] / len(c["items"])),
            "z": round2(c["sz"] / len(c["items"])),
            "items": c["items"],
        }
        for c in clusters
    ]
