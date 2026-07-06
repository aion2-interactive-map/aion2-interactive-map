"""Shared helpers for the palworld pipeline.

Kept deliberately faithful to the original JS so the emitted JSON matches
byte-for-byte: JS `Math.round` rounds half toward +Inf (not banker's rounding),
`JSON.stringify` writes raw UTF-8 with no ``.0`` on integral numbers, and
``JSON.stringify(obj, null, 1)`` uses a 1-space indent.
"""

from __future__ import annotations

import json
import math
from pathlib import Path


def js_round(v: float) -> int:
    """Integer round matching JS ``Math.round`` (half toward +Inf), unlike
    Python's banker's rounding. Used for dedup bucket keys."""
    return math.floor(v + 0.5)


def round2(v: float) -> float:
    """2-decimal round matching JS ``Math.round(v*100)/100`` (half toward +Inf)."""
    return math.floor(v * 100 + 0.5) / 100


def read_rows(file: Path | str) -> dict:
    """Read a CUE4Parse table export: ``[{"Rows": {...}}]`` -> the Rows dict."""
    with open(file, encoding="utf-8") as fh:
        return json.load(fh)[0]["Rows"]


def _canon(o):
    # Render integral floats as ints (JS: `1.0` serializes as `1`).
    if isinstance(o, bool):
        return o
    if isinstance(o, float):
        return int(o) if o.is_integer() else o
    if isinstance(o, dict):
        return {k: _canon(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_canon(v) for v in o]
    return o


def dumps(obj) -> str:
    """JSON string matching ``JSON.stringify(obj, null, 1)``."""
    return json.dumps(_canon(obj), ensure_ascii=False, indent=1)


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dumps(obj), encoding="utf-8")
