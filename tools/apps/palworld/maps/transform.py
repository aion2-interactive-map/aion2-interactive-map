"""World<->pixel coordinate transforms (port of transform.mjs)."""

from __future__ import annotations

from collections.abc import Callable

from .orientation import Orientation

# A world location is a mapping with "X"/"Y"/"Z" keys.
World = dict


def make_transform(bounds: dict, o: Orientation, pixel_w: float, pixel_h: float) -> Callable[[World], tuple[float, float]]:
    mn, mx = bounds["min"], bounds["max"]
    px_axis = o.px_axis
    py_axis = "Y" if px_axis == "X" else "X"

    def to_pixel(world: World) -> tuple[float, float]:
        x = (world[px_axis] - mn[px_axis]) / (mx[px_axis] - mn[px_axis]) * pixel_w
        y = (world[py_axis] - mn[py_axis]) / (mx[py_axis] - mn[py_axis]) * pixel_h
        if o.flip_x:
            x = pixel_w - x
        if o.flip_y:
            y = pixel_h - y
        return x, y

    return to_pixel


def make_inverse_transform(bounds: dict, o: Orientation, pixel_w: float, pixel_h: float) -> Callable[[float, float], World]:
    """Inverse of make_transform: pixel (x, y) -> world {X, Y}. Used to emit raw
    world coordinates for cluster centroids (computed in pixel space)."""
    mn, mx = bounds["min"], bounds["max"]
    px_axis = o.px_axis
    py_axis = "Y" if px_axis == "X" else "X"

    def to_world(px: float, py: float) -> World:
        fx, fy = px, py
        if o.flip_x:
            fx = pixel_w - fx
        if o.flip_y:
            fy = pixel_h - fy
        world = {"X": 0.0, "Y": 0.0}
        world[px_axis] = fx / pixel_w * (mx[px_axis] - mn[px_axis]) + mn[px_axis]
        world[py_axis] = fy / pixel_h * (mx[py_axis] - mn[py_axis]) + mn[py_axis]
        return world

    return to_world
