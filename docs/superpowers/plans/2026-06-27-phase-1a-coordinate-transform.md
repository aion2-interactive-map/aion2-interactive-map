# Phase 1A — Coordinate Transform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and *calibrate* a reusable transform that converts AION2 game world coordinates (`MapData.json` X,Y) into the frontend's Leaflet map-pixel space, validated by overlaying game subzone polygons onto the existing pixel-space region polygons.

**Architecture:** A new `aion2/tools/maps/` package. The transform is a pure linear map (world bounds → pixel grid) whose only unknowns are *axis orientation* and *axis flips* — a discrete 8-way space. We brute-force those 8 orientations against ground-truth pairs (game `SubzoneVolumeInfoMap` polygons matched by name to the frontend's `regions/<map>.yaml`) and pick the orientation with the smallest centroid residual. Output is a small calibration JSON (consumed by later sub-plans 1B/1C) plus an overlay PNG for human confirmation.

**Tech Stack:** Python 3.13 (uv-pinned), **uv** for env/deps (in-project `.venv`), pytest (dev group), PyYAML + matplotlib (existing deps). Runs against the tools repo at `G:/NCSoft/aion2-map/tools` via `uv run`.

**Why this is Phase 1's first step:** markers (1B) and subzone groups (1C) are meaningless until the world→pixel transform is proven correct. This sub-plan de-risks everything downstream and is identical under every marker-model decision.

> **Post-implementation rename (commit `c927228`):** to align with game-data terms, the
> frontend "region" concept was renamed **region → subzoneGroup**. The code below was renamed
> accordingly: `regions_ref.py`→`subzone_groups_ref.py`, `RegionRef`→`SubzoneGroupRef`,
> `load_frontend_regions`→`load_frontend_subzone_groups`, `regions_yaml_path`→
> `subzone_groups_yaml_path`. The game's finer `SubzoneVolumeInfoMap` volumes remain
> **subzone** (`subzones.py` unchanged). The frontend dir/key is still `regions/` until the
> Phase 2 rename. The code listings below show the original names; the committed code uses the
> renamed ones.

---

## Concrete reference values (verified 2026-06-27)

- WorldMap meta `G:/NCSoft/Export/Exports/AION2/Content/Data/WorldMap/World_L_A.json`:
  `WorldBoundBox.Min = (-408000,-408000)`, `Max = (408000,408000)`, `SectorSize = 8×8`,
  `SectorPlaneSize = 1024` ⇒ pixel grid **8192×8192** (matches frontend `maps.yaml` World_L_A `tilesCountX/Y=8`, `tileWidth/Height=1024`).
- MapData `G:/NCSoft/Export/Exports/AION2/Content/Data/Map/World/World_L/World_L_A/MapData.json`
  contains key `"SubzoneVolumeInfoMap"` (an array of `{"Key":..., "Value":{"LabelName":str,"Location":{X,Y,Z},"Points":[{X,Y},...]}}`). `Points` are absolute world-space polygon vertices. Example: `AltamiaCanyon_Subzone`, `Location=(97417.26, 76876.80)`.
- Frontend regions `G:/NCSoft/aion2-map/frontend/public/data/regions/World_L_A.yaml`:
  `regions: [{id, name, type, borders: [[[x,y],...]]}]` with `borders` in **pixel** space. Region `AltamiaCanyon` exists → exact name match to the subzone above.
- Name correspondence: strip `_Subzone`, then token-set match (camelCase + `_` split). `WesternAltamiaHighland` ↔ `AltamiaHighland_Western`.

---

## File Structure

```
G:/NCSoft/aion2-map/tools/
├── pyproject.toml                         # migrated Poetry→uv (Task 0, done)
├── aion2/tools/maps/                      # NEW package
│   ├── __init__.py
│   ├── worldmap.py                        # WorldMapMeta.from_json + pixel dims
│   ├── transform.py                       # Orientation, ALL_ORIENTATIONS, WorldMapTransform
│   ├── subzones.py                        # parse_subzones(map_data_path) -> list[Subzone]
│   ├── regions_ref.py                     # load_frontend_regions(path) -> list[RegionRef]
│   ├── names.py                           # tokens(s), normalize(label)
│   ├── calibrate.py                       # calibrate(map_name, ...) -> Calibration
│   └── __main__.py                        # CLI: python -m aion2.tools.maps <map>
├── tests/maps/
│   ├── test_transform.py
│   ├── test_subzones.py
│   ├── test_names.py
│   └── test_calibrate.py                  # integration (reads real export + frontend)
└── parsed_data/calibration/               # OUTPUT: <map>.json + <map>_overlay.png
```

Path constants used below (define once in `aion2/tools/maps/__init__.py`):

```python
from pathlib import Path

RAW_ROOT = Path("G:/NCSoft/Export/Exports/AION2/Content")
FRONTEND_ROOT = Path("G:/NCSoft/aion2-map/frontend")
TOOLS_ROOT = Path(__file__).resolve().parents[3]   # .../tools
CALIBRATION_OUT = TOOLS_ROOT / "parsed_data" / "calibration"

def worldmap_path(map_name: str) -> Path:
    return RAW_ROOT / "Data" / "WorldMap" / f"{map_name}.json"

def regions_yaml_path(map_name: str) -> Path:
    return FRONTEND_ROOT / "public" / "data" / "regions" / f"{map_name}.yaml"
```

(`map_data_path` is resolved from `Map.json` `BaseDir`; for World_L_A it is
`RAW_ROOT/"Data"/"Map"/"World"/"World_L"/"World_L_A"/"MapData.json"`. Task 3 hardcodes a
resolver keyed on the map's `BaseDir` from `Map.json`.)

---

## Task 0: Dev setup — uv migration + package skeleton  ✅ DONE (2026-06-27)

This task was completed by the controller (it required environment surgery — the cross-drive
move broke Poetry's venv association, and the project was migrated Poetry→uv per a mid-flight
decision). Recorded here for reproducibility:

- `aion2/tools/maps/__init__.py` and `tests/maps/__init__.py` created (commit `2ba98fb`).
- `pyproject.toml` migrated to uv: dropped `[tool.poetry]`, switched build backend to
  **hatchling** (`[tool.hatch.build.targets.wheel] packages = ["aion2"]`), moved the local
  path dep to `[tool.uv.sources]`, and moved `pytest` into `[dependency-groups] dev`.
- `.python-version` pinned to **3.13** (3.14 lacks prebuilt `scikit-image` wheels → source
  build fails). `.gitignore` added (`.venv/`, `__pycache__/`, `parsed_data/calibration/*.png`).
- `uv sync` populated an in-project `.venv`; `uv.lock` committed (commit `9ebf6c3`).
- Verified: `uv run python -c "import yaml, matplotlib, aion2.tools.maps"` and the editable
  backend client all import; `uv run pytest tests/maps -q` → "no tests ran" (clean).

**All subsequent tasks use `uv run ...` (never `poetry`).** The test runner is
`uv run pytest`. Continue to use *targeted* `git add` (never `git add -A`) — the repo carries
pre-existing uncommitted files.

---

## Task 1: WorldMapMeta parsing + pixel dimensions

**Files:**
- Create: `aion2/tools/maps/worldmap.py`
- Test: `tests/maps/test_transform.py` (shared with Task 2)

- [ ] **Step 1: Write the failing test**

Create `tests/maps/test_transform.py`:

```python
from aion2.tools.maps.worldmap import WorldMapMeta
from aion2.tools.maps import worldmap_path


def test_worldmap_meta_from_real_world_l_a():
    meta = WorldMapMeta.from_json(worldmap_path("World_L_A"), "World_L_A")
    assert (meta.min_x, meta.min_y) == (-408000.0, -408000.0)
    assert (meta.max_x, meta.max_y) == (408000.0, 408000.0)
    assert meta.sector_count_x == 8 and meta.sector_count_y == 8
    assert meta.sector_plane_size == 1024.0
    assert meta.pixel_width == 8192.0
    assert meta.pixel_height == 8192.0
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd "G:/NCSoft/aion2-map/tools" && uv run pytest tests/maps/test_transform.py -q`
Expected: FAIL — `ModuleNotFoundError: aion2.tools.maps.worldmap`.

- [ ] **Step 3: Implement `worldmap.py`**

```python
import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class WorldMapMeta:
    name: str
    min_x: float
    min_y: float
    max_x: float
    max_y: float
    sector_count_x: int
    sector_count_y: int
    sector_plane_size: float

    @property
    def pixel_width(self) -> float:
        return self.sector_count_x * self.sector_plane_size

    @property
    def pixel_height(self) -> float:
        return self.sector_count_y * self.sector_plane_size

    @classmethod
    def from_json(cls, path: Path, name: str) -> "WorldMapMeta":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        d = data["Properties"]["Data"]
        bb = d["WorldBoundBox"]
        return cls(
            name=name,
            min_x=float(bb["Min"]["X"]),
            min_y=float(bb["Min"]["Y"]),
            max_x=float(bb["Max"]["X"]),
            max_y=float(bb["Max"]["Y"]),
            sector_count_x=int(d["SectorSize"]["X"]),
            sector_count_y=int(d["SectorSize"]["Y"]),
            sector_plane_size=float(d["SectorPlaneSize"]),
        )
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd "G:/NCSoft/aion2-map/tools" && uv run pytest tests/maps/test_transform.py -q`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
cd "G:/NCSoft/aion2-map/tools"
git add aion2/tools/maps/worldmap.py tests/maps/test_transform.py
git commit -m "feat(maps): parse WorldMap metadata into WorldMapMeta

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: WorldMapTransform + the 8 orientations

**Files:**
- Create: `aion2/tools/maps/transform.py`
- Test: `tests/maps/test_transform.py` (append)

- [ ] **Step 1: Write the failing tests (append to test_transform.py)**

```python
from aion2.tools.maps.transform import Orientation, ALL_ORIENTATIONS, WorldMapTransform
from aion2.tools.maps.worldmap import WorldMapMeta


def _square_meta():
    # world [0,100]^2 -> pixel [0,100]^2 for easy arithmetic
    return WorldMapMeta("T", 0.0, 0.0, 100.0, 100.0, 1, 1, 100.0)


def test_eight_orientations_exist():
    assert len(ALL_ORIENTATIONS) == 8
    assert len(set(ALL_ORIENTATIONS)) == 8


def test_identity_orientation_maps_directly():
    t = WorldMapTransform(_square_meta(), Orientation(px_from="X", flip_x=False, flip_y=False))
    assert t.world_to_pixel(50.0, 25.0) == (50.0, 25.0)
    assert t.world_to_pixel(0.0, 0.0) == (0.0, 0.0)


def test_flips_and_axis_swap():
    m = _square_meta()
    # flip_y inverts the y axis
    t = WorldMapTransform(m, Orientation("X", False, True))
    assert t.world_to_pixel(50.0, 25.0) == (50.0, 75.0)
    # px_from='Y' swaps which world axis drives pixel-x
    t2 = WorldMapTransform(m, Orientation("Y", False, False))
    assert t2.world_to_pixel(50.0, 25.0) == (25.0, 50.0)
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd "G:/NCSoft/aion2-map/tools" && uv run pytest tests/maps/test_transform.py -q`
Expected: FAIL — `ModuleNotFoundError: aion2.tools.maps.transform`.

- [ ] **Step 3: Implement `transform.py`**

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Orientation:
    px_from: str   # "X" or "Y": which world coordinate drives pixel-x
    flip_x: bool   # invert the pixel-x axis
    flip_y: bool   # invert the pixel-y axis


ALL_ORIENTATIONS = [
    Orientation(px_from, flip_x, flip_y)
    for px_from in ("X", "Y")
    for flip_x in (False, True)
    for flip_y in (False, True)
]


class WorldMapTransform:
    def __init__(self, meta, orientation: Orientation):
        self.meta = meta
        self.o = orientation

    def world_to_pixel(self, wx: float, wy: float) -> tuple[float, float]:
        m = self.meta
        nx = (wx - m.min_x) / (m.max_x - m.min_x)   # normalized world X in [0,1]
        ny = (wy - m.min_y) / (m.max_y - m.min_y)   # normalized world Y in [0,1]
        ux, uy = (nx, ny) if self.o.px_from == "X" else (ny, nx)
        if self.o.flip_x:
            ux = 1.0 - ux
        if self.o.flip_y:
            uy = 1.0 - uy
        return ux * m.pixel_width, uy * m.pixel_height
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd "G:/NCSoft/aion2-map/tools" && uv run pytest tests/maps/test_transform.py -q`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
cd "G:/NCSoft/aion2-map/tools"
git add aion2/tools/maps/transform.py tests/maps/test_transform.py
git commit -m "feat(maps): world->pixel transform with 8 orientations

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Parse subzone polygons from MapData

**Files:**
- Create: `aion2/tools/maps/subzones.py`
- Test: `tests/maps/test_subzones.py`

- [ ] **Step 1: Write the failing test (integration — reads the real MapData)**

```python
from aion2.tools.maps.subzones import parse_subzones, map_data_path


def test_parse_subzones_world_l_a_has_altamia_canyon():
    subs = parse_subzones(map_data_path("World_L_A"))
    by_name = {s.name: s for s in subs}
    assert "AltamiaCanyon" in by_name           # "_Subzone" stripped
    az = by_name["AltamiaCanyon"]
    assert az.label == "AltamiaCanyon_Subzone"
    # Location from the real export (verified 2026-06-27)
    assert abs(az.location[0] - 97417.2578125) < 1e-3
    assert abs(az.location[1] - 76876.796875) < 1e-3
    assert len(az.points) >= 3                  # a real polygon
    assert len(subs) > 20                        # World_L_A has many subzones
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd "G:/NCSoft/aion2-map/tools" && uv run pytest tests/maps/test_subzones.py -q`
Expected: FAIL — `ModuleNotFoundError: aion2.tools.maps.subzones`.

- [ ] **Step 3: Implement `subzones.py`**

```python
import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from . import RAW_ROOT

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
    base = _map_base_dir(map_name)
    return RAW_ROOT / "Data" / "Map" / base / map_name / "MapData.json"


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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd "G:/NCSoft/aion2-map/tools" && uv run pytest tests/maps/test_subzones.py -q`
Expected: 1 passed. (If `map_data_path` resolution fails, print `map_data_path("World_L_A")` and confirm it equals `.../Data/Map/World/World_L/World_L_A/MapData.json`.)

- [ ] **Step 5: Commit**

```bash
cd "G:/NCSoft/aion2-map/tools"
git add aion2/tools/maps/subzones.py tests/maps/test_subzones.py
git commit -m "feat(maps): parse SubzoneVolumeInfoMap polygons from MapData

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Name tokenization + frontend region loader

**Files:**
- Create: `aion2/tools/maps/names.py`
- Create: `aion2/tools/maps/regions_ref.py`
- Test: `tests/maps/test_names.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/maps/test_names.py`:

```python
from aion2.tools.maps.names import tokens
from aion2.tools.maps.regions_ref import load_frontend_regions, centroid
from aion2.tools.maps import regions_yaml_path


def test_tokens_split_camel_and_underscore():
    assert tokens("AltamiaCanyon") == frozenset({"altamia", "canyon"})
    # reordered words still match as a set
    assert tokens("WesternAltamiaHighland") == tokens("AltamiaHighland_Western")


def test_centroid_of_square():
    assert centroid([[0.0, 0.0], [2.0, 0.0], [2.0, 2.0], [0.0, 2.0]]) == (1.0, 1.0)


def test_load_frontend_regions_world_l_a():
    regions = load_frontend_regions(regions_yaml_path("World_L_A"))
    names = {r.name for r in regions}
    assert "AltamiaCanyon" in names
    az = next(r for r in regions if r.name == "AltamiaCanyon")
    assert len(az.points) >= 3        # flattened pixel vertices
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd "G:/NCSoft/aion2-map/tools" && uv run pytest tests/maps/test_names.py -q`
Expected: FAIL — `ModuleNotFoundError: aion2.tools.maps.names`.

- [ ] **Step 3: Implement `names.py`**

```python
import re


def tokens(s: str) -> frozenset[str]:
    s = s.replace("_", " ")
    s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", s)   # split camelCase
    return frozenset(t.lower() for t in s.split() if t)
```

- [ ] **Step 4: Implement `regions_ref.py`**

```python
from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass
class RegionRef:
    name: str
    points: list[list[float]]   # flattened pixel vertices [[x,y], ...]


def centroid(points) -> tuple[float, float]:
    n = len(points)
    sx = sum(p[0] for p in points)
    sy = sum(p[1] for p in points)
    return (sx / n, sy / n)


def load_frontend_regions(path: Path) -> list[RegionRef]:
    doc = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    out: list[RegionRef] = []
    for r in doc.get("regions", []):
        flat: list[list[float]] = []
        for polygon in r.get("borders", []) or []:
            for vertex in polygon:
                flat.append([float(vertex[0]), float(vertex[1])])
        if len(flat) >= 3:
            out.append(RegionRef(name=r["name"], points=flat))
    return out
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd "G:/NCSoft/aion2-map/tools" && uv run pytest tests/maps/test_names.py -q`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
cd "G:/NCSoft/aion2-map/tools"
git add aion2/tools/maps/names.py aion2/tools/maps/regions_ref.py tests/maps/test_names.py
git commit -m "feat(maps): name tokenizer + frontend region reference loader

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Calibrate orientation against ground-truth pairs

**Files:**
- Create: `aion2/tools/maps/calibrate.py`
- Test: `tests/maps/test_calibrate.py`

- [ ] **Step 1: Write the failing test (integration)**

Create `tests/maps/test_calibrate.py`:

```python
from aion2.tools.maps.calibrate import calibrate


def test_calibrate_world_l_a_finds_low_residual_orientation():
    result = calibrate("World_L_A")
    # Enough subzone<->region names match exactly to calibrate
    assert result.num_matches >= 8
    # Regions span hundreds of px; the correct orientation aligns centroids tightly.
    assert result.residual_px < 300.0
    # The second-best orientation must be clearly worse — proves the fit is discriminative.
    assert result.runner_up_residual_px > 2.0 * result.residual_px
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd "G:/NCSoft/aion2-map/tools" && uv run pytest tests/maps/test_calibrate.py -q`
Expected: FAIL — `ModuleNotFoundError: aion2.tools.maps.calibrate`.

- [ ] **Step 3: Implement `calibrate.py`**

```python
import math
from dataclasses import dataclass, field

from .names import tokens
from .regions_ref import centroid, load_frontend_regions
from .subzones import parse_subzones, map_data_path
from .transform import ALL_ORIENTATIONS, Orientation, WorldMapTransform
from .worldmap import WorldMapMeta
from . import worldmap_path, regions_yaml_path


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
    """Return ground-truth pairs: (subzone_world_centroid, region_pixel_centroid, name)."""
    subs = parse_subzones(map_data_path(map_name))
    regions = load_frontend_regions(regions_yaml_path(map_name))
    region_by_tokens = {tokens(r.name): centroid(r.points) for r in regions}
    pairs = []
    for s in subs:
        rc = region_by_tokens.get(tokens(s.name))
        if rc is None:
            continue
        sc = centroid([list(p) for p in s.points])  # subzone world centroid
        pairs.append((sc, rc, s.name))
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd "G:/NCSoft/aion2-map/tools" && uv run pytest tests/maps/test_calibrate.py -q -s`
Expected: 1 passed. If it fails on `residual_px`, print the full `scored` list — a uniformly-high residual means the name matcher found too few/wrong pairs (inspect `_match_pairs`), not that the transform is wrong.

- [ ] **Step 5: Commit**

```bash
cd "G:/NCSoft/aion2-map/tools"
git add aion2/tools/maps/calibrate.py tests/maps/test_calibrate.py
git commit -m "feat(maps): calibrate world->pixel orientation against region ground truth

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: CLI — emit calibration JSON + overlay PNG

**Files:**
- Create: `aion2/tools/maps/__main__.py`
- Output: `parsed_data/calibration/<map>.json`, `parsed_data/calibration/<map>_overlay.png`

- [ ] **Step 1: Implement `__main__.py`**

```python
import argparse
import dataclasses
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from .calibrate import calibrate, _match_pairs
from .subzones import parse_subzones, map_data_path
from .regions_ref import load_frontend_regions
from .transform import WorldMapTransform
from .worldmap import WorldMapMeta
from . import CALIBRATION_OUT, worldmap_path, regions_yaml_path


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
    regions = load_frontend_regions(regions_yaml_path(cal.map_name))

    fig, ax = plt.subplots(figsize=(10, 10))
    for r in regions:                       # existing pixel polygons (blue)
        xs = [p[0] for p in r.points] + [r.points[0][0]]
        ys = [p[1] for p in r.points] + [r.points[0][1]]
        ax.plot(xs, ys, color="tab:blue", linewidth=0.8, alpha=0.6)
    for s in subs:                          # transformed subzone polygons (red)
        pts = [t.world_to_pixel(x, y) for x, y in s.points]
        xs = [p[0] for p in pts] + [pts[0][0]]
        ys = [p[1] for p in pts] + [pts[0][1]]
        ax.plot(xs, ys, color="tab:red", linewidth=0.8, alpha=0.6)
    ax.set_xlim(0, meta.pixel_width)
    ax.set_ylim(meta.pixel_height, 0)       # image-style: y down
    ax.set_aspect("equal")
    ax.set_title(f"{cal.map_name}: existing regions (blue) vs transformed subzones (red)")
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
```

- [ ] **Step 2: Run the CLI on World_L_A**

Run: `cd "G:/NCSoft/aion2-map/tools" && uv run python -m aion2.tools.maps World_L_A`
Expected: prints a chosen orientation, `residual_px` < 300, `matches` ≥ 8; writes
`parsed_data/calibration/World_L_A.json` and `..._overlay.png`.

- [ ] **Step 3: HUMAN VERIFICATION — open the overlay PNG**

Open `G:/NCSoft/aion2-map/tools/parsed_data/calibration/World_L_A_overlay.png`.
Expected: the red (transformed game subzones) and blue (existing frontend regions) polygons
**visibly overlap** — same shapes in the same places. This is the definitive confirmation the
transform (incl. axis orientation/flip) is correct. If red is mirrored/rotated relative to blue,
the calibration picked a wrong orientation — capture the PNG and STOP for review.

- [ ] **Step 4: Commit**

```bash
cd "G:/NCSoft/aion2-map/tools"
git add aion2/tools/maps/__main__.py parsed_data/calibration/World_L_A.json
git commit -m "feat(maps): CLI to emit calibration JSON + overlay PNG

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
> Do NOT commit the PNG (binary, regenerable). Add `parsed_data/calibration/*.png` to the tools `.gitignore` if not already ignored.

---

## Self-Review

- **Spec coverage:** This sub-plan implements row "1A — Coordinate transform" of the Phase 1 decomposition: a reusable `WorldMapTransform` (Tasks 1–2), parsing of game polygons (Task 3) and frontend ground truth (Task 4), calibration of the unknown orientation (Task 5), and a human-verifiable overlay + machine-readable calibration JSON for 1B/1C to consume (Task 6). The world→pixel formula matches the verified fact that the frontend pixel grid equals the WorldMap sector grid.
- **Placeholder scan:** every step has complete, runnable code, real verified constants (World_L_A bounds, AltamiaCanyon location), and exact commands with expected output. No TBD/TODO.
- **Type consistency:** `WorldMapMeta` fields used identically in `worldmap.py`, `transform.py`, `calibrate.py`, `__main__.py`; `Orientation(px_from, flip_x, flip_y)` signature consistent across `transform.py`, tests, and `calibrate.py`; `Subzone(label,name,location,points)` and `RegionRef(name,points)` consistent between producers and `calibrate.py`/`__main__.py`; `centroid()` takes a list of `[x,y]` everywhere.
- **Uncommitted-work safety:** every commit uses targeted `git add`, never `-A`, because the tools repo carries pre-existing uncommitted changes.
- **Risk note:** the only real risk is too few name-matched pairs; Task 5 guards with `num_matches >= 8` and the discriminative `runner_up > 2×` check, and Task 6 Step 3 is a human visual gate before the transform is trusted downstream.
```
