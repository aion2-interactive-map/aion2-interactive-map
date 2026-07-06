from io import BytesIO

from PIL import Image
from pathlib import Path
from fastapi_utils.cbv import cbv
from fastcrud import FastCRUD, JoinConfig
from fastapi import APIRouter, Depends, Body, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from aion2.backend import models, schemas
from aion2.backend.config.manager import settings
from aion2.backend.interfaces.cache import clear_cache
from aion2.backend.utilities.dependencies import get_db, get_current_superuser, get_map_from_path, get_language_from_path

router = APIRouter(prefix="/maps", tags=["maps"])

map_crud = FastCRUD(models.Map)
map_translation_crud = FastCRUD(models.MapTranslation)


@cbv(router)
class Maps:
    user: models.User = Depends(get_current_superuser)
    db: AsyncSession = Depends(get_db)

    # @staticmethod
    # def fs_delete_map_image(map_model: models.Map):
    #     if map_model.image:
    #         old_image_path = settings.IMAGES_DIR / "images" / "maps" / map_model.image
    #         logger.info(f"Delete old image: {old_image_path}")
    #         old_image_path.unlink(missing_ok=True)

    @router.post("/")
    async def create_map(
        self,
        map_data: schemas.MapCreate,
    ) -> schemas.StandardResponse[schemas.MapReadDetail]:
        map_model = await map_crud.create(self.db, map_data)
        await clear_cache("data:maps")
        return schemas.MapReadDetail.model_validate(map_model).to_response()

    @router.get("/")
    async def list_maps(self) -> schemas.StandardListResponse[schemas.MapReadDetail]:
        count = await map_crud.count(self.db)
        result = await self.db.execute(select(models.Map).order_by(models.Map.order))
        maps = [schemas.MapReadDetail.model_validate(x) for x in result.unique().scalars()]
        return schemas.StandardListResponse(maps, count)


    @router.get("/{map}")
    async def get_map(
            self,
            map_model: models.Map = Depends(get_map_from_path),
    ) -> schemas.StandardResponse[schemas.MapReadDetail]:
        return schemas.MapReadDetail.model_validate(map_model).to_response()

    @router.patch("/{map}")
    async def update_map(
        self,
        map_data: schemas.MapUpdate,
        map_model: models.Map = Depends(get_map_from_path),
    ) -> schemas.StandardResponse[schemas.MapReadDetail]:
        map_read = await map_crud.update(
            self.db, map_data, id=map_model.id,
            schema_to_select=schemas.MapReadDetail, return_as_model=True
        )
        await clear_cache("data:maps")
        logger.info(f"Updated map: {map_model}")
        return map_read.to_response()

    @router.delete("/{map}")
    async def delete_map(
        self,
        map_model: models.Map = Depends(get_map_from_path),
    ) -> schemas.StandardResponse[schemas.Empty]:
        # self.fs_delete_map_image(map_model)
        await self.db.delete(map_model)
        await self.db.commit()
        await clear_cache("data:maps")
        return schemas.StandardResponse()

    # @router.post("/{map}/upload")
    # async def upload_map(
    #     self,
    #     map_model: models.Map = Depends(get_map_from_path),
    #     image: UploadFile = File(...)
    # ) -> schemas.StandardResponse[schemas.MapReadDetail]:
    #     image_bytes = await image.read()
    #     image_file = Image.open(BytesIO(image_bytes))
    #     width, height = image_file.size
    #
    #     file_extension = Path(image.filename).suffix
    #     image_filename = f"{map_model.id}{file_extension}"
    #     image_path = settings.IMAGES_DIR / "images" / "maps" / image_filename
    #     image_path.parent.mkdir(parents=True, exist_ok=True)
    #
    #     self.fs_delete_map_image(map_model)
    #
    #     logger.info(f"Save new image: {image_path}")
    #     with image_path.open("wb") as f:
    #         f.write(image_bytes)
    #
    #     map_model.image = image_filename
    #     map_model.width = width
    #     map_model.height = height
    #
    #     self.db.add(map_model)
    #     await self.db.commit()
    #     await self.db.refresh(map_model)
    #
    #     return schemas.MapReadDetail.model_validate(map_model).to_response()


@cbv(router)
class MapTranslations:
    user: models.User = Depends(get_current_superuser)
    map_model: models.Map = Depends(get_map_from_path)
    language_model: models.Language = Depends(get_language_from_path)
    db: AsyncSession = Depends(get_db)

    async def get_translation_model(self) -> models.MapTranslation:
        result = await self.db.execute(select(models.MapTranslation).filter(
            models.MapTranslation.language_id == self.language_model.id,
            models.MapTranslation.map_id == self.map_model.id,
        ))
        return result.unique().scalar_one_or_none()

    @router.patch("/{map}/translations/{language}")
    async def update_map_translation(
        self,
        translation_data: schemas.MapTranslationUpdate,
    ) -> schemas.StandardResponse[schemas.MapTranslationRead]:
        translation_model = await self.get_translation_model()
        if translation_model is None:
            translation_model = models.MapTranslation(
                map_id=self.map_model.id,
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
        return schemas.MapTranslationRead.model_validate(translation_model).to_response()

    @router.delete("/{map}/translations/{language}")
    async def delete_map_translation(self) -> schemas.StandardResponse[schemas.Empty]:
        translation_model = await self.get_translation_model()
        if translation_model is not None:
            await self.db.delete(translation_model)
            await self.db.commit()
        return schemas.StandardResponse()