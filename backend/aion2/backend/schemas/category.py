from uuid import UUID
from typing import List

from aion2.backend.schemas.base import BaseModel
from aion2.backend.schemas.language import LanguageRead
from aion2.backend.schemas.subtype import SubtypeRead, SubtypeTranslationRead

class CategoryRead(BaseModel):
    id: UUID
    name: str
    color: str
    icon: str
    order: int

class CategoryReadDetail(CategoryRead):
    subtypes: List[SubtypeRead]  # Forward reference for subtypes
    translations: List["CategoryTranslationRead"]

class CategoryCreate(BaseModel):
    name: str
    color: str
    icon: str
    order: int

class CategoryUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    icon: str | None = None
    order: int | None = None

class CategoryTranslationRead(BaseModel):
    id: UUID
    language: LanguageRead
    name: str

class CategoryTranslationUpdate(BaseModel):
    name: str | None = None

class SubtypeReadDetail(SubtypeRead):
    category: CategoryRead | None
    translations: List[SubtypeTranslationRead]