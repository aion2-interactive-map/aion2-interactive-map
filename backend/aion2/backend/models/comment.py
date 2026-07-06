from typing import TYPE_CHECKING, Optional
import uuid

from sqlalchemy import Boolean, String, ForeignKey, Integer, text, Enum as PgEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import relationship, Mapped, mapped_column

from aion2.backend.models.base import TimestampMixin
from aion2.backend.interfaces.db import Base  # Correct import
from aion2.backend.schemas.comment import CommentTargetType


if TYPE_CHECKING:
    from aion2.backend.models import User, Marker

class Comment(Base, TimestampMixin):
    __tablename__ = "comments"
    __table_args__ = (

    )
    __mapper_args__ = {
        "polymorphic_identity": "comments",
        "polymorphic_on": "target_type",
    }

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'),
                                          nullable=False)  # Foreign key to User
    target_type: Mapped[CommentTargetType] = mapped_column(
        PgEnum(CommentTargetType, name="comment_target_type"),
        nullable=False,
    )
    target_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(String, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # ----------------------------------------------------------
    # Thread structure
    # ----------------------------------------------------------
    # Root comment of the thread:
    # - For first-layer comments: root_id = NULL (this is the root)
    # - For replies: root_id = id of the first-layer comment
    # If the root is deleted, ON DELETE CASCADE will delete all its replies.
    root_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=True,
    )

    # The comment this one is replying to (can be root or another reply).
    # If that comment is deleted, this field is set to NULL, but the reply stays.
    reply_to_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("comments.id", ondelete="SET NULL"),
        nullable=True,
    )
    user: Mapped["User"] = relationship("User", lazy="joined", join_depth=1)


class MarkerComment(Comment):

    __mapper_args__ = {
        "polymorphic_identity": "marker",
    }

    marker: Mapped["Marker"] = relationship(
        "Marker",
        primaryjoin="foreign(MarkerComment.target_id) == Marker.id",
        uselist=False,
        viewonly=True,
        lazy="joined",
        join_depth=1,
    )





