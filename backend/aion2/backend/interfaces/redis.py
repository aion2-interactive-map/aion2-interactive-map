import redis.asyncio as aioredis
import fastapi
from fastapi import Depends, Request
from aion2.backend.config.manager import settings
from loguru import logger

# Initialize the Redis client in the startup event
async def init_redis(backend_app: fastapi.FastAPI) -> None:
    """Initialize Redis client and store it in the app state."""
    backend_app.state.redis_client = aioredis.from_url(
        f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.PERSISTENT_REDIS_DB_INDEX}",
        password=settings.REDIS_PASSWORD,
        encoding="utf-8",
        decode_responses=True,
    )
    logger.info(f"Connected to Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.PERSISTENT_REDIS_DB_INDEX}")

# Shutdown handler to close Redis connection gracefully
async def close_redis(backend_app: fastapi.FastAPI) -> None:
    """Close Redis client gracefully."""
    redis_client = getattr(backend_app.state, "redis_client", None)
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed.")

# FastAPI Dependency to get the Redis client from the app state
def get_redis_client(request: Request) -> aioredis.Redis:
    """Get the Redis client from app state."""
    redis_client = getattr(request.app.state, "redis_client", None)
    if redis_client is None:
        raise ValueError("Redis client not initialized.")
    return redis_client
