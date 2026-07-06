from typing import TypeVar, Type
from uuid import UUID

from fastapi import Path, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from aion2.backend.interfaces.db import get_db, Base
from aion2.backend.interfaces.user import get_current_user, get_current_superuser
from aion2.backend.interfaces.s3 import s3_client_upload_dependency
from aion2.backend.interfaces.httpx import get_httpx_client
from aion2.backend.interfaces.redis import get_redis_client
from aion2.backend.utilities.exceptions import BizError, ErrorCode
from aion2.backend import models, schemas

BT = TypeVar("BT", bound=Base)


async def get_model(
        model_id: str | UUID,
        db: AsyncSession,
        model_type: Type[BT],
        model_field: str,
        model_error_code: ErrorCode,
) -> BT:
    try:
        uuid = UUID(model_id)
        model = await db.get(model_type, uuid)
    except ValueError:
        result = await db.execute(select(model_type).filter_by(**{model_field: model_id}))
        model = result.unique().scalar_one_or_none()
    if model is None:
        raise BizError(model_error_code)
    return model


async def get_language_from_path(
        language_id: str = Path(..., alias="language"),
        db: AsyncSession = Depends(get_db)
) -> models.Language:
    return await get_model(
        language_id, db, models.Language,
        "language_code", ErrorCode.LanguageNotFoundError
    )


async def get_map_from_path(
        map_id: str = Path(..., alias="map"),
        db: AsyncSession = Depends(get_db)
) -> models.Map:
    return await get_model(
        map_id, db, models.Map,
        "name", ErrorCode.MapNotFoundError
    )


async def get_category_from_path(
        category_id: str = Path(..., alias="category"),
        db: AsyncSession = Depends(get_db)
) -> models.Category:
    return await get_model(
        category_id, db, models.Category,
        "name", ErrorCode.CategoryNotFoundError
    )


async def get_subtype_from_path(
        subtype_id: str = Path(..., alias="subtype"),
        db: AsyncSession = Depends(get_db)
) -> models.Subtype:
    return await get_model(
        subtype_id, db, models.Subtype,
        "name", ErrorCode.SubTypeNotFoundError
    )


async def get_region_from_path(
        region_id: str = Path(..., alias="region"),
        db: AsyncSession = Depends(get_db)
) -> models.Region:
    return await get_model(
        region_id, db, models.Region,
        "name", ErrorCode.RegionNotFoundError
    )


async def get_season_from_path(
        season_id: UUID = Path(..., alias="season"),
        db: AsyncSession = Depends(get_db)
) -> models.Season:
    return await get_model(
        str(season_id), db, models.Season,
        "id", ErrorCode.SeasonNotFoundError
    )


async def get_server_from_path(
        server_id: UUID = Path(..., alias="server"),
        db: AsyncSession = Depends(get_db)
) -> models.Server:
    return await get_model(
        str(server_id), db, models.Server,
        "id", ErrorCode.ServerNotFoundError
    )


async def get_server_matching_from_path(
        server_matching_id: UUID = Path(..., alias="server_matching"),
        db: AsyncSession = Depends(get_db)
) -> models.ServerMatching:
    return await get_model(
        str(server_matching_id), db, models.ServerMatching,
        "id", ErrorCode.ServerMatchingNotFoundError
    )


async def get_abyss_artifact_from_path(
        abyss_artifact_id: UUID = Path(..., alias="abyss_artifact"),
        db: AsyncSession = Depends(get_db)
) -> models.AbyssArtifact:
    return await get_model(
        str(abyss_artifact_id), db, models.AbyssArtifact,
        "id", ErrorCode.AbyssArtifactNotFoundError
    )


async def get_abyss_artifact_state_from_path(
        state_id: UUID = Path(..., alias="state"),
        db: AsyncSession = Depends(get_db)
) -> models.AbyssArtifactState:
    from sqlalchemy.orm import joinedload
    result = await db.execute(
        select(models.AbyssArtifactState)
        .options(
            joinedload(models.AbyssArtifactState.server_matching),
            joinedload(models.AbyssArtifactState.contributors).joinedload(models.AbyssArtifactContributor.user)
        )
        .where(models.AbyssArtifactState.id == state_id)
    )
    model = result.unique().scalar_one_or_none()
    if model is None:
        raise BizError(ErrorCode.AbyssArtifactStateNotFoundError)
    return model


async def get_marker_from_path(
        marker_id: UUID = Path(..., alias="marker"),
        db: AsyncSession = Depends(get_db)
) -> models.Marker:
    return await get_model(
        str(marker_id), db, models.Marker,
        "id", ErrorCode.MarkerNotFoundError
    )
