"""Calibrate stage (port of calibrate.mjs).

Dev aid: renders the 8 world->pixel orientation candidates per map with the
fast-travel statues plotted, so the correct orientation can be picked by eye.
Not part of the shipped data; orientation.py holds the verified result.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

from .bounds import assign_map
from .extract import read_parsed
from .orientation import Orientation
from .transform import make_transform

Image.MAX_IMAGE_PIXELS = None

MAP_IMAGES = {"MainWorld": "Texture/UI/Map/T_WorldMap.png", "WorldTree": "Texture/UI/Map/T_TreeMap.png"}
SIZE = 8192
PREVIEW = 1024


def run_calibrate(raw: Path, parsed_dir: Path) -> None:
    raw, parsed_dir = Path(raw), Path(parsed_dir)
    parsed = read_parsed(parsed_dir)
    bounds = parsed["bounds"]
    maps = [
        {"mapId": "WorldTree", **bounds["WorldTree"]},
        {"mapId": "MainWorld", **bounds["MainWorld"]},
    ]
    out_dir = parsed_dir.parent / "calibration"
    out_dir.mkdir(parents=True, exist_ok=True)
    statues = [p for p in parsed["pois"] if p["subtype"] == "fastTravel"]

    for map_id, img_rel in MAP_IMAGES.items():
        with Image.open(raw / img_rel) as src:
            base = src.convert("RGB").resize((PREVIEW, PREVIEW))
        pts = [s for s in statues if assign_map(s["location"], maps) == map_id]
        for px_axis in ("X", "Y"):
            for flip_x in (False, True):
                for flip_y in (False, True):
                    t = make_transform(bounds[map_id], Orientation(px_axis, flip_x, flip_y), SIZE, SIZE)
                    img = base.copy()
                    draw = ImageDraw.Draw(img)
                    for s in pts:
                        x, y = t(s["location"])
                        cx, cy = x / 8, y / 8
                        draw.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill="red", outline="white")
                    name = f"{map_id}_px{px_axis}_fx{1 if flip_x else 0}_fy{1 if flip_y else 0}.png"
                    img.save(out_dir / name)
        print(f"calibrate: {map_id} — {len(pts)} statues, 8 renders")
    print(f"calibrate: wrote {out_dir}")
