import typing

import fastapi
import httpx
import loguru

from datetime import datetime, UTC

from aion2.backend.config.manager import settings
from aion2.backend.interfaces.cache import clear_all_cache
from aion2.backend.interfaces.db import init_db
from aion2.backend.interfaces.redis import init_redis, close_redis
from aion2.backend.app.celery import celery_app, discover_tasks


def execute_backend_server_event_handler(backend_app: fastapi.FastAPI) -> typing.Any:
    async def launch_backend_server_events() -> None:
        loguru.logger.info("------ {} Initializing ------", settings.TITLE)
        
        # Discover Celery tasks
        discover_tasks()

        # HTTPX client startup
        backend_app.state.httpx_client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
        )
        # Initialize Redis client on startup
        await init_redis(backend_app)
        
        # Record server start time in Redis
        redis_client = getattr(backend_app.state, "redis_client", None)
        if redis_client:
            await redis_client.set("server_start_time", datetime.now(UTC).timestamp())

        await init_db()
        await clear_all_cache()

        # Purge Celery tasks on startup
        try:
            purged_count = celery_app.control.purge()
            loguru.logger.info("Purged {} Celery tasks on startup", purged_count)
        except Exception as e:
            loguru.logger.error("Failed to purge Celery tasks: {}", e)

        loguru.logger.info("------ {} Launched ------", settings.TITLE)

    return launch_backend_server_events


def terminate_backend_server_event_handler(backend_app: fastapi.FastAPI) -> typing.Any:
    @loguru.logger.catch
    async def stop_backend_server_events() -> None:
        loguru.logger.info("------ {} Shut down ------", settings.TITLE)
        # HTTPX client shutdown (close before process exit)
        client: httpx.AsyncClient | None = getattr(backend_app.state, "httpx_client", None)
        if client is not None:
            await client.aclose()
        # Close Redis client on shutdown
        await close_redis(backend_app)

    return stop_backend_server_events