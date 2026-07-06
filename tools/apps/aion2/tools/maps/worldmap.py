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
