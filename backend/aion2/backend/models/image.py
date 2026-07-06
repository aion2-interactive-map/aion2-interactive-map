from typing import TYPE_CHECKING
import uuid

from sqlalchemy import Column, String, ForeignKey, Integer, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import relationship, Mapped, mapped_column

from aion2.backend.models.base import TimestampMixin
from aion2.backend.interfaces.db import Base  # Correct import


class Image(Base, TimestampMixin):
    __tablename__ = "images"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id
    s3_key: Mapped[str] = mapped_column(String(64), nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
