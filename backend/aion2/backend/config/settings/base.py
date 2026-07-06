import logging
import pathlib

from pydantic import Field, computed_field, field_validator
from pydantic_settings import BaseSettings

ROOT_DIR: pathlib.Path = pathlib.Path(
    __file__
).parent.parent.parent.parent.parent.resolve()


class BackendServerSettings(BaseSettings):
    API_PREFIX: str = "/api/v1"
    DOCS_URL: str = "/api/v1/docs"
    OPENAPI_URL: str = "/api/v1/openapi.json"
    REDOC_URL: str = "/api/v1/redoc"
    OPENAPI_PREFIX: str = ""

    SERVER_HOST: str = Field(default="0.0.0.0", description="Bind socket to this host.")
    SERVER_PORT: int = Field(
        default=9000,
        description="Bind socket to this port. "
                    "If 0, an available port will be picked",
    )
    SERVER_WORKERS: int = Field(default=1, description="Number of worker processes.")
    FRONTEND_URL: str = Field(
        default=DOCS_URL,
        description="URL to frontend. Usually used for auth redirection.",
    )
    CACHE: bool = Field(default=True, description="Enable caching.")

    PUBLIC_DIR: pathlib.Path = Field(
        default="public", description="The directory to save public files."
    )

    @field_validator('PUBLIC_DIR')
    @classmethod
    def validate_public_dir(cls, v: pathlib.Path):
        return v.absolute()


class AuthCORSSettings(BaseSettings):
    IS_ALLOWED_CREDENTIALS: bool = Field(
        default=True, description="CORS allowed credentials"
    )
    ALLOWED_ORIGINS: list[str] = ["*"]
    ALLOWED_METHODS: list[str] = ["*"]
    ALLOWED_HEADERS: list[str] = ["*"]


class AuthGeneralSettings(BaseSettings):
    API_TOKEN: str = Field(default="YOUR-API-TOKEN", description="API token")
    AUTH_TOKEN: str = Field(
        default="YOUR-AUTHENTICATION-TOKEN", description="Authentication token"
    )
    JWT_SECRET_KEY: str = Field(
        default="YOUR-JWT-SECRET-KEY", description="JWT secret key"
    )
    ALTCHA_HMAC_KEY: str = Field(
        default="YOUR-ALTCHA-HMAC-KEY", description="HMAC key"
    )
    JWT_SUBJECT: str = Field(default="aion2", description="JWT subject")
    JWT_TOKEN_PREFIX: str = Field(default="aion2", description="JWT token prefix")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    JWT_MIN: int = Field(default=0, description="JWT expiration minute")
    JWT_HOUR: int = Field(default=0, description="JWT expiration hour")
    JWT_DAY: int = Field(default=14, description="JWT expiration day")

    @computed_field
    @property
    def JWT_EXPIRE_SECONDS(self) -> int:
        return ((self.JWT_DAY * 24 + self.JWT_HOUR) * 60 + self.JWT_MIN) * 60


class DatabaseSettings(BaseSettings):
    POSTGRES_HOST: str = Field(default="localhost", description="PostgreSQL host")
    POSTGRES_PORT: int = Field(default=5432, description="PostgreSQL port")
    POSTGRES_USERNAME: str = Field(
        default="aion2", description="PostgreSQL username"
    )
    POSTGRES_PASSWORD: str = Field(
        default="pass", description="PostgreSQL password"
    )
    POSTGRES_DATABASE: str = Field(default="aion2", description="PostgreSQL database")


class DatabaseRedisSettings(BaseSettings):
    REDIS_HOST: str = Field(default="localhost", description="Redis host")
    REDIS_PORT: int = Field(default=6379, description="Redis port")
    REDIS_PASSWORD: str = Field(default="aion2", description="Redis password")
    REDIS_DATABASE: int = Field(default=0, description="Redis database index")

    CELERY_BROKER_DB_INDEX: int = Field(default=1, description="Redis database index for Celery broker")
    CELERY_RESULT_DB_INDEX: int = Field(default=2, description="Redis database index for Celery result backend")
    PERSISTENT_REDIS_DB_INDEX: int = Field(default=3, description="Redis database index for persistent storage")


class S3StorageSettings(BaseSettings):
    S3_HOST: str = Field(default="localhost", description="S3 host")
    S3_PORT: int = Field(default=8080, description="S3 port")
    S3_USERNAME: str = Field(default="aion2", description="S3 username")
    S3_PASSWORD: str = Field(default="", description="S3 password")
    S3_BUCKET: str = Field(default="aion2", description="S3 bucket")
    S3_PUBLIC_URL: str = Field(default="https://oss-cn-shenzhen.aliyuncs.com", description="S3 public URL")


class BackendBaseSettings(BackendServerSettings, AuthCORSSettings, AuthGeneralSettings, DatabaseSettings,
                          DatabaseRedisSettings, S3StorageSettings):
    TITLE: str = "AION2 Interactive Map Backend"
    VERSION: str = "0.1.0"
    TIMEZONE: str = "UTC"
    DESCRIPTION: str = ""
    DEBUG: bool = False
    LOGGING_LEVEL: int = logging.INFO
    LOGGERS: tuple[str, str] = ("uvicorn.asgi", "uvicorn.access")

    class Config:
        case_sensitive: bool = True
        env_file: str = f"{str(ROOT_DIR)}/.env"
        validate_assignment: bool = True
        extra: str = "allow"

    @property
    def set_backend_app_attributes(self) -> dict[str, str | bool | dict | None]:
        """
        Set all `FastAPI` class' attributes with the custom values defined in `BackendBaseSettings`.
        """
        return {
            "title": self.TITLE,
            "version": self.VERSION,
            "debug": self.DEBUG,
            "description": self.DESCRIPTION,
            "docs_url": self.DOCS_URL,
            "openapi_url": self.OPENAPI_URL,
            "redoc_url": self.REDOC_URL,
            "openapi_prefix": self.OPENAPI_PREFIX,
            "api_prefix": self.API_PREFIX,
            "swagger_ui_parameters": {"docExpansion": "none"},
        }
