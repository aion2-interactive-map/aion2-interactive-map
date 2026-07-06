from fastapi_utils.cbv import cbv
from fastcrud import FastCRUD
from fastapi import APIRouter, Depends, Body, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from aion2.backend import models, schemas
from aion2.backend.interfaces.cache import clear_cache
from aion2.backend.utilities.dependencies import get_db, get_current_superuser, get_category_from_path, \
    get_category_from_path, get_language_from_path

router = APIRouter(prefix="/categories", tags=["categories"])

category_crud = FastCRUD(models.Category)
category_translation_crud = FastCRUD(models.CategoryTranslation)


@cbv(router)
class Categories:
    user: models.User = Depends(get_current_superuser)
    db: AsyncSession = Depends(get_db)

    @router.post("/")
    async def create_category(
        self,
        category_data: schemas.CategoryCreate,
    ) -> schemas.StandardResponse[schemas.CategoryReadDetail]:
        category_model = await category_crud.create(self.db, category_data)
        await clear_cache(f"data:types")
        return schemas.CategoryReadDetail.model_validate(category_model).to_response()

    @router.get("/")
    async def get_categories(self) -> schemas.StandardListResponse[schemas.CategoryReadDetail]:
        count = await category_crud.count(self.db)
        result = await self.db.execute(select(models.Category).order_by(models.Category.order))
        categories = [schemas.CategoryReadDetail.model_validate(x) for x in result.unique().scalars()]
        return schemas.StandardListResponse(categories, count)


    @router.get("/{category}")
    async def get_category(
        self,
        category_model: models.Category = Depends(get_category_from_path)
    ) -> schemas.StandardResponse[schemas.CategoryReadDetail]:
        await category_model.awaitable_attrs.translations
        await category_model.awaitable_attrs.subtypes
        return schemas.CategoryReadDetail.model_validate(category_model).to_response()

    @router.patch("/{category}")
    async def update_category(
        self,
        category_data: schemas.CategoryUpdate,
        category_model: models.Category = Depends(get_category_from_path),
    ) -> schemas.StandardResponse[schemas.CategoryReadDetail]:
        await category_crud.update(
            self.db, category_data, id=category_model.id,
        )
        await self.db.refresh(category_model)
        await clear_cache(f"data:types")
        return schemas.CategoryReadDetail.model_validate(category_model).to_response()

    @router.delete("/{category}")
    async def delete_category(
        self,
        category_model: models.Category = Depends(get_category_from_path),
    ) -> schemas.StandardResponse[schemas.Empty]:
        await self.db.delete(category_model)
        await self.db.commit()
        await clear_cache(f"data:types")
        return schemas.StandardResponse()

@cbv(router)
class CategoryTranslations:
    user: models.User = Depends(get_current_superuser)
    category_model: models.Category = Depends(get_category_from_path)
    language_model: models.Language = Depends(get_language_from_path)
    db: AsyncSession = Depends(get_db)

    async def get_translation_model(self) -> models.CategoryTranslation:
        result = await self.db.execute(select(models.CategoryTranslation).filter(
            models.CategoryTranslation.language_id == self.language_model.id,
            models.CategoryTranslation.category_id == self.category_model.id,
        ))
        return result.unique().scalar_one_or_none()

    @router.patch("/{category}/translations/{language}")
    async def update_category_translation(
        self,
        translation_data: schemas.CategoryTranslationUpdate,
    ) -> schemas.StandardResponse[schemas.CategoryTranslationRead]:
        translation_model = await self.get_translation_model()
        if translation_model is None:
            translation_model = models.CategoryTranslation(
                category_id=self.category_model.id,
                language_id=self.language_model.id,
                name=translation_data.name or "",
            )
        else:
            if translation_data.name is not None:
                translation_model.name = translation_data.name

        self.db.add(translation_model)
        await self.db.commit()
        await self.db.refresh(translation_model)
        await clear_cache(f"locales:{self.language_model.language_code}:types")
        return schemas.CategoryTranslationRead.model_validate(translation_model).to_response()

    @router.delete("/{category}/translations/{language}")
    async def delete_category_translation(self) -> schemas.StandardResponse[schemas.Empty]:
        translation_model = await self.get_translation_model()
        if translation_model is not None:
            await self.db.delete(translation_model)
            await self.db.commit()
        await clear_cache(f"locales:{self.language_model.language_code}:types")
        return schemas.StandardResponse()
