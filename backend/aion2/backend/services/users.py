from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from loguru import logger

from aion2.backend import schemas, models
from aion2.backend.interfaces.db import get_db
from aion2.backend.interfaces.user import fastapi_users
from aion2.backend.utilities.dependencies import get_current_superuser
from aion2.backend.utilities.exceptions import BizError, ErrorCode

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/search")
async def search_users(
    name: str = Query(None),
    email: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: models.User = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
) -> schemas.StandardListResponse[schemas.UserRead]:
    query = select(models.User)
    filters = []
    if name:
        filters.append(models.User.name.ilike(f"%{name}%"))
    if email:
        filters.append(models.User.email.ilike(f"%{email}%"))
    
    if filters:
        query = query.where(or_(*filters))
    
    # Count total matching users
    count_query = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_query)).scalar() or 0

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    users = result.scalars().all()
    return schemas.StandardListResponse([schemas.UserRead.model_validate(u) for u in users], total_count)

@router.get("/become_superuser")
async def become_superuser(
    user: models.User = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
) -> schemas.StandardResponse[schemas.UserRead]:
    logger.info(user)
    result = await db.execute(select(models.User).where(models.User.is_superuser.is_(True)).limit(1))
    superuser = result.unique().scalar_one_or_none()
    if superuser is not None:
        raise BizError(ErrorCode.UnauthorizedError)
    user_model = await db.get(models.User, user.id)
    user_model.is_superuser = True
    db.add(user_model)
    await db.commit()
    await db.refresh(user_model)
    return schemas.StandardResponse(schemas.UserRead.model_validate(user_model))

router.include_router(
    fastapi_users.get_users_router(schemas.UserRead, schemas.UserUpdate),
)
