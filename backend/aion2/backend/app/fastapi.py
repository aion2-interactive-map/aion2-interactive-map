import fastapi
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from slowapi import Limiter
from slowapi.util import get_remote_address

from aion2.backend.config.errors import register_error_handlers
from aion2.backend.config.events import (
    execute_backend_server_event_handler,
    terminate_backend_server_event_handler,
)
from aion2.backend.config.manager import settings
from aion2.backend.utilities.logging import init_logging, intercept_all_loggers
from aion2.backend.utilities.limiter import limiter

def initialize_backend_application() -> fastapi.FastAPI:
    init_logging()
    intercept_all_loggers()
    app = fastapi.FastAPI(**settings.set_backend_app_attributes)

    app.logger = logger
    app.state.limiter = limiter

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=settings.IS_ALLOWED_CREDENTIALS,
        allow_methods=settings.ALLOWED_METHODS,
        allow_headers=settings.ALLOWED_HEADERS,
    )

    app.add_event_handler(
        "startup",
        execute_backend_server_event_handler(backend_app=app),
    )
    app.add_event_handler(
        "shutdown",
        terminate_backend_server_event_handler(backend_app=app),
    )

    register_error_handlers(app)

    from aion2.backend.services import router as api_endpoint_router

    app.include_router(router=api_endpoint_router, prefix=settings.API_PREFIX)

    return app


backend_app = initialize_backend_application()
