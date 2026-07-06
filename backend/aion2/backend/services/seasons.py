from fastapi_utils.cbv import cbv
from fastcrud import FastCRUD
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select
from aion2.backend import models, schemas
from aion2.backend.utilities.dependencies import get_db, get_current_superuser, get_season_from_path

router = APIRouter(prefix="/seasons", tags=["seasons"])

season_crud = FastCRUD(models.Season)

@cbv(router)
class Seasons:
    db: AsyncSession = Depends(get_db)

    @router.post("/")
    async def create_season(
        self,
        season_data: schemas.SeasonCreate,
        user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.SeasonRead]:
        season_model = await season_crud.create(self.db, season_data)
        return schemas.SeasonRead.model_validate(season_model).to_response()

    @router.get("/")
    async def list_seasons(self) -> schemas.StandardListResponse[schemas.SeasonRead]:
        count = await season_crud.count(self.db)
        result = await self.db.execute(
            select(models.Season).order_by(models.Season.number, models.Season.matching_number)
        )
        seasons = [schemas.SeasonRead.model_validate(x) for x in result.scalars().all()]
        return schemas.StandardListResponse(seasons, count)

    @router.get("/{season}")
    async def get_season(
        self,
        season_model: models.Season = Depends(get_season_from_path)
    ) -> schemas.StandardResponse[schemas.SeasonRead]:
        return schemas.SeasonRead.model_validate(season_model).to_response()

    @router.patch("/{season}")
    async def update_season(
        self,
        season_data: schemas.SeasonUpdate,
        season_model: models.Season = Depends(get_season_from_path),
        user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.SeasonRead]:
        await season_crud.update(
            self.db, season_data, id=season_model.id,
        )
        await self.db.refresh(season_model)
        return schemas.SeasonRead.model_validate(season_model).to_response()

    @router.delete("/{season}")
    async def delete_season(
        self,
        season_model: models.Season = Depends(get_season_from_path),
        user: models.User = Depends(get_current_superuser),
    ) -> schemas.StandardResponse[schemas.Empty]:
        await self.db.delete(season_model)
        await self.db.commit()
        return schemas.StandardResponse()
