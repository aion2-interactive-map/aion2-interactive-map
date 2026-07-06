from typing import TYPE_CHECKING

from sqlalchemy import Column, String, ForeignKey, Boolean, Integer, text, Double
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import relationship, Mapped, mapped_column
from aion2.backend.interfaces.db import Base  # Correct import
from aion2.backend.models.base import TimestampMixin
import uuid

if TYPE_CHECKING:
    from aion2.backend.models import Category, Language

class Subtype(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'subtypes'

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # Name of the subtype
    color: Mapped[str] = mapped_column(String)  # Color of the subtype
    icon: Mapped[str] = mapped_column(String)  # Icon for the subtype
    icon_scale: Mapped[float] = mapped_column(Double, default=1.0, server_default=text("1"))
    hide_tooltip: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    order: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))  # Display order of the map
    category_id: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True),
                                                     ForeignKey('categories.id', ondelete='SET NULL'),
                                                     nullable=True)  # Foreign key to Category, nullable
    can_complete: Mapped[bool] = mapped_column(Boolean, default=False)  # Flag for subtypes like "canComplete"

    # Relationship back to the Category
    category: Mapped["Category"] = relationship("Category", back_populates="subtypes", lazy="joined", join_depth=1)
    translations: Mapped[list["SubtypeTranslation"]] = relationship("SubtypeTranslation", back_populates="subtype",
                                                                    lazy="joined", join_depth=1,
                                                                    cascade="all, delete-orphan")


class SubtypeTranslation(Base, TimestampMixin):
    __tablename__ = 'subtype_translations'

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id
    subtype_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('subtypes.id', ondelete='CASCADE'),
                                             nullable=False)  # Foreign key to Subtype
    language_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('languages.id', ondelete='CASCADE'),
                                              nullable=False)  # Foreign key to Language
    name: Mapped[str] = mapped_column(String, nullable=False)  # Translated subtype name
    description: Mapped[str] = mapped_column(String, nullable=True)  # Translated description

    # Relationships
    subtype: Mapped["Subtype"] = relationship("Subtype", back_populates="translations", lazy="joined", join_depth=1)
    language: Mapped["Language"] = relationship("Language", lazy="joined", join_depth=2)  # Link to Language model

