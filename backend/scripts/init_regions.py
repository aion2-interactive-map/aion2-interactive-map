import json
import asyncio
import httpx

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMjJmYTZlYS04MTVmLTQ3NjUtOThhOS0wNDZlZmZkYmMxZDQiLCJhdWQiOlsiZmFzdGFwaS11c2VyczphdXRoIl0sImV4cCI6MTc2NDg1OTIxMH0.ZlC6b71uyPh3gWsFKS_bJWec55EjcGNE47EA9URApfY"  # <<< put your real token here

# BASE_URL = "http://localhost:9000/api/v1/maps/World_D_A"
# FILENAME = "region_dark.json"


BASE_URL = "http://localhost:9000/api/v1/maps/World_L_A"
FILENAME = "region_light.json"

# BASE_URL = "http://www.tc-imba.com/api/v1/maps/World_L_A"
REGIONS_URL = f"{BASE_URL}/regions"
MARKERS_URL = f"{BASE_URL}/markers"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


async def upload_regions():
    # Load regions from JSON file
    with open(FILENAME, "r", encoding="utf-8") as f:
        regions = json.load(f)

    async with httpx.AsyncClient(headers=HEADERS) as client:
        for region in regions:

            # ---- 1) POST create region ----
            post_payload = {"name": region["name"]}
            post_url = REGIONS_URL + "/"

            post_resp = await client.post(post_url, json=post_payload)
            print(f"[POST] {region["name"]}: {post_resp.status_code}")

            # ---- 2) PATCH add all translations ----
            for language in ("en", "zh-CN", "zh-TW"):
                patch_payload = {
                    "name": region[language],
                    "description": region[language]
                }

                patch_url = f"{REGIONS_URL}/{region["name"]}/translations/{language}"
                patch_resp = await client.patch(patch_url, json=patch_payload)
                print(f"[PATCH] {region["name"]} {language}: {patch_resp.status_code}")


async def upload_region_markers():
    # Load regions from JSON file
    with open(FILENAME, "r", encoding="utf-8") as f:
        regions = json.load(f)

    async with httpx.AsyncClient(headers=HEADERS) as client:
        for region in regions:
            if region["type"] == 1:
                subtype = "village"
            else:
                subtype = "battlefield"

            # ---- 1) POST create region ----
            post_payload = {
                "subtypeId": subtype,
                "regionId": region["name"],
                "name": region["name"],
                "x": region["x"],
                "y": region["y"],

            }
            post_url = MARKERS_URL + "/"
            post_resp = await client.post(post_url, json=post_payload)
            print(f"[POST] {region["name"]}: {post_resp.status_code}")
            data = post_resp.json()
            try:
                marker_id = data["data"]["id"]
            except:
                marker_id = None

            if marker_id is None:
                print("[ERROR] marker_id is None")
                continue

            # ---- 2) PATCH add all translations ----
            for language in ("en", "zh-CN", "zh-TW"):
                patch_payload = {
                    "name": region[language],
                    "description": region[language]
                }

                patch_url = f"{MARKERS_URL}/{marker_id}/translations/{language}"
                patch_resp = await client.patch(patch_url, json=patch_payload)
                print(f"[PATCH] {region["name"]} {language}: {patch_resp.status_code}")


if __name__ == "__main__":
    asyncio.run(upload_regions())
