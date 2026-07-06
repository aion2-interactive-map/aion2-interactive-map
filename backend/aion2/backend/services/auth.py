from altcha import create_challenge, ChallengeOptions, verify_solution
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query

from fastapi_users import exceptions, models
from fastapi_users.manager import BaseUserManager, UserManagerDependency

from aion2.backend.config.manager import settings
from aion2.backend import schemas
from aion2.backend.interfaces.user import jwt_backend, cookie_backend, fastapi_users
from aion2.backend.utilities.exceptions import BizError, ErrorCode
from aion2.backend.utilities.limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])
user_schema = schemas.UserRead
user_create_schema = schemas.UserCreate
get_user_manager = fastapi_users.get_user_manager

@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    name="register:register",
)
@limiter.limit("5/minute")
async def register(
        request: Request,
        user_create: user_create_schema,  # type: ignore
        altcha_payload: str = Query(..., alias="altcha", description="Altcha Challenge"),
        user_manager: BaseUserManager[models.UP, models.ID] = Depends(get_user_manager),
) -> schemas.StandardResponse[schemas.UserRead]:
    try:
        verified, err = verify_solution(altcha_payload, settings.ALTCHA_HMAC_KEY, True)
        if not verified:
            raise BizError(ErrorCode.AltchaChallengeError, "Altcha Challenge failed!")


        created_user = await user_manager.create(
            user_create, safe=True, request=request
        )
    except exceptions.UserAlreadyExists:
        raise BizError(ErrorCode.UserAlreadyExistsError)
    except exceptions.InvalidPasswordException as e:
        raise BizError(ErrorCode.UserInvalidPasswordError, e.reason)

    return user_schema.model_validate(created_user).to_response()

@router.get("/altcha")
async def get_altcha() -> schemas.StandardResponse[schemas.AltchaChallenge]:
    try:
        challenge = create_challenge(
            ChallengeOptions(
                hmac_key=settings.ALTCHA_HMAC_KEY,
                max_number=50000,
            )
        )
        return schemas.AltchaChallenge(**challenge.to_dict()).to_response()
    except Exception as e:
        raise BizError(ErrorCode.AltchaChallengeError, str(e))


# router.include_router(
#     fastapi_users.get_register_router(UserRead, UserCreate),
# )
router.include_router(
    fastapi_users.get_auth_router(jwt_backend), prefix="/jwt"
)
router.include_router(
    fastapi_users.get_auth_router(cookie_backend), prefix="/cookie"
)
router.include_router(
    fastapi_users.get_reset_password_router(),
)
router.include_router(
    fastapi_users.get_verify_router(user_schema),
)
