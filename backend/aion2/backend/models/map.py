from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import relationship, Mapped, mapped_column
from aion2.backend.models.base import TimestampMixin
from aion2.backend.interfaces.db import Base
import uuid

if TYPE_CHECKING:
    from aion2.backend.models import Language

class Map(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'maps'

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id
    name: Mapped[str] = mapped_column(String, unique=True,
                                      nullable=False)  # Name serves as the current map id (also for URL)
    # image: Mapped[str] = mapped_column(String, default="")  # Image URL for the map
    tile_width: Mapped[int] = mapped_column(Integer, default=0)  # Map width (in pixels)
    tile_height: Mapped[int] = mapped_column(Integer, default=0)  # Map height (in pixels)
    tiles_count_x: Mapped[int] = mapped_column(Integer, default=0)
    tiles_count_y: Mapped[int] = mapped_column(Integer, default=0)
    order: Mapped[int] = mapped_column(Integer, default=0)  # Display order of the map
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)  # Default value is True
    type: Mapped[str] = mapped_column(String, default="", server_default=text("''"))

    # Relationship to the translations (for i18n)
    translations: Mapped[list["MapTranslation"]] = relationship("MapTranslation", back_populates="map",
                                                                lazy="joined", join_depth=1,
                                                                cascade="all, delete-orphan")

class MapTranslation(Base, TimestampMixin):
    __tablename__ = 'map_translations'

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id (primary key)
    map_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('maps.id', ondelete='CASCADE'), nullable=False)  # Foreign key to Map
    language_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('languages.id', ondelete='CASCADE'), nullable=False)  # Foreign key to Language
    name: Mapped[str] = mapped_column(String, nullable=False)  # Translated name
    description: Mapped[str] = mapped_column(String)  # Translated description

    # Relationships
    map: Mapped["Map"] = relationship("Map", back_populates="translations", lazy="joined", join_depth=1)
    language: Mapped["Language"] = relationship("Language", lazy="joined", join_depth=2)  # Link to Language model

