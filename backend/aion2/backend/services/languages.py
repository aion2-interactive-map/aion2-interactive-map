from fastapi import APIRouter, Depends
from fastapi_utils.cbv import cbv
from fastcrud import FastCRUD
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from aion2.backend import models, schemas
from aion2.backend.utilities.dependencies import get_db, get_current_superuser, get_map_from_path, get_category_from_path

router = APIRouter(prefix="/languages", tags=["languages"])

languages_crud = FastCRUD(models.Language)

@cbv(router)
class Languages:
    user: models.User = Depends(get_current_superuser)
    db: AsyncSession = Depends(get_db)

    @router.post("/")
    async def create_language(
        self,
        language_data: schemas.LanguageCreate,
    ) -> schemas.StandardResponse[schemas.LanguageRead]:
        language_model = await languages_crud.create(self.db, language_data)
        return schemas.LanguageRead.model_validate(language_model).to_response()

    @router.get("/")
    async def list_languages(self) -> schemas.StandardListResponse[schemas.LanguageRead]:
        language_models = await languages_crud.get_multi(
            self.db, schema_to_select=schemas.LanguageRead, return_as_model=True,
        )
        return schemas.StandardListResponse(language_models["data"], language_models["total_count"])

