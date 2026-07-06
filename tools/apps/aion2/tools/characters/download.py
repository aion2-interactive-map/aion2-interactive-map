import asyncio
import json
from pathlib import Path

import httpx

# --------------------------------
# Job list (index matters)
# --------------------------------
CLASSES = [
    "Gladiator", "Templar", "Ranger", "Assassin",
    "Elementalist", "Sorcerer", "Cleric", "Chanter",
]

LANG = "en"
OUTPUT_DIR = Path("")

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


def validate_requests() -> None:
    allowed = set(CLASSES)
    for r in REQUESTS:
        job = r.get("job")
        if job not in allowed:
            raise RuntimeError(f"Unknown job in REQUESTS: {job}. Must be one of: {', '.join(CLASSES)}")


async def fetch_equipment_one(
    client: httpx.AsyncClient,
    server: str,
    character: str,
    job: str,
) -> None:
    url = "https://tw.ncsoft.com/aion2/api/character/equipment"
    params = {
        "lang": LANG,
        "characterId": character,
        "serverId": server,
    }

    resp = await client.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / f"{job}.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved: {path}")


async def main() -> None:
    validate_requests()

    headers = {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (httpx)",
        "Referer": "https://tw.ncsoft.com/",
    }

    async with httpx.AsyncClient(headers=headers, timeout=30.0) as client:
        tasks = [
            fetch_equipment_one(
                client,
                req["server"],
                req["character"],
                req["job"],
            )
            for req in REQUESTS
        ]
        await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
