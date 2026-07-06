import asyncio
import json
import re
from typing import Any
from uuid import UUID, uuid4
from urllib.parse import unquote
import redis.asyncio as aioredis

import httpx
from fastapi_utils.cbv import cbv
from fastcrud import FastCRUD
from fastapi import APIRouter, Depends, Body, UploadFile, File, Form, Query, Path, WebSocket
from fastapi.websockets import WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
from datetime import datetime, UTC, timedelta

from aion2.backend import models, schemas
from aion2.backend.config.manager import settings
from aion2.backend.interfaces.cache import clear_cache, use_cache
from aion2.backend.schemas import CharacterInfo
from aion2.backend.utilities.dependencies import get_db, get_current_user, get_current_superuser, get_region_from_path, \
    get_language_from_path, get_map_from_path, get_httpx_client, get_redis_client
from aion2.backend.utilities.exceptions import BizError, ErrorCode
from aion2.backend.tasks.character import get_character_preview_task, get_api_base_url, \
    get_search_base_url

router = APIRouter(prefix="/characters", tags=["characters"])


@cbv(router)
class Character:
    # user: models.User = Depends(get_current_user)
    # map_model: models.Map = Depends(get_map_from_path)
    httpx_client: httpx.AsyncClient = Depends(get_httpx_client)
    db: AsyncSession = Depends(get_db)

    @staticmethod
    def validate_character(character: dict[str, Any]):
        character["id"] = unquote(character["characterId"])
        character["name"] = re.sub(r'<.*?>', '', character["name"])
        return CharacterInfo.model_validate(character)

    @router.get("/search")
    async def search_characters(
        self,
        keyword: str = Query(...),
        race: int = Query(...),
        server: int | None = Query(None),
        region: str = Query("tw"),
    ) -> schemas.StandardListResponse[schemas.CharacterInfo]:
        resp = await self.httpx_client.get(
            f"{get_search_base_url(region)}",
            params={
                "keyword": keyword,
                "race": race,
                "serverId": server or "",
                "page": 1,
                "size": 30,
            },
        )
        data = resp.json()
        characters = [self.validate_character(x) for x in data["list"]]
        return schemas.StandardListResponse(characters)

    # @router.get("/info")
    # async def get_character_info(
    #         self,
    #         region: str = Query("tw"),
    #         character: str = Query(...),
    #         server: int = Query(...),
    # ) -> schemas.StandardResponse[schemas.CharacterDetail]:
    #     async def wrapper():
    #         return await asyncio.to_thread(get_character_task_temp, region, character, server)
    #
    #     key = f"character:{server}:{character}"
    #     detail = await use_cache(key, wrapper)
    #
    #     # Refresh data
    #     current_datetime = datetime.now(UTC)
    #     time_diff = current_datetime - detail.updated_at
    #     if time_diff > timedelta(minutes=10):
    #         await clear_cache(key)
    #         detail = await use_cache(key, wrapper)
    #
    #     # detail = await wrapper()
    #     return detail.to_response()

    @router.get("/info")
    async def get_character_info(
            self,
            region: str = Query("tw"),
            character: str = Query(...),
            server: int = Query(...),
            refresh: bool = Query(False),
            redis: aioredis.Redis = Depends(get_redis_client)
    ) -> schemas.StandardResponse[schemas.CharacterJob]:
        # Use region, server, and character for job identifier
        cache_key_prefix = f"character:{region}:{server}:{character}"
        cache_key_meta = f"{cache_key_prefix}:meta"
        cache_key_items = f"{cache_key_prefix}:items"

        # Get the current time using datetime
        current_time = datetime.now(UTC)

        # Retrieve server start time from Redis
        server_start_time = await redis.get("server_start_time")
        if server_start_time:
            server_start_time = float(server_start_time)
        else:
            server_start_time = 0.0

        # Retrieve cached metadata and items in all cases

        meta = await redis.hgetall(cache_key_meta)
        try:
            meta = schemas.CharacterJobMeta.model_validate(meta)
        except:
            meta = None

        items_raw: dict[str, str] = await redis.hgetall(cache_key_items)
        items: dict[str, dict] = {}
        for k, v in items_raw.items():
            try:
                items[k] = json.loads(v)
            except json.JSONDecodeError:
                pass

        # Check if cached data exists and if it's still valid (within 15 minutes)
        try:
            if not refresh and meta is not None and meta.status == "done":
                cached_at = datetime.fromtimestamp(meta.updated_at, UTC)
                # If cached data is still valid (within 15 minutes)
                if current_time - cached_at < timedelta(minutes=15):  # 15 minutes TTL
                    # Return cached results directly if data is valid
                    return schemas.CharacterJob(
                        job_id=None,
                        status="cached",
                        meta=meta,
                        items=items,
                    ).to_response()
        except:
            pass

        # If no job is running, create a new job
        is_stale = False
        if meta and meta.status in ("running", "scheduled"):
            job_updated_at = meta.updated_at
            if job_updated_at < server_start_time:
                is_stale = True
                logger.info("Job {} is stale (started at {}, server started at {})", meta.job_id, job_updated_at, server_start_time)

        if refresh or meta is None or (meta.status != "running" and meta.status != "scheduled") or is_stale:
            celery_job = get_character_preview_task.apply_async(kwargs={
                "region_id": region,
                "character_id": character,
                "server_id": server,
            })
            current_job_id = str(celery_job.id)
            meta = schemas.CharacterJobMeta(
                job_id=current_job_id,
                status="scheduled",
                updated_at=current_time.timestamp(),
            )
            logger.info("start celery job: {}", meta)
            await redis.hset(cache_key_meta, mapping=meta.model_dump(exclude_none=True))
        else:
            current_job_id = meta.job_id

        # Return the cached results (which can be empty) and the job ID
        return schemas.CharacterJob(
            job_id=current_job_id,
            status=meta.status,
            meta=meta,
            items=items,
        ).to_response()


