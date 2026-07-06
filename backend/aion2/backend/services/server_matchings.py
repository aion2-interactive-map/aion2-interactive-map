from fastapi_utils.cbv import cbv
from fastcrud import FastCRUD
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from aion2.backend import models, schemas
from aion2.backend.utilities.dependencies import get_db, get_current_superuser, get_server_matching_from_path, get_season_from_path
from aion2.backend.utilities.exceptions import BizError, ErrorCode

router = APIRouter(prefix="/seasons/{season}/server_matchings", tags=["server_matchings"])

server_matching_crud = FastCRUD(models.ServerMatching)

@cbv(router)
class ServerMatchings:
    db: AsyncSession = Depends(get_db)
    season_model: models.Season = Depends(get_season_from_path)

    @router.post("/")
    async def create_server_matching(
        self,
        matching_data: schemas.ServerMatchingCreate,
        user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.ServerMatchingReadDetail]:
        matching_model = await server_matching_crud.create(
            self.db,
            schemas.ServerMatchingCreateInternal(
                **matching_data.model_dump(),
                season_id=self.season_model.id
            )
        )
        # Refresh to load relationships for ReadDetail
        await self.db.refresh(matching_model, ["season", "server1", "server2"])
        return schemas.ServerMatchingReadDetail.model_validate(matching_model).to_response()

    @router.get("/")
    async def list_server_matchings(self) -> schemas.StandardListResponse[schemas.ServerMatchingReadDetail]:
        from sqlalchemy import select, func
        from sqlalchemy.orm import joinedload
        
        count_query = select(func.count()).select_from(models.ServerMatching).where(models.ServerMatching.season_id == self.season_model.id)
        count = (await self.db.execute(count_query)).scalar()
        
        query = select(models.ServerMatching).options(
            joinedload(models.ServerMatching.season),
            joinedload(models.ServerMatching.server1),
            joinedload(models.ServerMatching.server2)
        ).join(models.ServerMatching.server1).where(
            models.ServerMatching.season_id == self.season_model.id
        ).order_by(models.ServerMatching.order.asc())
        
        result_db = await self.db.execute(query)
        matchings = [schemas.ServerMatchingReadDetail.model_validate(x) for x in result_db.unique().scalars()]
        return schemas.StandardListResponse(matchings, count)

    @router.get("/{server_matching}")
    async def get_server_matching(
        self,
        matching_model: models.ServerMatching = Depends(get_server_matching_from_path)
    ) -> schemas.StandardResponse[schemas.ServerMatchingReadDetail]:
        if matching_model.season_id != self.season_model.id:
            raise BizError(ErrorCode.SeasonNotFoundError)
        # Refresh to load relationships for ReadDetail
        await self.db.refresh(matching_model, ["season", "server1", "server2"])
        return schemas.ServerMatchingReadDetail.model_validate(matching_model).to_response()

    @router.patch("/{server_matching}")
    async def update_server_matching(
        self,
        matching_data: schemas.ServerMatchingUpdate,
        matching_model: models.ServerMatching = Depends(get_server_matching_from_path),
        user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.ServerMatchingReadDetail]:
        if matching_model.season_id != self.season_model.id:
            raise BizError(ErrorCode.SeasonNotFoundError)
        await server_matching_crud.update(
            self.db, matching_data, id=matching_model.id,
        )
        await self.db.refresh(matching_model, ["season", "server1", "server2"])
        return schemas.ServerMatchingReadDetail.model_validate(matching_model).to_response()

    @router.delete("/{server_matching}")
    async def delete_server_matching(
        self,
        matching_model: models.ServerMatching = Depends(get_server_matching_from_path),
        user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.Empty]:
        if matching_model.season_id != self.season_model.id:
            raise BizError(ErrorCode.SeasonNotFoundError)
        await self.db.delete(matching_model)
        await self.db.commit()
        return schemas.StandardResponse()
