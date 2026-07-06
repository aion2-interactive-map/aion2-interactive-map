from uuid import UUID

from aion2.backend.schemas.base import BaseModel
from aion2.backend.schemas.language import LanguageRead

class SubtypeRead(BaseModel):
    id: UUID
    name: str
    color: str
    icon: str
    icon_scale: float
    hide_tooltip: bool
    order: int
    can_complete: bool
    # category_id: UUID

class SubtypeCreate(BaseModel):
    name: str
    color: str
    icon: str
    icon_scale: float = 1.0
    hide_tooltip: bool = False
    order: int
    can_complete: bool
    order: int
    category_id: str | UUID | None = None
    can_complete: bool = False

class SubtypeUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    icon: str | None = None
    icon_scale: float | None = None
    hide_tooltip: bool | None = None
    order: int | None = None
    category_id: str | UUID | None = None
    can_complete: bool | None = None

class SubtypeTranslationRead(BaseModel):
    id: UUID
    language: LanguageRead
    name: str
    description: str | None

class SubtypeTranslationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
