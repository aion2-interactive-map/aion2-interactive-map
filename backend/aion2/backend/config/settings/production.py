import decouple

from aion2.backend.config.settings.base import BackendBaseSettings
from aion2.backend.config.settings.environment import Environment


class BackendProdSettings(BackendBaseSettings):
    DESCRIPTION: str | None = "Production Environment."
    ENVIRONMENT: Environment = Environment.PRODUCTION

    SERVER_WORKERS: int = decouple.config("SERVER_WORKERS", cast=int, default=4)
