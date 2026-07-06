from fastapi import APIRouter
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import RedirectResponse

from aion2.backend.config.manager import settings
from aion2.backend.utilities.export import export_data
from aion2.backend.utilities.dependencies import get_db
from aion2.backend.schemas import StandardResponse, Empty

from aion2.backend.services.auth import router as auth_router
from aion2.backend.services.users import router as users_router
from aion2.backend.services.languages import router as languages_router
from aion2.backend.services.maps import router as maps_router
from aion2.backend.services.categories import router as categories_router
from aion2.backend.services.subtypes import router as subtypes_router
from aion2.backend.services.regions import router as regions_router
from aion2.backend.services.markers import router as markers_router
from aion2.backend.services.export import router as export_router
from aion2.backend.services.characters import router as character_router
from aion2.backend.services.seasons import router as seasons_router
from aion2.backend.services.servers import router as servers_router
from aion2.backend.services.server_matchings import router as server_matchings_router
from aion2.backend.services.abyss_artifacts import router as abyss_artifacts_states_router, \
    artifacts_router as abyss_artifacts_router, admin_router as abyss_artifact_admins_router

router = APIRouter()


@router.get("/", include_in_schema=False)
def redirect_docs():
    return RedirectResponse(url=settings.DOCS_URL)

@router.get("/export", include_in_schema=True)
async def export(db: AsyncSession = Depends(get_db)) -> StandardResponse[Empty]:
    await export_data(db)
    return StandardResponse()

router.include_router(auth_router)
router.include_router(users_router)
router.include_router(languages_router)
router.include_router(maps_router)
router.include_router(categories_router)
router.include_router(subtypes_router)
router.include_router(regions_router)
router.include_router(markers_router)
router.include_router(export_router)
router.include_router(character_router)
router.include_router(seasons_router)
router.include_router(servers_router)
router.include_router(server_matchings_router)
router.include_router(abyss_artifact_admins_router)
router.include_router(abyss_artifacts_states_router)
router.include_router(abyss_artifacts_router)
