import uuid

from fastapi_users import schemas
from aion2.backend.schemas.base import BaseModel

class UserRead(schemas.BaseUser[uuid.UUID], BaseModel):
    name: str


class UserCreate(schemas.BaseUserCreate, BaseModel):
    name: str


class UserUpdate(schemas.BaseUserUpdate, BaseModel):
    name: str | None
