import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import ForeignKey, UniqueConstraint, Integer, DateTime, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import Mapped, mapped_column, relationship

from aion2.backend.models.base import TimestampMixin
from aion2.backend.interfaces.db import Base

if TYPE_CHECKING:
    from aion2.backend.models import Map, Marker, ServerMatching, User

class AbyssArtifact(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'abyss_artifacts'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    marker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('markers.id', ondelete='CASCADE'), nullable=False, unique=True)
    order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    marker: Mapped["Marker"] = relationship("Marker", lazy="joined", join_depth=1)

class AbyssArtifactState(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'abyss_artifact_states'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    map_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('maps.id', ondelete='CASCADE'), nullable=False)
    server_matching_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('server_matchings.id', ondelete='CASCADE'), nullable=False)
    states: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    record_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    map: Mapped["Map"] = relationship("Map", lazy="joined", join_depth=1)
    server_matching: Mapped["ServerMatching"] = relationship("ServerMatching", lazy="joined", join_depth=1)
    contributors: Mapped[list["AbyssArtifactContributor"]] = relationship("AbyssArtifactContributor", back_populates="abyss_artifact_state", cascade="all, delete-orphan", lazy="joined", join_depth=1)
    votes: Mapped[list["AbyssArtifactVote"]] = relationship("AbyssArtifactVote", back_populates="abyss_artifact_state", cascade="all, delete-orphan")

class AbyssArtifactContributor(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = "abyss_artifact_contributors"
    __table_args__ = (
        UniqueConstraint("abyss_artifact_state_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    abyss_artifact_state_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('abyss_artifact_states.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    abyss_artifact_state: Mapped["AbyssArtifactState"] = relationship("AbyssArtifactState", back_populates="contributors")
    user: Mapped["User"] = relationship("User", lazy="joined", join_depth=1)

class AbyssArtifactVote(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'abyss_artifact_votes'
    __table_args__ = (
        UniqueConstraint("abyss_artifact_state_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    abyss_artifact_state_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('abyss_artifact_states.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    vote: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # Relationships
    abyss_artifact_state: Mapped["AbyssArtifactState"] = relationship("AbyssArtifactState", back_populates="votes")
    user: Mapped["User"] = relationship("User", lazy="joined", join_depth=1)

class AbyssArtifactAdmin(AsyncAttrs, Base, TimestampMixin):
    __tablename__ = 'abyss_artifact_admins'
    __table_args__ = (
        UniqueConstraint("user_id", "server_matching_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    server_matching_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('server_matchings.id', ondelete='CASCADE'), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", lazy="joined", join_depth=1)
    server_matching: Mapped["ServerMatching"] = relationship("ServerMatching", lazy="joined", join_depth=1)
