from uuid import UUID
from typing import Optional, List
from aion2.backend.schemas.base import BaseModel
from aion2.backend.schemas.language import LanguageRead
# Map Schemas

class MapRead(BaseModel):
    id: UUID
    name: str
    tile_width: int
    tile_height: int
    tiles_count_x: int
    tiles_count_y: int
    order: int
    is_visible: bool
    type: str

class MapReadDetail(MapRead):
    translations: List["MapTranslationRead"]  # Forward reference to MapTranslationRead


class MapCreate(BaseModel):
    name: str
    order: int
    tile_width: int
    tile_height: int
    tiles_count_x: int
    tiles_count_y: int
    type: str = ""
    is_visible: bool = True  # Default value is True


class MapUpdate(BaseModel):
    name: str | None = None
    tile_width: int | None = None
    tile_height: int | None = None
    tiles_count_x: int | None = None
    tiles_count_y: int | None = None
    order: int | None = None
    is_visible: bool | None = None
    type: str | None = None


# MapTranslation Schemas

class MapTranslationRead(BaseModel):
    id: UUID
    language: LanguageRead
    name: str
    description: str | None


class MapTranslationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
