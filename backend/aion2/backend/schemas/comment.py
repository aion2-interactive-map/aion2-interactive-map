from datetime import datetime
from uuid import UUID

from aion2.backend.schemas.base import BaseModel
from aion2.backend.schemas.user import UserRead
from aion2.backend.schemas.marker import MarkerRead
from enum import Enum

class CommentTargetType(str, Enum):
    marker = "marker"


class CommentRead(BaseModel):
    id: UUID
    content: str
    root_id: UUID | None = None
    reply_to_id: UUID | None = None
    target_type: CommentTargetType
    target_id: UUID
    created_at: datetime
    verified: bool

    user_id: UUID
    user: UserRead

class MarkerCommentRead(CommentRead):
    marker: MarkerRead

class CommentCreate(BaseModel):
    reply_to_id: UUID | None = None
    content: str
