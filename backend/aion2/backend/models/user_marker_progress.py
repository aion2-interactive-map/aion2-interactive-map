from typing import TYPE_CHECKING

from sqlalchemy import Column, String, Float, ForeignKey, JSON, UniqueConstraint, Integer, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import relationship, Mapped, mapped_column
from aion2.backend.interfaces.db import Base  # Correct import
from aion2.backend.models.base import TimestampMixin
import uuid

if TYPE_CHECKING:
    from aion2.backend.models import Map, Region, Subtype, Language, Image

class UserMarkerProgress(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = "user_marker_progress"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "map_id",
            "subtype_id",
            name="uq_user_marker_progress_user_map_subtype",
        ),
    )

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id for marker
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'),
                                         nullable=False)  # Foreign key to User
    map_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('maps.id', ondelete='CASCADE'),
                                         nullable=False)  # Foreign key to Map
    subtype_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('subtypes.id', ondelete='CASCADE'),
                                                    nullable=False)  # Foreign key to Subtype
    bitset: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    subtype: Mapped["Subtype"] = relationship("Subtype", lazy="selectin", join_depth=1)  # Relationship to Subtype model