import argparse
import dataclasses
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from .calibrate import calibrate, _match_pairs
from .subzones import parse_subzones, map_data_path
from .subzone_groups_ref import load_frontend_subzone_groups
from .transform import WorldMapTransform
from .worldmap import WorldMapMeta
from . import CALIBRATION_OUT, worldmap_path, subzone_groups_yaml_path


def _write_json(cal):
    CALIBRATION_OUT.mkdir(parents=True, exist_ok=True)
    out = CALIBRATION_OUT / f"{cal.map_name}.json"
    payload = dataclasses.asdict(cal)
    payload["orientation"] = dataclasses.asdict(cal.orientation)
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return out


def _write_overlay(cal):
    meta = WorldMapMeta.from_json(worldmap_path(cal.map_name), cal.map_name)
    t = WorldMapTransform(meta, cal.orientation)
    subs = parse_subzones(map_data_path(cal.map_name))
    groups = load_frontend_subzone_groups(subzone_groups_yaml_path(cal.map_name))

    fig, ax = plt.subplots(figsize=(10, 10))
    for g in groups:                        # existing subzone-group pixel polygons (blue)
        xs = [p[0] for p in g.points] + [g.points[0][0]]
        ys = [p[1] for p in g.points] + [g.points[0][1]]
        ax.plot(xs, ys, color="tab:blue", linewidth=0.8, alpha=0.6)
    for s in subs:                          # transformed subzone polygons (red)
        pts = [t.world_to_pixel(x, y) for x, y in s.points]
        xs = [p[0] for p in pts] + [pts[0][0]]
        ys = [p[1] for p in pts] + [pts[0][1]]
        ax.plot(xs, ys, color="tab:red", linewidth=0.8, alpha=0.6)
    ax.set_xlim(0, meta.pixel_width)
    ax.set_ylim(meta.pixel_height, 0)       # image-style: y down
    ax.set_aspect("equal")
    ax.set_title(f"{cal.map_name}: subzone groups (blue) vs transformed subzones (red)")
    out = CALIBRATION_OUT / f"{cal.map_name}_overlay.png"
    fig.savefig(out, dpi=120)
    plt.close(fig)
    return out


def main():
    ap = argparse.ArgumentParser(description="Calibrate world->pixel transform for a map")
    ap.add_argument("map_name", help="e.g. World_L_A")
    args = ap.parse_args()
    cal = calibrate(args.map_name)
    json_path = _write_json(cal)
    png_path = _write_overlay(cal)
    print(f"orientation: {cal.orientation}")
    print(f"residual_px: {cal.residual_px}  runner_up: {cal.runner_up_residual_px}  matches: {cal.num_matches}")
    print(f"wrote {json_path}")
    print(f"wrote {png_path}")


if __name__ == "__main__":
    main()
