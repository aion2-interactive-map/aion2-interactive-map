from uuid import UUID

from fastapi_utils.cbv import cbv
from fastcrud import FastCRUD
from fastapi import APIRouter, Depends, Body, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from aion2.backend import models, schemas
from aion2.backend.interfaces.cache import clear_cache
from aion2.backend.utilities.dependencies import get_db, get_current_superuser, get_subtype_from_path, \
    get_subtype_from_path, get_category_from_path, get_language_from_path
from aion2.backend.utilities.exceptions import BizError, ErrorCode

router = APIRouter(prefix="/subtypes", tags=["subtypes"])

subtype_crud = FastCRUD(models.Subtype)
subtype_translation_crud = FastCRUD(models.SubtypeTranslation)


@cbv(router)
class Categories:
    user: models.User = Depends(get_current_superuser)
    db: AsyncSession = Depends(get_db)

    async def check_category_id(self, category_id: str | UUID | None) -> UUID | None:
        if category_id is None:
            return None
        try:
            category_model = await get_category_from_path(category_id, self.db)
            return category_model.id
        except:
            raise BizError(ErrorCode.CategoryNotFoundError)

    @router.post("/")
    async def create_subtype(
        self,
        subtype_data: schemas.SubtypeCreate,
    ) -> schemas.StandardResponse[schemas.SubtypeReadDetail]:
        subtype_data.category_id = await self.check_category_id(subtype_data.category_id)
        subtype_model = await subtype_crud.create(self.db, subtype_data)
        await clear_cache("data:types")
        return schemas.SubtypeReadDetail.model_validate(subtype_model).to_response()

    @router.get("/")
    async def get_subtypes(self) -> schemas.StandardListResponse[schemas.SubtypeReadDetail]:
        count = await subtype_crud.count(self.db)
        result = await self.db.execute(
            select(models.Subtype).
            order_by(models.Subtype.category_id).
            order_by(models.Subtype.order)
        )
        subtypes = [schemas.SubtypeReadDetail.model_validate(x) for x in result.unique().scalars()]
        return schemas.StandardListResponse(subtypes, count)


    @router.get("/{subtype}")
    async def get_subtype(
        self,
        subtype_model: models.Subtype = Depends(get_subtype_from_path)
    ) -> schemas.StandardResponse[schemas.SubtypeReadDetail]:
        await subtype_model.awaitable_attrs.translations
        await subtype_model.awaitable_attrs.subtypes
        return schemas.SubtypeReadDetail.model_validate(subtype_model).to_response()

    @router.patch("/{subtype}")
    async def update_subtype(
        self,
        subtype_data: schemas.SubtypeUpdate,
        subtype_model: models.Subtype = Depends(get_subtype_from_path),
    ) -> schemas.StandardResponse[schemas.SubtypeReadDetail]:
        subtype_data.category_id = await self.check_category_id(subtype_data.category_id)
        await subtype_crud.update(
            self.db, subtype_data, id=subtype_model.id,
        )
        await self.db.refresh(subtype_model)
        await clear_cache("data:types")
        return schemas.SubtypeReadDetail.model_validate(subtype_model).to_response()

    @router.delete("/{subtype}")
    async def delete_subtype(
        self,
        subtype_model: models.Subtype = Depends(get_subtype_from_path),
    ) -> schemas.StandardResponse[schemas.Empty]:
        await self.db.delete(subtype_model)
        await self.db.commit()
        await clear_cache("data:types")
        return schemas.StandardResponse()

@cbv(router)
class SubtypeTranslations:
    user: models.User = Depends(get_current_superuser)
    subtype_model: models.Subtype = Depends(get_subtype_from_path)
    language_model: models.Language = Depends(get_language_from_path)
    db: AsyncSession = Depends(get_db)

    async def get_translation_model(self) -> models.SubtypeTranslation:
        result = await self.db.execute(select(models.SubtypeTranslation).filter(
            models.SubtypeTranslation.language_id == self.language_model.id,
            models.SubtypeTranslation.subtype_id == self.subtype_model.id,
        ))
        return result.unique().scalar_one_or_none()

    @router.patch("/{subtype}/translations/{language}")
    async def update_subtype_translation(
        self,
        translation_data: schemas.SubtypeTranslationUpdate,
    ) -> schemas.StandardResponse[schemas.SubtypeTranslationRead]:
        translation_model = await self.get_translation_model()
        if translation_model is None:
            translation_model = models.SubtypeTranslation(
                subtype_id=self.subtype_model.id,
                language_id=self.language_model.id,
                name=translation_data.name or "",
                description=translation_data.description or "",
            )
        else:
            if translation_data.name is not None:
                translation_model.name = translation_data.name
            if translation_data.description is not None:
                translation_model.name = translation_data.description

        self.db.add(translation_model)
        await self.db.commit()
        await self.db.refresh(translation_model)
        await clear_cache(f"locales:{self.language_model.language_code}:types")
        return schemas.SubtypeTranslationRead.model_validate(translation_model).to_response()

    @router.delete("/{subtype}/translations/{language}")
    async def delete_subtype_translation(self) -> schemas.StandardResponse[schemas.Empty]:
        translation_model = await self.get_translation_model()
        if translation_model is not None:
            await self.db.delete(translation_model)
            await self.db.commit()
        await clear_cache(f"locales:{self.language_model.language_code}:types")
        return schemas.StandardResponse()
