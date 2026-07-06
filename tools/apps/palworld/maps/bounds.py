"""Map assignment by world bounds (port of bounds.mjs)."""

from __future__ import annotations


def assign_map(world: dict, maps: list[dict]) -> str | None:
    """Return the mapId whose bounds contain `world`, or None. `maps` is a list
    of {"mapId", "min": {X,Y}, "max": {X,Y}} tried in order."""
    for m in maps:
        mn, mx = m["min"], m["max"]
        if mn["X"] <= world["X"] <= mx["X"] and mn["Y"] <= world["Y"] <= mx["Y"]:
            return m["mapId"]
    return None
