"""Verified world->pixel orientation per map.

Verified 2026-07-02 via calibrate renders against fast-travel statue layout
(all 137 MainWorld + 15 WorldTree statues on land; alternatives fail).
Re-verify if map art changes.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Orientation:
    px_axis: str  # "X" or "Y": which world coordinate drives pixel-x
    flip_x: bool
    flip_y: bool


ORIENTATIONS: dict[str, Orientation] = {
    "MainWorld": Orientation("Y", False, True),
    "WorldTree": Orientation("Y", False, True),
}
