from uuid import UUID
from typing import Optional
from aion2.backend.schemas.base import BaseModel
from aion2.backend.schemas.season import SeasonRead

class ServerRead(BaseModel):
    id: UUID
    server_region: str
    race_id: int
    server_id: int
    server_name: str
    server_short_name: str

class ServerCreate(BaseModel):
    server_region: str
    race_id: int
    server_id: int
    server_name: str
    server_short_name: str

class ServerUpdate(BaseModel):
    server_region: Optional[str] = None
    race_id: Optional[int] = None
    server_id: Optional[int] = None
    server_name: Optional[str] = None
    server_short_name: Optional[str] = None

class ServerMatchingRead(BaseModel):
    id: UUID
    season_id: UUID
    server1_id: UUID
    server2_id: UUID
    order: int

class ServerMatchingReadDetail(ServerMatchingRead):
    season: SeasonRead
    server1: ServerRead
    server2: ServerRead

class ServerMatchingCreate(BaseModel):
    server1_id: UUID
    server2_id: UUID
    order: Optional[int] = 0

class ServerMatchingCreateInternal(ServerMatchingCreate):
    season_id: UUID

class ServerMatchingUpdate(BaseModel):
    server1_id: Optional[UUID] = None
    server2_id: Optional[UUID] = None
    order: Optional[int] = None
