from aion2.backend.config.settings.base import BackendBaseSettings
from aion2.backend.config.settings.environment import Environment


class BackendStageSettings(BackendBaseSettings):
    DESCRIPTION: str | None = "Test Environment."
    DEBUG: bool = True
    ENVIRONMENT: Environment = Environment.STAGING