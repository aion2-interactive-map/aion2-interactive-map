"""Tiles stage (port of tiles.mjs).

Slices each world map image into 8x8 1024px WebP tiles and converts every
referenced marker icon to WebP, into the resource-palworld repo. Uses Pillow
(the aion2 tools' image lib); WebP bytes differ from the old sharp output but
the images are equivalent.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # source maps are 8192x8192

MAP_IMAGES = {"MainWorld": "Texture/UI/Map/T_WorldMap.png", "WorldTree": "Texture/UI/Map/T_TreeMap.png"}
TILE = 1024
COUNT = 8


def _collect_icon_names(data_out: Path) -> set[str]:
    icons: set[str] = set()
    types = json.loads((data_out / "types.json").read_text(encoding="utf-8"))
    for c in types["categories"]:
        for s in c["subtypes"]:
            if s.get("icon"):
                icons.add(s["icon"])
    for f in sorted((data_out / "markers").iterdir()):
        markers = json.loads(f.read_text(encoding="utf-8"))["markers"]
        for m in markers:
            if m.get("icon"):
                icons.add(m["icon"])
    return icons


def _icon_source_path(raw: Path, name: str) -> Path | None:
    compass = raw / "Texture/UI/InGame" / f"{name}.png"
    if name.startswith("T_icon_compass_") and compass.exists():
        return compass
    build = raw / "Texture/BuildObject/PNG" / f"{name}.png"
    if name.startswith("T_icon_buildObject_") and build.exists():
        return build
    npc = raw / "Texture/PalIcon/NPC" / f"{name}.png"
    if name.startswith("T_BOSS_NPC_") and npc.exists():
        return npc
    pal = raw / "Texture/PalIcon/Normal" / f"{name}.png"
    if pal.exists():
        return pal
    return None


def _save_webp(img: Image.Image, dest: Path) -> None:
    img.save(dest, "WEBP", quality=90, method=6)


def run_tiles(raw: Path, data_out: Path, res_out: Path) -> None:
    raw, data_out, res_out = Path(raw), Path(data_out), Path(res_out)
    for map_id, img_rel in MAP_IMAGES.items():
        dir_ = res_out / "tiles" / map_id
        dir_.mkdir(parents=True, exist_ok=True)
        with Image.open(raw / img_rel) as img:
            img = img.convert("RGBA") if img.mode not in ("RGB", "RGBA") else img
            for x in range(COUNT):
                for y in range(COUNT):
                    tile = img.crop((x * TILE, y * TILE, (x + 1) * TILE, (y + 1) * TILE))
                    _save_webp(tile, dir_ / f"{map_id}_{x:02d}_{y:02d}.webp")
        print(f"tiles: {map_id} 64 tiles")

    icon_dir = res_out / "icons"
    icon_dir.mkdir(parents=True, exist_ok=True)
    ok, missing = 0, []
    for name in _collect_icon_names(data_out):
        src = _icon_source_path(raw, name)
        if not src:
            missing.append(name)
            continue
        with Image.open(src) as im:
            _save_webp(im, icon_dir / f"{name}.webp")
        ok += 1
    print(f"icons: {ok} converted")
    if missing:
        print(f"icons missing sources: {missing}")
