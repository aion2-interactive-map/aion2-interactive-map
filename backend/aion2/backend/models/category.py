from typing import TYPE_CHECKING

from sqlalchemy import Column, String, ForeignKey, Integer, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid

from aion2.backend.models.base import TimestampMixin
from aion2.backend.interfaces.db import Base  # Correct import

if TYPE_CHECKING:
    from aion2.backend.models import Subtype, Language

class Category(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'categories'

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # Name of the category (represents the ID)
    color: Mapped[str] = mapped_column(String)  # Color of the category
    icon: Mapped[str] = mapped_column(String)  # Icon for the category
    order: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))  # Display order of the map

    # Relationship to subtypes
    subtypes: Mapped[list["Subtype"]] = relationship("Subtype", back_populates="category", lazy="joined", join_depth=1, order_by="Subtype.order")
    translations: Mapped[list["CategoryTranslation"]] = relationship("CategoryTranslation", back_populates="category",
                                                                     lazy="joined", join_depth=1,
                                                                     cascade="all, delete-orphan")

class CategoryTranslation(Base, TimestampMixin):
    __tablename__ = 'category_translations'

    id: Mapped[UUID] = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id
    category_id: Mapped[UUID] = Column(UUID(as_uuid=True), ForeignKey('categories.id', ondelete='CASCADE'), nullable=False)  # Foreign key to Category
    language_id: Mapped[UUID] = Column(UUID(as_uuid=True), ForeignKey('languages.id', ondelete='CASCADE'), nullable=False)  # Foreign key to Language
    name: Mapped[str] = Column(String, nullable=False)  # Translated category name

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="translations", lazy="joined", join_depth=1)
    language: Mapped["Language"] = relationship("Language", lazy="joined", join_depth=2)  # Link to Language model

