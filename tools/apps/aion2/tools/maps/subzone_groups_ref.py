from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass
class SubzoneGroupRef:
    name: str
    points: list[list[float]]   # flattened pixel vertices [[x,y], ...]


def centroid(points) -> tuple[float, float]:
    n = len(points)
    sx = sum(p[0] for p in points)
    sy = sum(p[1] for p in points)
    return (sx / n, sy / n)


def load_frontend_subzone_groups(path: Path) -> list[SubzoneGroupRef]:
    # NOTE: the frontend file/dir + its top-level key are still named "regions"
    # until the Phase 2 frontend rewrite renames them to "subzoneGroups".
    doc = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    out: list[SubzoneGroupRef] = []
    for r in doc.get("regions", []):
        flat: list[list[float]] = []
        for polygon in r.get("borders", []) or []:
            for vertex in polygon:
                flat.append([float(vertex[0]), float(vertex[1])])
        if len(flat) >= 3:
            out.append(SubzoneGroupRef(name=r["name"], points=flat))
    return out
