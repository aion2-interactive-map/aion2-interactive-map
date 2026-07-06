from uuid import UUID
from aion2.backend.schemas.base import BaseModel

class ImageRead(BaseModel):
    id: UUID
    s3_key: str
    height: int
    width: int

class ImageCreate(BaseModel):
    s3_key: str
    height: int
    width: int

