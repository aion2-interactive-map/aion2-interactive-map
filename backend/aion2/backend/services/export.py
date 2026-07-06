import yaml
from fastapi import APIRouter, Depends, Path, Response
from fastapi.responses import StreamingResponse
from fastapi_utils.cbv import cbv
from sqlalchemy.ext.asyncio import AsyncSession

from aion2.backend import models
from aion2.backend.interfaces.cache import use_cache
from aion2.backend.utilities.dependencies import get_current_superuser, get_db
from aion2.backend.utilities.export import export_data, export_maps, export_map_translations, export_types, export_type_translations, \
    export_markers, export_marker_translations, export_regions, export_region_translations, export_languages

router = APIRouter(prefix="/export", tags=["export"])

@cbv(router)
class Export:
    # user: models.User = Depends(get_current_superuser)
    db: AsyncSession = Depends(get_db)

    @staticmethod
    async def export_cached_yaml(key, func) -> Response:
        async def wrapper():
            return yaml.dump(await func)

        data = await use_cache(key, wrapper)
        return Response(
            content=data,
            media_type="text/yaml",
        )

    @router.get("/export")
    async def export_all_data(self):
        return await export_data(self.db)

    @router.get("/data/maps.yaml")
    async def export_data_maps(self) -> Response:
        return await self.export_cached_yaml(
            "data:maps",
            export_maps(self.db)
        )


    @router.get("/locales/{language}/maps.yaml")
    async def export_locale_maps(self, language: str = Path(...)) -> Response:
        return await self.export_cached_yaml(
            f"locales:{language}:maps",
            export_map_translations(self.db, language)
        )


    @router.get("/data/types.yaml")
    async def export_data_types(self) -> Response:
        return await self.export_cached_yaml(
            "data:types",
            export_types(self.db)
        )


    @router.get("/locales/{language}/types.yaml")
    async def export_locale_types(self, language: str = Path(...)) -> Response:
        return await self.export_cached_yaml(
            f"locales:{language}:types",
            export_type_translations(self.db, language)
        )


    @router.get("/data/regions/{map_name}.yaml")
    async def export_data_regions(self, map_name: str = Path(...)) -> Response:
        return await self.export_cached_yaml(
            f"data:regions:{map_name}",
            export_regions(self.db, map_name)
        )

    @router.get("/locales/{language}/regions/{map_name}.yaml")
    async def export_locales_regions(self, language: str = Path(...), map_name: str = Path(...)) -> Response:
        return await self.export_cached_yaml(
            f"locales:{language}:regions:{map_name}",
            export_region_translations(self.db, language, map_name)
        )


    @router.get("/data/markers/{map_name}.yaml")
    async def export_data_markers(self, map_name: str = Path(...)) -> Response:
        return await self.export_cached_yaml(
            f"data:markers:{map_name}",
            export_markers(self.db, map_name)
        )


    @router.get("/locales/{language}/markers/{map_name}.yaml")
    async def export_locales_markers(self, language: str = Path(...), map_name: str = Path(...)) -> Response:
        return await self.export_cached_yaml(
            f"locales:{language}:markers:{map_name}",
            export_marker_translations(self.db, language, map_name)
        )

