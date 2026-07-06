import uuid
from datetime import datetime
from typing import Optional, List
from fastapi_utils.cbv import cbv
from fastcrud import FastCRUD
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from aion2.backend import models, schemas
from aion2.backend.utilities.dependencies import get_db, get_current_superuser, get_current_user, \
    get_abyss_artifact_from_path, \
    get_map_from_path, get_season_from_path, get_abyss_artifact_state_from_path, get_server_matching_from_path
from aion2.backend.interfaces.user import fastapi_users
from aion2.backend.utilities.exceptions import BizError, ErrorCode

router = APIRouter(prefix="/seasons/{season}/maps/{map}/artifacts", tags=["abyss_artifacts_states"])
artifacts_router = APIRouter(prefix="/maps/{map}/artifacts", tags=["abyss_artifacts"])
admin_router = APIRouter(prefix="/seasons/{season}/server_matchings/{server_matching}/abyss_artifact_admins", tags=["abyss_artifact_admins"])

abyss_artifact_crud = FastCRUD(models.AbyssArtifact)
abyss_artifact_state_crud = FastCRUD(models.AbyssArtifactState)
admin_crud = FastCRUD(models.AbyssArtifactAdmin)


async def get_admin_from_path(
    admin_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> models.AbyssArtifactAdmin:
    model = await db.get(models.AbyssArtifactAdmin, admin_id)
    if model is None:
        raise BizError(ErrorCode.AbyssArtifactAdminNotFoundError)
    return model


async def update_abyss_artifact_contributor(db: AsyncSession, abyss_artifact_state_id: uuid.UUID, user_id: uuid.UUID):
    result = await db.execute(
        select(models.AbyssArtifactContributor).
        where(models.AbyssArtifactContributor.abyss_artifact_state_id == abyss_artifact_state_id).
        where(models.AbyssArtifactContributor.user_id == user_id)
    )
    contributor = result.unique().scalar_one_or_none()
    if contributor is None:
        contributor = models.AbyssArtifactContributor(abyss_artifact_state_id=abyss_artifact_state_id, user_id=user_id)
        db.add(contributor)
        await db.commit()


@cbv(router)
class AbyssArtifactStates:
    db: AsyncSession = Depends(get_db)
    map_model: models.Map = Depends(get_map_from_path)
    season_model: models.Season = Depends(get_season_from_path)

    async def _validate_record_time(
            self,
            server_matching_id: uuid.UUID,
            map_id: uuid.UUID,
            record_time: datetime,
            exclude_id: Optional[uuid.UUID] = None
    ):
        from datetime import timezone
        # Normalize record_time to UTC aware for safe comparison
        record_time_utc = record_time
        if record_time_utc.tzinfo is None:
            record_time_utc = record_time_utc.replace(tzinfo=timezone.utc)
        else:
            record_time_utc = record_time_utc.astimezone(timezone.utc)

        # Validate that the record time is within the season range
        season_start = self.season_model.start_date
        season_end = self.season_model.end_date

        if season_start.tzinfo is None:
            season_start = season_start.replace(tzinfo=timezone.utc)
        else:
            season_start = season_start.astimezone(timezone.utc)

        if season_end.tzinfo is None:
            season_end = season_end.replace(tzinfo=timezone.utc)
        else:
            season_end = season_end.astimezone(timezone.utc)

        if record_time_utc < season_start or record_time_utc > season_end:
            raise BizError(
                ErrorCode.ValidationError,
                f"Record time must be between {self.season_model.start_date} and {self.season_model.end_date}."
            )

        # Find states with same server_matching_id and map_id that are verified
        query = select(models.AbyssArtifactState).where(
            models.AbyssArtifactState.server_matching_id == server_matching_id,
            models.AbyssArtifactState.map_id == map_id,
            models.AbyssArtifactState.is_verified == True
        )
        if exclude_id:
            query = query.where(models.AbyssArtifactState.id != exclude_id)

        result = await self.db.execute(query)
        existing_states = result.unique().scalars().all()

        for state in existing_states:
            # Normalize both datetimes to UTC aware for safe comparison
            dt1 = state.record_time
            dt2 = record_time_utc

            if dt1.tzinfo is None:
                dt1 = dt1.replace(tzinfo=timezone.utc)
            else:
                dt1 = dt1.astimezone(timezone.utc)

            diff = abs((dt1 - dt2).total_seconds())
            if diff < 48 * 3600:
                raise BizError(
                    ErrorCode.ValidationError,
                    f"Record time must be at least 48 hours apart from existing records. Conflict with {state.record_time}"
                )

    async def _is_artifact_admin(self, user: models.User, server_matching_id: uuid.UUID) -> bool:
        if user.is_superuser:
            return True
        admin_result = await self.db.execute(
            select(models.AbyssArtifactAdmin).where(
                models.AbyssArtifactAdmin.user_id == user.id,
                models.AbyssArtifactAdmin.server_matching_id == server_matching_id
            )
        )
        return admin_result.unique().scalar_one_or_none() is not None

    @router.post("/states")
    async def create_abyss_artifact_state(
            self,
            state_data: schemas.AbyssArtifactStateCreate,
            user: models.User = Depends(get_current_user),
    ) -> schemas.StandardResponse[schemas.AbyssArtifactStateRead]:
        # Verify matching exists and belongs to the season
        result = await self.db.execute(
            select(models.ServerMatching).where(
                models.ServerMatching.id == state_data.server_matching_id,
                models.ServerMatching.season_id == self.season_model.id
            )
        )
        matching = result.unique().scalar_one_or_none()
        if matching is None:
            raise BizError(ErrorCode.ServerMatchingNotFoundError)

        await self._validate_record_time(
            state_data.server_matching_id,
            self.map_model.id,
            state_data.record_time
        )

        is_artifact_admin = await self._is_artifact_admin(user, state_data.server_matching_id)

        state_model = models.AbyssArtifactState(
            server_matching_id=state_data.server_matching_id,
            map_id=self.map_model.id,
            states=[s.model_dump(mode='json') for s in state_data.states],
            is_verified=is_artifact_admin,
            record_time=state_data.record_time
        )
        self.db.add(state_model)

        await self.db.commit()
        await self.db.refresh(state_model)

        await update_abyss_artifact_contributor(self.db, state_model.id, user.id)

        return await self._get_state_read_response(state_model, user)

    @router.patch("/states/{state}")
    async def update_abyss_artifact_state(
            self,
            state_data: schemas.AbyssArtifactStateUpdate,
            state_model: models.AbyssArtifactState = Depends(get_abyss_artifact_state_from_path),
            user: models.User = Depends(get_current_user),
    ) -> schemas.StandardResponse[schemas.AbyssArtifactStateRead]:
        is_artifact_admin = await self._is_artifact_admin(user, state_model.server_matching_id)

        if state_model.is_verified and not is_artifact_admin:
            raise BizError(ErrorCode.PermissionError)

        if not is_artifact_admin:
            contributor_ids = [c.user_id for c in state_model.contributors]
            if user.id not in contributor_ids:
                raise BizError(ErrorCode.PermissionError)

        if state_model.server_matching.season_id != self.season_model.id:
            raise   BizError(ErrorCode.SeasonNotFoundError)

        if state_data.record_time is not None:
            await self._validate_record_time(
                state_model.server_matching_id,
                state_model.map_id,
                state_data.record_time,
                exclude_id=state_model.id
            )
            state_model.record_time = state_data.record_time

        if state_data.states is not None:
            state_model.states = [s.model_dump(mode='json') for s in state_data.states]

        if state_data.is_verified is not None:
            if is_artifact_admin:
                state_model.is_verified = state_data.is_verified

        if is_artifact_admin:
            state_model.is_verified = True

        await self.db.commit()
        await self.db.refresh(state_model)

        await update_abyss_artifact_contributor(self.db, state_model.id, user.id)

        return await self._get_state_read_response(state_model, user)

    @router.post("/states/{state}/verify")
    async def verify_abyss_artifact_state(
            self,
            state_model: models.AbyssArtifactState = Depends(get_abyss_artifact_state_from_path),
            user: models.User = Depends(get_current_user),
    ) -> schemas.StandardResponse[schemas.AbyssArtifactStateRead]:
        is_artifact_admin = await self._is_artifact_admin(user, state_model.server_matching_id)

        if not is_artifact_admin:
            raise BizError(ErrorCode.PermissionError)

        if state_model.server_matching.season_id != self.season_model.id:
            raise BizError(ErrorCode.SeasonNotFoundError)

        # Validate record time before verifying
        await self._validate_record_time(
            state_model.server_matching_id,
            state_model.map_id,
            state_model.record_time,
            exclude_id=state_model.id
        )

        state_model.is_verified = True
        await self.db.commit()
        await self.db.refresh(state_model)

        return await self._get_state_read_response(state_model, user)

    @router.delete("/states/{state}")
    async def delete_abyss_artifact_state(
            self,
            state_model: models.AbyssArtifactState = Depends(get_abyss_artifact_state_from_path),
            user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.Empty]:
        if state_model.server_matching.season_id != self.season_model.id:
            raise BizError(ErrorCode.SeasonNotFoundError)

        await self.db.delete(state_model)
        await self.db.commit()
        return schemas.StandardResponse()

    @router.post("/states/{state}/vote")
    async def vote_abyss_artifact_state(
            self,
            vote_data: schemas.AbyssArtifactVoteCreate,
            state_model: models.AbyssArtifactState = Depends(get_abyss_artifact_state_from_path),
            user: models.User = Depends(get_current_user),
    ) -> schemas.StandardResponse[schemas.AbyssArtifactStateRead]:
        from sqlalchemy import delete
        
        # Check if user already voted
        existing_vote_query = select(models.AbyssArtifactVote).where(
            models.AbyssArtifactVote.abyss_artifact_state_id == state_model.id,
            models.AbyssArtifactVote.user_id == user.id
        )
        existing_vote = (await self.db.execute(existing_vote_query)).scalar_one_or_none()
        
        if existing_vote:
            if existing_vote.vote == vote_data.vote:
                # Same vote, remove it (cancel vote)
                await self.db.delete(existing_vote)
            else:
                # Different vote, update it
                existing_vote.vote = vote_data.vote
        else:
            # New vote
            new_vote = models.AbyssArtifactVote(
                abyss_artifact_state_id=state_model.id,
                user_id=user.id,
                vote=vote_data.vote
            )
            self.db.add(new_vote)
            
        await self.db.commit()
        await self.db.refresh(state_model)
        
        # Return updated state
        return await self._get_state_read_response(state_model, user)

    async def _get_state_read_response(
            self, 
            state: models.AbyssArtifactState, 
            user: Optional[models.User] = None
    ) -> schemas.StandardResponse[schemas.AbyssArtifactStateRead]:
        upvotes_count = 0
        downvotes_count = 0
        user_vote = None
        
        # We need to ensure votes are loaded
        # Since we use joinedload in get_abyss_artifact_state_from_path, they might be there
        # But for new votes just added, we might need to refresh or query
        
        query = select(models.AbyssArtifactVote).where(
            models.AbyssArtifactVote.abyss_artifact_state_id == state.id
        )
        result = await self.db.execute(query)
        votes = result.scalars().all()
        
        for v in votes:
            if v.vote:
                upvotes_count += 1
            else:
                downvotes_count += 1
            if user and v.user_id == user.id:
                user_vote = v.vote
        
        res = schemas.AbyssArtifactStateRead.model_validate(state)
        res.upvotes_count = upvotes_count
        res.downvotes_count = downvotes_count
        res.user_vote = user_vote
        return res.to_response()

    @router.get("/states")
    async def list_abyss_artifact_states(
            self,
            server_matching_id: Optional[uuid.UUID] = Query(None),
            current_time: Optional[datetime] = Query(None),
            user: Optional[models.User] = Depends(fastapi_users.current_user(optional=True)),
    ) -> schemas.StandardListResponse[schemas.AbyssArtifactStateRead]:
        from sqlalchemy import desc
        from sqlalchemy.orm import joinedload

        # Base query
        query = select(models.AbyssArtifactState).options(
            joinedload(models.AbyssArtifactState.contributors).joinedload(models.AbyssArtifactContributor.user),
            joinedload(models.AbyssArtifactState.votes)
        ).where(
            models.AbyssArtifactState.map_id == self.map_model.id,
            models.AbyssArtifactState.server_matching.has(
                models.ServerMatching.season_id == self.season_model.id
            )
        )

        if server_matching_id:
            # If server_matching_id is found, output all states of the server_matching_id ordered by record time desc.
            query = query.where(models.AbyssArtifactState.server_matching_id == server_matching_id)
            query = query.order_by(desc(models.AbyssArtifactState.record_time))
        else:
            # If server_matching_id is not found, output only one state for each server matching (the original behavior)
            query = query.distinct(models.AbyssArtifactState.server_matching_id)

            if current_time:
                query = query.where(models.AbyssArtifactState.record_time <= current_time)

            # To use distinct on a column, it must be the first column in order_by
            query = query.order_by(
                models.AbyssArtifactState.server_matching_id,
                desc(models.AbyssArtifactState.record_time)
            )

        if current_time and server_matching_id:
            query = query.where(models.AbyssArtifactState.record_time <= current_time)

        result = await self.db.execute(query)
        states = result.unique().scalars().all()

        response_list = []
        for s in states:
            upvotes_count = 0
            downvotes_count = 0
            user_vote = None
            for v in s.votes:
                if v.vote:
                    upvotes_count += 1
                else:
                    downvotes_count += 1
                if user and v.user_id == user.id:
                    user_vote = v.vote
            
            read_schema = schemas.AbyssArtifactStateRead.model_validate(s)
            read_schema.upvotes_count = upvotes_count
            read_schema.downvotes_count = downvotes_count
            read_schema.user_vote = user_vote
            response_list.append(read_schema)

        return schemas.StandardListResponse(response_list)

    @router.get("/count")
    async def count_artifacts_by_server(
            self,
    ) -> schemas.StandardListResponse[schemas.AbyssArtifactServerCount]:
        from sqlalchemy import desc, func
        from sqlalchemy.orm import joinedload

        # 1. Total artifacts on this map
        total_query = select(func.count(models.AbyssArtifact.id)).where(
            models.AbyssArtifact.marker.has(models.Marker.map_id == self.map_model.id)
        )
        artifact_total = (await self.db.execute(total_query)).scalar() or 0

        # 2. Get all map states in this season for this map
        states_query = select(models.AbyssArtifactState).options(
            joinedload(models.AbyssArtifactState.server_matching).joinedload(models.ServerMatching.server1),
            joinedload(models.AbyssArtifactState.server_matching).joinedload(models.ServerMatching.server2)
        ).where(
            models.AbyssArtifactState.map_id == self.map_model.id,
            models.AbyssArtifactState.server_matching.has(
                models.ServerMatching.season_id == self.season_model.id
            )
        )

        result = await self.db.execute(states_query)
        all_map_states = result.unique().scalars().all()

        # 3. Aggregate counts per server
        # state = 1 -> server1, state = 2 -> server2
        counts = {}  # server_id -> count

        # Optimization: get all artifacts on this map
        artifacts_on_map_query = select(models.AbyssArtifact.id).where(
            models.AbyssArtifact.marker.has(models.Marker.map_id == self.map_model.id)
        )
        artifacts_on_map = set((await self.db.execute(artifacts_on_map_query)).scalars().all())

        for ms in all_map_states:
            for s in ms.states:
                # Handle both UUID object and string from JSON
                artifact_id = s['abyss_artifact_id']
                if isinstance(artifact_id, str):
                    artifact_id = uuid.UUID(artifact_id)

                if artifact_id in artifacts_on_map:
                    if s['state'] == 1:
                        sid = ms.server_matching.server1.server_id
                        counts[sid] = counts.get(sid, 0) + 1
                    elif s['state'] == 2:
                        sid = ms.server_matching.server2.server_id
                        counts[sid] = counts.get(sid, 0) + 1

        # 4. We also want to include all servers in this season's matchings, even if they have 0 artifacts
        # Get all servers in matchings for this season
        matchings_query = select(models.ServerMatching).where(
            models.ServerMatching.season_id == self.season_model.id
        ).options(
            joinedload(models.ServerMatching.server1),
            joinedload(models.ServerMatching.server2)
        )
        matchings_result = await self.db.execute(matchings_query)
        matchings = matchings_result.unique().scalars().all()

        server_ids = set()
        for m in matchings:
            server_ids.add(m.server1.server_id)
            server_ids.add(m.server2.server_id)

        response_data = []
        for sid in sorted(list(server_ids)):
            response_data.append(schemas.AbyssArtifactServerCount(
                server_id=sid,
                artifact_count=counts.get(sid, 0),
                artifact_total=artifact_total
            ))

        return schemas.StandardListResponse(response_data)


@cbv(artifacts_router)
class AbyssArtifacts:
    db: AsyncSession = Depends(get_db)
    map_model: models.Map = Depends(get_map_from_path)

    @artifacts_router.post("/")
    async def create_abyss_artifact(
            self,
            artifact_data: schemas.AbyssArtifactCreate,
            user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.AbyssArtifactReadDetail]:
        result = await self.db.execute(
            select(models.Marker).where(
                models.Marker.id == artifact_data.marker_id,
                models.Marker.map_id == self.map_model.id
            )
        )
        marker = result.unique().scalar_one_or_none()
        if marker is None:
            raise BizError(ErrorCode.MarkerNotFoundError)
        artifact_model = await abyss_artifact_crud.create(self.db, artifact_data)
        return schemas.AbyssArtifactReadDetail.model_validate(artifact_model).to_response()

    @artifacts_router.get("/")
    async def get_abyss_artifacts(self) -> schemas.StandardListResponse[schemas.AbyssArtifactReadDetail]:
        result = await self.db.execute(
            select(models.AbyssArtifact).
            where(models.AbyssArtifact.marker.has(models.Marker.map_id == self.map_model.id))
        )
        artifacts = [schemas.AbyssArtifactReadDetail.model_validate(x) for x in result.unique().scalars()]
        return schemas.StandardListResponse(artifacts)

    @artifacts_router.get("/{abyss_artifact}")
    async def get_abyss_artifact(
            self,
            artifact_model: models.AbyssArtifact = Depends(get_abyss_artifact_from_path)
    ) -> schemas.StandardResponse[schemas.AbyssArtifactReadDetail]:
        if artifact_model.marker.map_id != self.map_model.id:
            raise BizError(ErrorCode.MapNotFoundError)
        return schemas.AbyssArtifactReadDetail.model_validate(artifact_model).to_response()

    @artifacts_router.patch("/{abyss_artifact}")
    async def update_abyss_artifact(
            self,
            artifact_data: schemas.AbyssArtifactUpdate,
            artifact_model: models.AbyssArtifact = Depends(get_abyss_artifact_from_path),
            user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.AbyssArtifactReadDetail]:
        if artifact_model.marker.map_id != self.map_model.id:
            raise BizError(ErrorCode.MapNotFoundError)
        await abyss_artifact_crud.update(
            self.db, artifact_data, id=artifact_model.id,
        )
        await self.db.refresh(artifact_model)
        return schemas.StandardResponse[schemas.AbyssArtifactReadDetail](
            data=schemas.AbyssArtifactReadDetail.model_validate(artifact_model)
        )

    @artifacts_router.delete("/{abyss_artifact}")
    async def delete_abyss_artifact(
            self,
            artifact_model: models.AbyssArtifact = Depends(get_abyss_artifact_from_path),
            user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.Empty]:
        if artifact_model.marker.map_id != self.map_model.id:
            raise BizError(ErrorCode.MapNotFoundError)
        await self.db.delete(artifact_model)
        await self.db.commit()
        return schemas.StandardResponse()


@cbv(admin_router)
class AbyssArtifactAdmins:
    db: AsyncSession = Depends(get_db)
    season_model: models.Season = Depends(get_season_from_path)
    matching_model: models.ServerMatching = Depends(get_server_matching_from_path)

    @admin_router.post("/{user_id}")
    async def create_admin(
        self,
        user_id: uuid.UUID,
        user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.AbyssArtifactAdminReadDetail]:
        # Verify matching in path belongs to the season
        if self.matching_model.season_id != self.season_model.id:
            raise BizError(ErrorCode.SeasonNotFoundError)

        admin_model = await admin_crud.create(self.db, schemas.AbyssArtifactAdminCreate(
            user_id=user_id,
            server_matching_id=self.matching_model.id
        ))
        await self.db.refresh(admin_model, ["user", "server_matching"])
        return schemas.AbyssArtifactAdminReadDetail.model_validate(admin_model).to_response()

    @admin_router.get("/")
    async def list_admins(
        self,
    ) -> schemas.StandardListResponse[schemas.AbyssArtifactAdminReadDetail]:
        if self.matching_model.season_id != self.season_model.id:
            raise BizError(ErrorCode.SeasonNotFoundError)

        query = select(models.AbyssArtifactAdmin).options(
            joinedload(models.AbyssArtifactAdmin.user),
            joinedload(models.AbyssArtifactAdmin.server_matching).joinedload(models.ServerMatching.server1),
            joinedload(models.AbyssArtifactAdmin.server_matching).joinedload(models.ServerMatching.server2),
            joinedload(models.AbyssArtifactAdmin.server_matching).joinedload(models.ServerMatching.season)
        ).where(
            models.AbyssArtifactAdmin.server_matching_id == self.matching_model.id
        )
        result = await self.db.execute(query)
        admins = [schemas.AbyssArtifactAdminReadDetail.model_validate(x) for x in result.unique().scalars()]
        return schemas.StandardListResponse(admins, len(admins))

    @admin_router.delete("/{user_id}")
    async def delete_admin(
        self,
        user_id: uuid.UUID,
        user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.Empty]:
        if self.matching_model.season_id != self.season_model.id:
            raise BizError(ErrorCode.SeasonNotFoundError)
        
        # Find the admin record for this user and matching
        result = await self.db.execute(
            select(models.AbyssArtifactAdmin).where(
                models.AbyssArtifactAdmin.user_id == user_id,
                models.AbyssArtifactAdmin.server_matching_id == self.matching_model.id
            )
        )
        admin_model = result.unique().scalar_one_or_none()
        if admin_model is None:
            raise BizError(ErrorCode.AbyssArtifactAdminNotFoundError)
            
        await self.db.delete(admin_model)
        await self.db.commit()
        return schemas.StandardResponse()
