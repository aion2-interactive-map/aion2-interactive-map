import uuid
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import Mapped, mapped_column, relationship

from aion2.backend.models.base import TimestampMixin
from aion2.backend.interfaces.db import Base

if TYPE_CHECKING:
    from aion2.backend.models.season import Season

class Server(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'servers'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_region: Mapped[str] = mapped_column(String, nullable=False)
    race_id: Mapped[int] = mapped_column(Integer, nullable=False)
    server_id: Mapped[int] = mapped_column(Integer, nullable=False)
    server_name: Mapped[str] = mapped_column(String, nullable=False)
    server_short_name: Mapped[str] = mapped_column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint('server_region', 'server_id', name='_server_region_server_id_uc'),
    )

class ServerMatching(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'server_matchings'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    season_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('seasons.id', ondelete='CASCADE'), nullable=False)
    server1_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('servers.id', ondelete='CASCADE'), nullable=False)
    server2_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('servers.id', ondelete='CASCADE'), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    season: Mapped["Season"] = relationship("Season", lazy="joined", join_depth=1)
    server1: Mapped["Server"] = relationship("Server", foreign_keys=[server1_id], lazy="joined", join_depth=1)
    server2: Mapped["Server"] = relationship("Server", foreign_keys=[server2_id], lazy="joined", join_depth=1)
