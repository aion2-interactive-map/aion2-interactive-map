from datetime import datetime, UTC

import httpx
import redis
import json
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential_jitter
from loguru import logger

from aion2.backend import schemas
from aion2.backend.config.manager import settings
from aion2.backend.app.celery import celery_app


def get_api_base_url(region_id: str):
    if region_id == "kr":
        return "https://aion2.plaync.com/api"
    return "https://tw.ncsoft.com/aion2/api"

def get_search_base_url(region_id: str):
    if region_id == "kr":
        return "https://aion2.plaync.com/ko-kr/api/search/aion2/search/v2/character"
    return "https://tw.ncsoft.com/aion2/api/search/aion2tw/search/v2/character"


@retry(
    retry=retry_if_exception_type(httpx.HTTPError),
    wait=wait_exponential_jitter(initial=1, max=20),
    stop=stop_after_attempt(5),
    reraise=True,
)
def get_character_detail_info(region_id: str, character_id: str, server_id: int) -> schemas.CharacterDetailInfo:
    resp = httpx.get(
        f"{get_api_base_url(region_id)}/character/info",
        params={
            "characterId": character_id,
            "serverId": server_id,
            "lang": "zh"
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    # logger.debug(data)
    profile = schemas.CharacterProfile.model_validate(data["profile"])
    stats = [schemas.CharacterStat.model_validate(x) for x in data["stat"]["statList"]]
    titles = [schemas.CharacterTitle(
        **x,
        stats=[y.get("desc", "") for y in (x.get("statList", []) or [])],
        equip_stats=[y.get("desc", "") for y in (x.get("equipStatList", []) or [])],
    ) for x in data["title"]["titleList"]]
    rankings = [schemas.CharacterRanking.model_validate(x) for x in data["ranking"]["rankingList"]]
    boards = [schemas.CharacterBoard.model_validate(x) for x in data["daevanion"]["boardList"]]
    result = schemas.CharacterDetailInfo(
        profile=profile,
        stats=stats,
        titles=titles,
        rankings=rankings,
        boards=boards
    )
    return result


@retry(
    retry=retry_if_exception_type(httpx.HTTPError),
    wait=wait_exponential_jitter(initial=1, max=20),
    stop=stop_after_attempt(5),
    reraise=True,
)
def get_character_equipments(region_id: str, character_id: str, server_id: int) -> schemas.CharacterEquipments:
    resp = httpx.get(
        f"{get_api_base_url(region_id)}/character/equipment",
        params={
            "characterId": character_id,
            "serverId": server_id,
            "lang": "zh"
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    skills = [schemas.CharacterSkill.model_validate(x) for x in data["skill"]["skillList"]]
    equipments = [schemas.CharacterEquipment.model_validate(x) for x in data["equipment"]["equipmentList"]]
    skins = [schemas.CharacterSkin.model_validate(x) for x in data["equipment"]["skinList"]]
    pet = schemas.CharacterPet.model_validate(data["petwing"]["pet"])
    wing = schemas.CharacterWing.model_validate(data["petwing"]["wing"])
    result = schemas.CharacterEquipments(
        skills=skills,
        equipments=equipments,
        skins=skins,
        pet=pet,
        wing=wing,
    )
    return result


@retry(
    retry=retry_if_exception_type(httpx.HTTPError),
    wait=wait_exponential_jitter(initial=1, max=20),
    stop=stop_after_attempt(5),
    reraise=True,
)
def get_character_item(region_id: str, character_id: str, server_id: int, item_id: int, enchant_level: int,
                       slot_pos: int) -> schemas.CharacterItem:
    resp = httpx.get(
        f"{get_api_base_url(region_id)}/character/equipment/item",
        params={
            "id": item_id,
            "enchantLevel": enchant_level,
            "characterId": character_id,
            "serverId": server_id,
            "slotPos": slot_pos,
            "lang": "zh"
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    main_stats = [schemas.CharacterItemMainStat.model_validate(x) for x in data.get("mainStats", [])]
    sub_stats = [schemas.CharacterItemSubStat.model_validate(x) for x in data.get("subStats", [])]
    sub_skills = [schemas.CharacterItemSubSkill.model_validate(x) for x in data.get("subSkills", [])]
    magic_stone_stat = [schemas.CharacterItemMagicStoneStat.model_validate(x) for x in data.get("magicStoneStat", [])]
    god_stone_stat = [schemas.CharacterItemGodStoneStat.model_validate(x) for x in data.get("godStoneStat", [])]

    return schemas.CharacterItem(
        **data,
        main_stats=main_stats,
        sub_stats=sub_stats,
        sub_skills=sub_skills,
        magic_stone_stat=magic_stone_stat,
        god_stone_stat=god_stone_stat,
    )


@retry(
    retry=retry_if_exception_type(httpx.HTTPError),
    wait=wait_exponential_jitter(initial=1, max=20),
    stop=stop_after_attempt(5),
    reraise=True,
)
def get_character_board(region_id: str, character_id: str, server_id: int, board_id: int) -> schemas.CharacterBoardDetail:
    resp = httpx.get(
        f"{get_api_base_url(region_id)}/character/daevanion/detail",
        params={
            "boardId": board_id,
            "characterId": character_id,
            "serverId": server_id,
            "lang": "zh"
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    open_nodes = []
    for node in data.get("nodeList", []):
        if node["open"] == 1:
            open_nodes.append(node["nodeId"])

    return schemas.CharacterBoardDetail(
        board_id=board_id,
        open_nodes=open_nodes,
    )


def _redis_sync() -> redis.Redis:
    return redis.Redis.from_url(
        f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.PERSISTENT_REDIS_DB_INDEX}",
        password=settings.REDIS_PASSWORD,
        encoding="utf-8",
        decode_responses=True,
    )


def _publish(r: redis.Redis, channel: str, payload: dict) -> None:
    r.publish(channel, json.dumps(payload, ensure_ascii=False))


@celery_app.task(bind=True, queue="high_priority")
def get_character_preview_task(self, *, region_id: str, character_id: str, server_id: int):
    def _update_item(key: str, value: dict) -> None:
        meta.updated_at = datetime.now(UTC).timestamp()
        r.hset(cache_key_meta, mapping=meta.model_dump(exclude_none=True, by_alias=True))
        r.hset(cache_key_items, key=key, value=json.dumps(value, ensure_ascii=False))
        _publish(r, channel, payload={
            "key": key,
            "value": value,
        })

    cache_key_prefix = f"character:{region_id}:{server_id}:{character_id}"
    cache_key_meta = f"{cache_key_prefix}:meta"
    cache_key_items = f"{cache_key_prefix}:items"
    channel = f"{cache_key_prefix}:channel"
    r = _redis_sync()

    # init task
    started_at = datetime.now(UTC).timestamp()
    meta = schemas.CharacterJobMeta(
        job_id=self.request.id,
        status="running",
        started_at=started_at,
        updated_at=started_at,
        done=0,
        total=2,
    )

    try:
        r.hset(cache_key_meta, mapping=meta.model_dump(exclude_none=True, by_alias=True))

        # get info
        info = get_character_detail_info(region_id=region_id, character_id=character_id, server_id=server_id)
        meta.done += 1
        _update_item("info", info.model_dump(exclude_none=True, by_alias=True))

        # get equipments
        equipments = get_character_equipments(region_id=region_id, character_id=character_id, server_id=server_id)
        meta.done += 1
        _update_item("equipments", equipments.model_dump(exclude_none=True, by_alias=True))

        # Trigger detail task
        get_character_detail_task.delay(
            region_id=region_id,
            character_id=character_id,
            server_id=server_id,
            info_dict=info.model_dump(),
            equipments_dict=equipments.model_dump()
        )

    except Exception as e:
        err = f"{type(e).__name__}: {e}"
        logger.exception("get_character_preview_task failed: {}", err)

        meta.status = "failed"
        meta.updated_at = datetime.now(UTC).timestamp()
        r.hset(cache_key_meta, mapping=meta.model_dump(exclude_none=True, by_alias=True))
        _publish(r, channel, payload=meta.model_dump(exclude_none=True, by_alias=True))


@celery_app.task(bind=True, queue="default")
def get_character_detail_task(
    self, *, region_id: str, character_id: str, server_id: int, info_dict: dict, equipments_dict: dict
):
    def _update_item(key: str, value: dict) -> None:
        meta.updated_at = datetime.now(UTC).timestamp()
        r.hset(cache_key_meta, mapping=meta.model_dump(exclude_none=True, by_alias=True))
        r.hset(cache_key_items, key=key, value=json.dumps(value, ensure_ascii=False))
        _publish(r, channel, payload={
            "key": key,
            "value": value,
        })

    info = schemas.CharacterDetailInfo(**info_dict)
    equipments = schemas.CharacterEquipments(**equipments_dict)

    cache_key_prefix = f"character:{region_id}:{server_id}:{character_id}"
    cache_key_meta = f"{cache_key_prefix}:meta"
    cache_key_items = f"{cache_key_prefix}:items"
    channel = f"{cache_key_prefix}:channel"
    r = _redis_sync()

    # resume task meta
    raw_meta = r.hgetall(cache_key_meta)
    if raw_meta:
        meta = schemas.CharacterJobMeta(**raw_meta)
        meta.job_id = self.request.id
        meta.total = 2 + len(equipments.equipments) + len(info.boards)
    else:
        started_at = datetime.now(UTC).timestamp()
        meta = schemas.CharacterJobMeta(
            job_id=self.request.id,
            status="running",
            started_at=started_at,
            updated_at=started_at,
            done=2,
            total=2 + len(equipments.equipments) + len(info.boards),
        )

    try:
        r.hset(cache_key_meta, mapping=meta.model_dump(exclude_none=True, by_alias=True))

        # get equipment
        for equipment in equipments.equipments:
            try:
                item = get_character_item(
                    region_id=region_id, character_id=character_id, server_id=server_id,
                    item_id=equipment.id, enchant_level=equipment.enchant_level + equipment.exceed_level,
                    slot_pos=equipment.slot_pos
                )
                meta.done += 1
                _update_item(f"equipments:{equipment.slot_pos}", item.model_dump(exclude_none=True, by_alias=True))
            except Exception as e:
                logger.error(f"Failed to get equipment {equipment.id}: {e}")
                meta.failed += 1
                _update_item(f"equipments:{equipment.slot_pos}", {})

        # get boards
        for board in info.boards:
            try:
                item = get_character_board(
                    region_id=region_id, character_id=character_id, server_id=server_id, board_id=board.id
                )
                meta.done += 1
                _update_item(f"boards:{board.id}", item.model_dump(exclude_none=True, by_alias=True))
            except Exception as e:
                logger.error(f"Failed to get board {board.id}: {e}")
                meta.failed += 1
                _update_item(f"boards:{board.id}", {})

        finished_at = datetime.now(UTC).timestamp()
        meta.status = "done"
        meta.updated_at = finished_at
        r.set(f"{cache_key_prefix}:cached_at", str(finished_at))
        r.hset(cache_key_meta, mapping=meta.model_dump(exclude_none=True, by_alias=True))
        _publish(r, channel, payload=meta.model_dump(exclude_none=True, by_alias=True))

    except Exception as e:
        err = f"{type(e).__name__}: {e}"
        logger.exception("get_character_detail_task failed: {}", err)

        meta.status = "failed"
        meta.updated_at = datetime.now(UTC).timestamp()
        r.hset(cache_key_meta, mapping=meta.model_dump(exclude_none=True, by_alias=True))
        _publish(r, channel, payload=meta.model_dump(exclude_none=True, by_alias=True))
