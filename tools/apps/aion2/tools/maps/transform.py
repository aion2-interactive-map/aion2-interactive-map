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
