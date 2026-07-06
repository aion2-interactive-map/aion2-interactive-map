import math
from dataclasses import dataclass, field

from .names import tokens
from .subzone_groups_ref import centroid, load_frontend_subzone_groups
from .subzones import parse_subzones, map_data_path
from .transform import ALL_ORIENTATIONS, Orientation, WorldMapTransform
from .worldmap import WorldMapMeta
from . import worldmap_path, subzone_groups_yaml_path


@dataclass
class Calibration:
    map_name: str
    orientation: Orientation
    pixel_width: float
    pixel_height: float
    residual_px: float
    runner_up_residual_px: float
    num_matches: int
    pairs: list[dict] = field(default_factory=list)   # [{name, dist}]


def _match_pairs(map_name):
    """Return ground-truth pairs: (subzone_world_centroid, subzone_group_pixel_centroid, name).

    Matches game subzone volumes (SubzoneVolumeInfoMap) against the frontend's
    coarse named areas (subzone groups) by name.
    """
    subs = parse_subzones(map_data_path(map_name))
    groups = load_frontend_subzone_groups(subzone_groups_yaml_path(map_name))
    group_by_tokens = {tokens(g.name): centroid(g.points) for g in groups}
    pairs = []
    for s in subs:
        gc = group_by_tokens.get(tokens(s.name))
        if gc is None:
            continue
        sc = centroid([list(p) for p in s.points])  # subzone world centroid
        pairs.append((sc, gc, s.name))
    return pairs


def _mean_residual(transform, pairs):
    total = 0.0
    detail = []
    for (sx, sy), (rx, ry), name in pairs:
        px, py = transform.world_to_pixel(sx, sy)
        d = math.hypot(px - rx, py - ry)
        total += d
        detail.append({"name": name, "dist": round(d, 2)})
    return total / len(pairs), detail


def calibrate(map_name: str) -> Calibration:
    meta = WorldMapMeta.from_json(worldmap_path(map_name), map_name)
    pairs = _match_pairs(map_name)
    if len(pairs) < 3:
        raise RuntimeError(f"only {len(pairs)} name-matched pairs for {map_name}; cannot calibrate")

    scored = []
    for o in ALL_ORIENTATIONS:
        residual, detail = _mean_residual(WorldMapTransform(meta, o), pairs)
        scored.append((residual, o, detail))
    scored.sort(key=lambda t: t[0])

    best_residual, best_o, best_detail = scored[0]
    runner_up = scored[1][0]
    return Calibration(
        map_name=map_name,
        orientation=best_o,
        pixel_width=meta.pixel_width,
        pixel_height=meta.pixel_height,
        residual_px=round(best_residual, 2),
        runner_up_residual_px=round(runner_up, 2),
        num_matches=len(pairs),
        pairs=sorted(best_detail, key=lambda d: d["dist"]),
    )