@router.websocket("/ws")
async def get_character_info_websocket(
        websocket: WebSocket,
        region: str = Query("tw"),
        character: str = Query(...),
        server: int = Query(...),
):
    await websocket.accept()

    redis = getattr(websocket.app.state, "redis_client", None)
    if redis is None:
        await websocket.close(code=1011)
        return

    cache_key_prefix = f"character:{region}:{server}:{character}"
    cache_key_meta = f"{cache_key_prefix}:meta"
    channel = f"{cache_key_prefix}:channel"
    pubsub = redis.pubsub()

    try:
        # Subscribe first to minimize the “update between snapshot and subscribe” race.
        await pubsub.subscribe(channel)

        # 1) On connect: Send the current job meta
        meta = await redis.hgetall(cache_key_meta)
        status = meta.get("status", "")
        if status != "scheduled" and status != "running":
            return

        # Send the initial snapshot to the client
        await websocket.send_json(meta)

        # 2) Listen for updates on the Pub/Sub channel
        async for message in pubsub.listen():
            if message.get("type") == "message":
                # Forward the update to the client
                job_update = message.get("data")
                # Parse the job update string as JSON
                try:
                    job_update_dict = json.loads(job_update)
                except json.JSONDecodeError:
                    # If the data is not valid JSON, log the error
                    logger.error(f"Error decoding job update: {job_update}")
                    job_update_dict = await redis.hgetall(cache_key_meta)
                # Send the update to the WebSocket client
                await websocket.send_text(job_update)
                # If the job is done, send the final response and close the connection
                if job_update_dict.get("status") in ("done", "failed"):
                    break

        await websocket.close()
        logger.info(f"websocket closed: {websocket}")

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    finally:
        try:
            await pubsub.unsubscribe(channel)
        finally:
            await pubsub.close()


