import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from . import RAW_ROOT, map_table_key

_SUFFIX = "_Subzone"


@dataclass
class Subzone:
    label: str                       # raw LabelName, e.g. "AltamiaCanyon_Subzone"
    name: str                        # normalized, e.g. "AltamiaCanyon"
    location: tuple[float, float]    # (x, y) world
    points: list[tuple[float, float]]  # world-space polygon vertices


def _strip_suffix(label: str) -> str:
    return label[: -len(_SUFFIX)] if label.endswith(_SUFFIX) else label


def _find_first(obj, key: str):
    """Depth-first search for the first value under `key` anywhere in the tree."""
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for v in obj.values():
            found = _find_first(v, key)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for v in obj:
            found = _find_first(v, key)
            if found is not None:
                return found
    return None


@lru_cache(maxsize=None)
def _map_base_dir(map_name: str) -> str:
    """Look up BaseDir for a map from Map.json (e.g. World_L_A -> 'World/World_L')."""
    table = json.loads((RAW_ROOT / "Data" / "Table" / "Map.json").read_text(encoding="utf-8"))
    entries = _find_first(table, "Data") or []
    for e in entries:
        if e.get("Name") == map_name:
            return e.get("BaseDir", "")
    raise KeyError(f"map {map_name} not found in Map.json")


def map_data_path(map_name: str) -> Path:
    key = map_table_key(map_name)
    base = _map_base_dir(key)
    return RAW_ROOT / "Data" / "Map" / base / key / "MapData.json"


def parse_subzones(path: Path) -> list[Subzone]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    entries = _find_first(data, "SubzoneVolumeInfoMap") or []
    out: list[Subzone] = []
    for entry in entries:
        value = entry.get("Value", {})
        label = value.get("LabelName")
        loc = value.get("Location")
        pts = value.get("Points") or []
        if not label or loc is None or len(pts) < 3:
            continue
        out.append(
            Subzone(
                label=label,
                name=_strip_suffix(label),
                location=(float(loc["X"]), float(loc["Y"])),
                points=[(float(p["X"]), float(p["Y"])) for p in pts],
            )
        )
    return out
