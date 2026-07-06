from typing import TYPE_CHECKING

from sqlalchemy import Column, String, Float, ForeignKey, JSON, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import relationship, Mapped, mapped_column
from aion2.backend.interfaces.db import Base  # Correct import
from aion2.backend.models.base import TimestampMixin
import uuid

if TYPE_CHECKING:
    from aion2.backend.models import Map, Category, Subtype, Language

class Region(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'regions'

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    map_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('maps.id', ondelete='CASCADE'),
                                         nullable=False)

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    type: Mapped[str] = mapped_column(String, default="", server_default=text("''"))
    borders: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=list,  # Python-side default: []
        server_default=text("'[]'::jsonb"),  # DB-side default: []
    )


    map: Mapped["Map"] = relationship("Map", lazy="joined", join_depth=1)
    translations: Mapped[list["RegionTranslation"]] = relationship("RegionTranslation", back_populates="region",
                                                                   lazy="joined", join_depth=1,
                                                                   cascade="all, delete-orphan")

class RegionTranslation(Base, TimestampMixin):
    __tablename__ = "region_translations"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    region_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('regions.id', ondelete='CASCADE'), nullable=False)
    language_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('languages.id', ondelete='CASCADE'),
                                              nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=True)

    region: Mapped["Region"] = relationship("Region", back_populates="translations", lazy="joined", join_depth=1)
    language: Mapped["Language"] = relationship("Language", lazy="joined", join_depth=2)
