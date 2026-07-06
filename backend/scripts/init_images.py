import asyncio
import json
import math
import re
from pathlib import Path
from collections import Counter
import yaml

import httpx


TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMjJmYTZlYS04MTVmLTQ3NjUtOThhOS0wNDZlZmZkYmMxZDQiLCJhdWQiOlsiZmFzdGFwaS11c2VyczphdXRoIl0sImV4cCI6MTc2NjAzOTY3NX0.E38IEWW9D6rO00uTvIB-ESnrU12EqcZMAKhLBrwjO3o"  # <<< put your real token here

MAP_NAME = "Abyss_Reshanta_A"
BASE_URL = f"http://localhost:9000/api/v1/maps/{MAP_NAME}"
IMAGE_DIRECTORY = f"G:\\NCSoft\\{MAP_NAME}"

BASE_PATH = Path(__file__).parent.parent
YAML_FILENAME = BASE_PATH / f"public/data/markers/{MAP_NAME}.yaml"
MARKERS_URL = f"{BASE_URL}/markers"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
}


# Match: digits [optional spaces] comma/Chinese comma [optional spaces] digits
pattern = re.compile(r'(\d+)\s*[，,]\s*(\d+)')

def extract_coords(line):
    for x, y in pattern.findall(line):
            yield f"{int(x)},{int(y)}"


coord_map = {}
coords = []


for filename in Path(IMAGE_DIRECTORY).glob("*.png"):
    # print(f"{filename.stem}")

    for coord in extract_coords(filename.stem):
        # print(filename, "->", coord)
        coords.append(coord)
        if coord not in coord_map:
            coord_map[coord] = []
        coord_map[coord].append(filename)

print(coord_map)
print(len(coord_map))
print(len(coords))


length_hist = Counter(len(arr) for arr in coord_map.values())
print(length_hist)

with YAML_FILENAME.open("r", encoding="utf-8") as f:
    data = yaml.safe_load(f)

matched_coord_map = {}
for marker in data["markers"]:
    coord = f"{int(marker['x'])},{int(marker['y'])}"
    if coord in coord_map:
        matched_coord_map[coord] = {
            "id": marker["id"],
            "image": coord_map[coord][0],
        }
        marker_id = marker["id"]
        # print(matched_coord_map[coord])


print(len(matched_coord_map))

for coord in coord_map.keys():
    if coord not in matched_coord_map:
        print("error: ", coord, coord_map[coord])

async def upload_images():
    async with httpx.AsyncClient(headers=HEADERS) as client:
        for i, (_coord, coord_data) in enumerate(matched_coord_map.items()):
            try:
                image_file: Path = coord_data["image"]
                files = {
                    "file": (image_file.name, image_file.open("rb"), "image/webp")
                }
                put_url = f"{MARKERS_URL}/{coord_data["id"]}/images"
                # print(put_url)
                put_resp = await client.put(put_url, files=files)
                put_resp_data = put_resp.json()
                print(f"[PUT] {i} {_coord} {coord_data["image"]}: {put_resp.status_code} {put_resp_data}")
            except Exception as e:
                print(coord_data)
                print(e)


if __name__ == "__main__":
    asyncio.run(upload_images())
    pass
# print(data)