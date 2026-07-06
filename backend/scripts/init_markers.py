import asyncio
import json
import math

import httpx

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMjJmYTZlYS04MTVmLTQ3NjUtOThhOS0wNDZlZmZkYmMxZDQiLCJhdWQiOlsiZmFzdGFwaS11c2VyczphdXRoIl0sImV4cCI6MTc2NDg1OTIxMH0.ZlC6b71uyPh3gWsFKS_bJWec55EjcGNE47EA9URApfY"  # <<< put your real token here

BASE_URL = "http://localhost:9000/api/v1/maps/Abyss_Reshanta_A"
FILENAME = "abyss_a.json"
MARKERS_URL = f"{BASE_URL}/markers"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


async def update_markers():
    data = json.load(open(FILENAME))
    print(data)
    async with httpx.AsyncClient(headers=HEADERS) as client:
        for x, y, name in data:
            post_payload = {
                "subtypeId": "monolithMaterial",
                "name": str(name),
                "x": round(x),
                "y": round(y),
            }
            post_url = MARKERS_URL + "/"
            post_resp = await client.post(post_url, json=post_payload)
            print(f"[POST] {post_payload}: {post_resp.status_code}")


if __name__ == "__main__":
    asyncio.run(update_markers())


