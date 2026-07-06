import uuid
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy.dialects.postgresql import UUID
from aion2.backend.interfaces.db import Base
from aion2.backend.models.base import TimestampMixin


class Language(Base, TimestampMixin):
    __tablename__ = 'languages'

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # UUID id
    language_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)  # ISO 639-1 language code (e.g., "en", "fr")
