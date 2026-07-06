from uuid import UUID
from typing import List, Tuple

from pydantic import Field

from aion2.backend.schemas.base import BaseModel
from aion2.backend.schemas.language import LanguageRead
from aion2.backend.schemas.map import MapRead

# ---- Type aliases for clarity ----

Coordinate = List[float]                  # [x, y]
Polygon = List[Coordinate]               # one polygon
Borders = List[Polygon]                   # list of polygons




class RegionRead(BaseModel):
    id: UUID
    map_id: UUID
    name: str
    type: str
    borders: Borders


class RegionReadDetail(RegionRead):
    map: MapRead
    translations: List["RegionTranslationRead"]  # Forward reference for translations

class RegionCreate(BaseModel):
    map_id: UUID | None = None
    name: str
    type: str = ""
    borders: Borders | None = []

class RegionUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    borders: Borders | None

class RegionTranslationRead(BaseModel):
    id: UUID
    language: LanguageRead
    name: str
    description: str | None

class RegionTranslationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

