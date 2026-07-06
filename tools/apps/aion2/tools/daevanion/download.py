import asyncio
import json
from pathlib import Path

import httpx

# --------------------------------
# Job list (index matters)
# --------------------------------
CLASSES = [
    "Gladiator", "Templar", "Ranger", "Assassin",
    "Elementalist", "Sorcerer",  "Cleric", "Chanter",
]

LANG = "en"
OUTPUT_DIR = Path("downloads")

# --------------------------------
# INPUT ARRAY
# --------------------------------
REQUESTS = [
    {
        "server": "1002",
        "character": "iW_qVWDnklDXWB-fcU-jHz5mPGYXQwt2YZp9wst2GXQ=",
        "job": "Sorcerer",
    },
    {
        "server": "1002",
        "character": "iW_qVWDnklDXWB-fcU-jH-JRDD9AqwUVv7XueD_au-4=",
        "job": "Assassin",
    },
    {
        "server": "1002",
        "character": "iW_qVWDnklDXWB-fcU-jH65IYFb3uIgi87z0XgoWaUY=",
        "job": "Elementalist",
    },
    {
        "server": "1002",
        "character": "iW_qVWDnklDXWB-fcU-jH2-fAEklZQJi7hVZD4Xqv1Q=",
        "job": "Cleric",
    },
    {
        "server": "1002",
        "character": "iW_qVWDnklDXWB-fcU-jH6lx0ZJYAwwLRHsNsFVvZnc=",
        "job": "Chanter",
    },
    {
        "server": "1002",
        "character": "iW_qVWDnklDXWB-fcU-jH_BD_NZNgXXT3iktTQ6NA78=",
        "job": "Gladiator",
    },
    {
        "server": "1001",
        "character": "A1pIWbd0UKoTYJ2XbL_CwxEM3pGFxBdlxaQT7jEa5V4=",
        "job": "Ranger",
    },
    {
        "server": "1012",
        "character": "MZVZomoYnH1ds8JF2K_PcqoNLmDkIBxMsIDRoGdvQf0=",
        "job": "Templar",
    },
]


# --------------------------------
# Mapping: each job has 6 boards
# 1st job -> 11-16
# 6th job -> 61-66
# => start = 11 + index * 10
# --------------------------------
def board_ids_for_job(job: str) -> list[int]:
    try:
        idx = CLASSES.index(job)  # 0-based
    except ValueError as e:
        raise RuntimeError(f"Unknown job: {job}. Must be one of: {', '.join(CLASSES)}") from e

    start = 11 + idx * 10
    return list(range(start, start + 7))


async def fetch_one_board(
        client: httpx.AsyncClient,
        server: str,
        character: str,
        job: str,
        board_id: int,
) -> None:
    url = "https://tw.ncsoft.com/aion2/api/character/daevanion/detail"
    params = {
        "lang": LANG,
        "characterId": character,
        "serverId": server,
        "boardId": str(board_id),
    }

    resp = await client.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    # Save as: downloads/<job>/<boardId>.json
    out_dir = OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    path = out_dir / f"{board_id}.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved: {path}")


async def fetch_one_request(client: httpx.AsyncClient, req: dict) -> None:
    server = req["server"]
    character = req["character"]
    job = req["job"]

    board_ids = board_ids_for_job(job)
    tasks = [
        fetch_one_board(client, server, character, job, board_id)
        for board_id in board_ids
    ]
    await asyncio.gather(*tasks)


async def main() -> None:
    headers = {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (httpx)",
        "Referer": "https://tw.ncsoft.com/",
    }

    async with httpx.AsyncClient(headers=headers, timeout=30.0) as client:
        await asyncio.gather(*(fetch_one_request(client, r) for r in REQUESTS))


if __name__ == "__main__":
    asyncio.run(main())
