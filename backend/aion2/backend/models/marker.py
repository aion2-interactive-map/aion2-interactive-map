from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Column, String, Float, ForeignKey, JSON, UniqueConstraint, Integer, Enum as PgEnum, Text, \
    DateTime, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import relationship, Mapped, mapped_column
from aion2.backend.interfaces.db import Base  # Correct import
from aion2.backend.models.base import TimestampMixin
from aion2.backend.schemas import UserRead
from aion2.backend.schemas.marker import MarkerFeedbackType, MarkerFeedbackStatus
import uuid

if TYPE_CHECKING:
    from aion2.backend.models import Map, Region, Subtype, Language, Image, User

class Marker(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'markers'
    __table_args__ = (
        Index('idx_marker_map_subtype_index', 'map_id', 'subtype_id', 'index_in_subtype'),
    )

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id for marker
    map_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('maps.id', ondelete='CASCADE'),
                                         nullable=False)  # Foreign key to Map
    subtype_id: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('subtypes.id', ondelete='SET NULL'), nullable=True)  # Foreign key to Subtype
    region_id: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('regions.id', ondelete='SET NULL'), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)  # Name of the marker
    x: Mapped[float] = mapped_column(Float, nullable=False)  # X-coordinate of the marker
    y: Mapped[float] = mapped_column(Float, nullable=False)  # Y-coordinate of the marker
    index_in_subtype: Mapped[int | None] = mapped_column(Integer, nullable=True)
    icon: Mapped[str] = mapped_column(String, nullable=True)
    # TODO(remove): user-uploaded marker type — pending frontend removal of
    # user-defined markers (already done). The "uploaded" value has no remaining
    # producer/consumer. See docs/deprecations/user-uploaded-marker-type.md.
    # Do NOT drop yet; needs a follow-up migration. NOTE: MarkerFeedback.type is
    # an unrelated enum and must stay.
    type: Mapped[str] = mapped_column(String, nullable=True)

    # Relationships to other models
    map: Mapped["Map"] = relationship("Map", lazy="joined", join_depth=1)  # Relationship to Map model
    subtype: Mapped["Subtype"] = relationship("Subtype", lazy="joined", join_depth=1)  # Relationship to Subtype model
    region: Mapped["Region"] = relationship("Region", lazy="joined", join_depth=1)


    images: Mapped[list["MarkerImage"]] = relationship("MarkerImage", back_populates="marker",
                                                                   lazy="joined", join_depth=1,
                                                                   cascade="all, delete-orphan")

    # Relationship to translations (one-to-many)
    translations: Mapped[list["MarkerTranslation"]] = relationship("MarkerTranslation", back_populates="marker",
                                                                   lazy="joined", join_depth=1,
                                                                   cascade="all, delete-orphan")
    contributors: Mapped[list["MarkerContributor"]] = relationship("MarkerContributor", back_populates="marker",
                                                                   lazy="joined", join_depth=1, order_by="MarkerContributor.created_at",
                                                                   cascade="all, delete-orphan")

class MarkerImage(Base, TimestampMixin):
    __tablename__ = 'marker_images'
    __table_args__ = (
        UniqueConstraint("marker_id", "image_id"),
    )

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id for translation
    marker_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('markers.id', ondelete='CASCADE'), nullable=False)  # Foreign key to Marker
    image_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('images.id', ondelete='CASCADE'), nullable=False)  # Foreign key to Marker
    order: Mapped[int] = mapped_column(Integer, default=0)

    marker: Mapped["Marker"] = relationship("Marker", back_populates="images", lazy="joined", join_depth=1, order_by="MarkerImage.order")
    image: Mapped["Image"] = relationship("Image", lazy="joined", join_depth=2)  # Link to Image model



class MarkerFeedback(Base, TimestampMixin):
    __tablename__ = 'marker_feedbacks'
    # __table_args__ = ()

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id for translation
    map_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('maps.id', ondelete='CASCADE'),
                                         nullable=False)  # Foreign key to Map
    subtype_id: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('subtypes.id', ondelete='SET NULL'), nullable=True)  # Foreign key to Subtype
    marker_id: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('markers.id', ondelete='SET NULL'), nullable=True)  # Foreign key to Marker
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'),
                                          nullable=False)  # Foreign key to User
    image_id: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('images.id', ondelete='SET NULL'), nullable=True)

    type: Mapped[MarkerFeedbackType] = mapped_column(
        PgEnum(MarkerFeedbackType, name="feedback_type"),
        nullable=False,
    )
    status: Mapped[MarkerFeedbackStatus] = mapped_column(
        PgEnum(MarkerFeedbackStatus, name="feedback_status"),
        nullable=False,
        default=MarkerFeedbackStatus.PENDING,
    )

    # Optional editable fields
    x: Mapped[int | None] = mapped_column(nullable=True)
    y: Mapped[int | None] = mapped_column(nullable=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Admin response
    reply: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship("User", lazy="joined", join_depth=1)
    marker: Mapped["Marker"] = relationship("Marker", lazy="joined", join_depth=1)
    image: Mapped["Image"] = relationship("Image", lazy="joined", join_depth=1)



class MarkerTranslation(Base, TimestampMixin):
    __tablename__ = 'marker_translations'

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id for translation
    marker_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('markers.id', ondelete='CASCADE'), nullable=False)  # Foreign key to Marker
    language_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('languages.id', ondelete='CASCADE'), nullable=False)  # Foreign key to Language
    name: Mapped[str] = mapped_column(String, nullable=False)  # Translated name of the marker
    description: Mapped[str] = mapped_column(String, nullable=True)  # Translated description of the marker

    # Relationships
    marker: Mapped["Marker"] = relationship("Marker", back_populates="translations", lazy="joined", join_depth=1)
    language: Mapped["Language"] = relationship("Language", lazy="joined", join_depth=2)  # Link to Language model


class MarkerContributor(Base, TimestampMixin):
    __tablename__ = "marker_contributors"
    __table_args__ = (
        UniqueConstraint("marker_id", "user_id"),
    )

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    marker_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('markers.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    marker: Mapped["Marker"] = relationship("Marker", back_populates="contributors", lazy="joined", join_depth=1)
    user: Mapped["User"] = relationship("User", lazy="joined", join_depth=2)
