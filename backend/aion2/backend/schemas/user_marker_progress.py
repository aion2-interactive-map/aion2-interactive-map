import base64
from uuid import UUID

from pydantic import field_serializer, field_validator

from aion2.backend.schemas.base import BaseModel

class UserMarkerProgressRead(BaseModel):
    id: UUID
    user_id: UUID
    map_id: UUID
    subtype_id: UUID
    bitset: bytes

    @field_serializer("bitset")
    def serialize_bitset(self, v: bytes, _info):
        return base64.b64encode(v).decode("ascii")  # << encoded correctly

class UserMarkerProgressUpdateBit(BaseModel):
    completed: bool

class UserMarkerProgressUpdateAll(BaseModel):
    bitset: bytes

    @field_validator("bitset", mode="before")
    def decode_bitset_b64(cls, v):
        if isinstance(v, bytes):
            return v  # already raw bytes (unlikely from JSON)
        if isinstance(v, str):
            try:
                return base64.b64decode(v)  # safe decode
            except Exception:
                raise ValueError("Invalid base64 bitset string")
        raise ValueError("bitset must be base64 string")



