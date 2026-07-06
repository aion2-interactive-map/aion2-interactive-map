from uuid import UUID

from fastapi_utils.cbv import cbv
from fastcrud import FastCRUD
from fastapi import APIRouter, Depends, Body, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from aion2.backend import models, schemas
from aion2.backend.interfaces.cache import clear_cache
from aion2.backend.utilities.dependencies import get_db, get_current_superuser, get_region_from_path, \
    get_language_from_path, get_map_from_path
from aion2.backend.utilities.exceptions import BizError, ErrorCode

router = APIRouter(prefix="/maps/{map}/regions", tags=["regions"])

region_crud = FastCRUD(models.Region)
region_translation_crud = FastCRUD(models.RegionTranslation)


@cbv(router)
class Regions:
    user: models.User = Depends(get_current_superuser)
    map_model: models.Map = Depends(get_map_from_path)
    db: AsyncSession = Depends(get_db)

    @router.post("/")
    async def create_region(
        self,
        region_data: schemas.RegionCreate,
    ) -> schemas.StandardResponse[schemas.RegionReadDetail]:
        region_data.map_id = self.map_model.id
        region_model = await region_crud.create(self.db, region_data)
        await clear_cache(f"data:regions:{self.map_model.name}")
        return schemas.RegionReadDetail.model_validate(region_model).to_response()

    @router.get("/")
    async def list_regions(self) -> schemas.StandardListResponse[schemas.RegionReadDetail]:
        count = await region_crud.count(self.db)
        result = await self.db.execute(select(models.Region).where(models.Region.map_id == self.map_model.id))
        regions = [schemas.RegionReadDetail.model_validate(x) for x in result.unique().scalars()]
        return schemas.StandardListResponse(regions, count)


    @router.get("/{region}")
    async def get_region(
        self,
        region_model: models.Region = Depends(get_region_from_path)
    ) -> schemas.StandardResponse[schemas.RegionReadDetail]:
        return schemas.RegionReadDetail.model_validate(region_model).to_response()

    @router.patch("/{region}")
    async def update_region(
        self,
        region_data: schemas.RegionUpdate,
        region_model: models.Region = Depends(get_region_from_path),
    ) -> schemas.StandardResponse[schemas.RegionReadDetail]:
        await region_crud.update(
            self.db, region_data, id=region_model.id,
        )
        await self.db.refresh(region_model)
        await clear_cache(f"data:regions:{self.map_model.name}")
        return schemas.RegionReadDetail.model_validate(region_model).to_response()

    @router.delete("/{region}")
    async def delete_region(
        self,
        region_model: models.Region = Depends(get_region_from_path),
    ) -> schemas.StandardResponse[schemas.Empty]:
        await self.db.delete(region_model)
        await self.db.commit()
        await clear_cache(f"data:regions:{self.map_model.name}")
        return schemas.StandardResponse()

@cbv(router)
class RegionTranslations:
    user: models.User = Depends(get_current_superuser)
    map_model: models.Map = Depends(get_map_from_path)
    region_model: models.Region = Depends(get_region_from_path)
    language_model: models.Language = Depends(get_language_from_path)
    db: AsyncSession = Depends(get_db)

    async def get_translation_model(self) -> models.RegionTranslation:
        result = await self.db.execute(select(models.RegionTranslation).filter(
            models.RegionTranslation.language_id == self.language_model.id,
            models.RegionTranslation.region_id == self.region_model.id,
        ))
        return result.unique().scalar_one_or_none()

    @router.patch("/{region}/translations/{language}")
    async def update_region_translation(
        self,
        translation_data: schemas.RegionTranslationUpdate,
    ) -> schemas.StandardResponse[schemas.RegionTranslationRead]:
        translation_model = await self.get_translation_model()
        if translation_model is None:
            translation_model = models.RegionTranslation(
                region_id=self.region_model.id,
                language_id=self.language_model.id,
                name=translation_data.name or "",
                description=translation_data.description or "",
            )
        else:
            if translation_data.name is not None:
                translation_model.name = translation_data.name
            if translation_data.description is not None:
                translation_model.description = translation_data.description

        self.db.add(translation_model)
        await self.db.commit()
        await self.db.refresh(translation_model)
        await clear_cache(f"locales:{self.language_model.language_code}:regions:{self.map_model.name}")
        return schemas.RegionTranslationRead.model_validate(translation_model).to_response()

    @router.delete("/{region}/translations/{language}")
    async def delete_region_translation(self) -> schemas.StandardResponse[schemas.Empty]:
        translation_model = await self.get_translation_model()
        if translation_model is not None:
            await self.db.delete(translation_model)
            await self.db.commit()
            await clear_cache(f"locales:{self.language_model.language_code}:regions:{self.map_model.name}")
        return schemas.StandardResponse()


