import asyncio
import json

import httpx

ITEM_BASE_URL = "https://tw.ncsoft.com/aion2_tw/v2.0/dict/search/item"
EXTRA_ITEM_BASE_URL = "https://tw.ncsoft.com/aion2/api/gameconst/item"
CATEGORY_BASE_URL = "https://tw.ncsoft.com/aion2_tw/v2.0/game/item/category"
GRADE_BASE_URL = "https://tw.ncsoft.com/aion2_tw/v2.0/game/item/grade"
CLASS_BASE_URL = "https://tw.ncsoft.com/aion2_tw/v2.0/game/character/class"
SERVER_BASE_URL = "https://tw.ncsoft.com/aion2/api/gameinfo/servers"

languages = ["zh-TW", "en-US"]
extra_item_ids = [310900001, 310900002]

async def download_items():

    async with httpx.AsyncClient() as client:
        for language in languages:
            page_size = 1000
            page = 1
            max_page = 1
            results = []

            while page <= max_page:
                params = {
                    "page": page,
                    "locale": language,
                    "size": page_size,
                }
                response = await client.get(ITEM_BASE_URL, params=params)
                data = response.json()
                results = results + data["contents"]
                print(data["pagination"])
                max_page = data["pagination"]["lastPage"]
                page += 1

            for item_id in extra_item_ids:
                params = {
                    "id": item_id,
                    "enchantLevel": 0,
                    "lang": language.split("-")[0],
                }
                response = await client.get(EXTRA_ITEM_BASE_URL, params=params)
                data = response.json()
                results.append({
                    "id": data["id"],
                    "name": data["name"],
                    "image": data["icon"],
                    "grade": data["grade"],
                    "options": list(map(lambda x: f"{x['name']} {x['value']}" ,data["mainStats"])),
                    "favorite": False,
                    "tradable": False,
                    "categoryName": data["categoryName"],
                    "description": "",
                })
                # results = results + data["contents"]
                # print(data)


            json.dump(results, open(f"items.{language}.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)


async def download_categories():
    async with httpx.AsyncClient() as client:
        for language in languages:
            # response = await client.get(CATEGORY_BASE_URL, params={"locale": language})
            # json.dump(response.json(), open(f"categories.{language}.json", "w", encoding="utf-8"), indent=2,
            #           ensure_ascii=False)
            # response = await client.get(CLASS_BASE_URL, params={"locale": language})
            # json.dump(response.json(), open(f"classes.{language}.json", "w", encoding="utf-8"), indent=2,
            #           ensure_ascii=False)
            # response = await client.get(GRADE_BASE_URL, params={"locale": language})
            # json.dump(response.json(), open(f"grades.{language}.json", "w", encoding="utf-8"), indent=2,
            #           ensure_ascii=False)
            response = await client.get(SERVER_BASE_URL, params={"locale": language})
            json.dump(response.json(), open(f"servers.{language}.json", "w", encoding="utf-8"), indent=2,
                      ensure_ascii=False)


if __name__ == '__main__':
    asyncio.run(download_items())