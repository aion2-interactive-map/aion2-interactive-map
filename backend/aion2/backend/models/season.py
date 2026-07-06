import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import Mapped, mapped_column

from aion2.backend.models.base import TimestampMixin
from aion2.backend.interfaces.db import Base

class Season(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'seasons'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    matching_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    server_region: Mapped[str] = mapped_column(String, nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint('number', 'matching_number', 'server_region', name='_number_matching_server_region_uc'),
    )
