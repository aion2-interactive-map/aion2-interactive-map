from uuid import UUID
from aion2.backend.schemas.base import BaseModel

class LanguageRead(BaseModel):
    id: UUID
    language_code: str

class LanguageCreate(BaseModel):
    language_code: str

class LanguageUpdate(BaseModel):
    language_code: str | None = None

class LanguageTranslationRead(BaseModel):
    id: UUID
    name: str
    description: str | None

class LanguageTranslationCreate(BaseModel):
    language_id: UUID
    name: str
    description: str | None = None

class LanguageTranslationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
