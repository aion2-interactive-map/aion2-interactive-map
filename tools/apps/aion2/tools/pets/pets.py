import asyncio
from pathlib import Path
from typing import NamedTuple
import json
import re
from io import BytesIO
from opencc import OpenCC

from aion2.tools.common.auth import get_headers
from aion2_interactive_map_backend_client import Client
from aion2_interactive_map_backend_client.api.markers import markers_create_marker_api_v_1_maps_map_markers_post, \
    marker_images_upload_marker_image_api_v_1_maps_map_markers_marker_images_put, \
    marker_translations_update_marker_translation_api_v_1_maps_map_markers_marker_translations_language_patch
from aion2_interactive_map_backend_client.models import MarkerCreate, \
    BodyMarkerImagesUploadMarkerImageApiV1MapsMapMarkersMarkerImagesPut, HTTPValidationError, MarkerTranslationUpdate
from aion2_interactive_map_backend_client.types import File

cc = OpenCC("t2s")

# -------------------------------------------------------
# Paths
# -------------------------------------------------------
root = Path(r"G:\NCSoft\宠物")
pets_json_path = Path(r"table.pets.json")

dirs_with_png = {p.parent for p in root.rglob("*.png")}


class ParsedName(NamedTuple):
    fname: Path
    has_xy: bool
    x: int | None
    y: int | None
    name: str | None   # 可能来自 x,y 后，也可能来自 x,y 前


XY_PATTERN = re.compile(r'(\d{3,4})\s*[，,]\s*(\d{3,4})')


def parse_png_filename(path_or_name: Path) -> ParsedName:
    """从 png 文件名中提取是否含有 x,y、坐标值，以及名字（优先使用坐标后的名字，否则用坐标前的名字）"""
    if not path_or_name.name.lower().endswith(".png"):
        return ParsedName(path_or_name, False, None, None, None)

    stem = path_or_name.stem  # 不含 .png 的部分

    m = XY_PATTERN.search(stem)
    if not m:
        # 没有坐标
        return ParsedName(path_or_name, False, None, None, None)

    x = int(m.group(1))
    y = int(m.group(2))

    # 坐标前后的原始字符串
    before = stem[:m.start()]
    after = stem[m.end():]

    # 清理前后的多余符号 / 空白
    before = before.rstrip(" -_，,　").strip()
    after = after.lstrip(" -_，,　").strip()

    if after:
        raw_name = after
    else:
        # 没有坐标后的名字时，使用坐标前的字符串
        raw_name = before or None

    name: str | None
    if raw_name:
        name = cc.convert(raw_name)
    else:
        name = None

    return ParsedName(path_or_name, True, x, y, name)


# 清理宠物名：目录名转简体，并去掉括号里的备注（中英文括号都处理）
PAREN_PATTERN_CN = re.compile(r'（[^）]*）')
PAREN_PATTERN_EN = re.compile(r'\([^)]*\)')


def get_pet_name_from_dir(dir_path: Path) -> str:
    if "自然宠物获得处地图分布" in str(dir_path):
        name = dir_path.parent.name
    else:
        name = dir_path.name

    # 先转简体
    name = cc.convert(name)
    # 去掉括号中的内容
    name = PAREN_PATTERN_CN.sub("", name)
    name = PAREN_PATTERN_EN.sub("", name)
    return name.strip()


# -------------------------------------------------------
# 加载 JSON：按 zh-CN 建一个基础字典
# -------------------------------------------------------
with pets_json_path.open("r", encoding="utf-8") as f:
    pets_data = json.load(f)

# zh-CN => json entry
pets_by_zh_cn: dict[str, dict] = {
    entry["zh-CN"]: entry for entry in pets_data if "zh-CN" in entry
}

# -------------------------------------------------------
# 遍历所有 png，收集信息
# -------------------------------------------------------
results: list[ParsedName] = []

# key 为 json 里的 zh-CN
# name -> { "json": entry, "infos": [ ... ] }
name_to_data: dict[str, dict] = {}

# 没有在 JSON 中匹配到的文件信息
unmatched_infos: list[dict] = []

for d in sorted(dirs_with_png):
    pet_name = get_pet_name_from_dir(d)  # 目录名简体 & 去括号

    for fname in sorted(d.glob("*.png")):
        info = parse_png_filename(fname)
        if not info.has_xy:
            continue

        results.append(info)

        # 总是用目录名 pet_name 去匹配 JSON
        cn_name = pet_name
        if not cn_name:
            # 目录名都空了，直接算 unmatched
            unmatched_infos.append(
                {
                    "fname": str(info.fname),
                    "x": info.x,
                    "y": info.y,
                    "name": info.name,
                    "pet_name": pet_name,
                    "reason": "empty_pet_name",
                }
            )
            continue

        json_entry = pets_by_zh_cn.get(cn_name)

        if json_entry is None:
            # 在 JSON 里找不到匹配，存到 unmatched
            unmatched_infos.append(
                {
                    "fname": str(info.fname),
                    "x": info.x,
                    "y": info.y,
                    "name": info.name,
                    "pet_name": pet_name,
                    "reason": "no_json_match",
                }
            )
            continue

        # 使用 JSON 中的 zh-CN 作为最终 key（理论上等于 cn_name，但以后更安全）
        key = json_entry["zh-CN"]

        bucket = name_to_data.get(key)
        if bucket is None:
            bucket = {
                "json": json_entry,
                "infos": [],
            }
            name_to_data[key] = bucket

        bucket["infos"].append(
            {
                "fname": str(info.fname),
                "x": info.x,
                "y": info.y,
                "name": info.name,
                "pet_name": pet_name,
            }
        )

print("total parsed png with xy:", len(results))
print("unique matched zh-CN names:", len(name_to_data))
print("unmatched infos:", len(unmatched_infos))

# 写出两个文件
out_mapping = Path("pet_mapping.json")
out_unmatched = Path("pet_unmatched.json")

out_mapping.write_text(
    json.dumps(name_to_data, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
out_unmatched.write_text(
    json.dumps(unmatched_infos, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print("mapping written to", out_mapping)
print("unmatched written to", out_unmatched)

# 简单打印统计



async def main():
    headers = await get_headers()
    async with Client(base_url="http://localhost:9000", headers=headers) as client:
        for key, value in name_to_data.items():
            print(f"{key}: {len(value['infos'])}")

            for info in value['infos']:
                if "魔族" in str(info["fname"]):
                    map_name = "World_D_A"
                else:
                    map_name = "World_L_A"


                body = MarkerCreate(
                    subtype_id=value["json"]["type"],
                    name=info["pet_name"],
                    x=info["x"],
                    y=info["y"],
                )

                try:
                    response = await markers_create_marker_api_v_1_maps_map_markers_post.asyncio(
                        map_name, client=client, body=body
                    )
                    print(f"[POST] {info['pet_name']} ({map_name}): {response.error_code}")
                    marker_id = response.data.id
                except:
                    marker_id = None

                if marker_id is None:
                    print("[ERROR] marker_id is None")
                    continue

                filename = Path(info["fname"])
                files = {
                    "file": (str(filename.name), filename.open("rb"), "image/png")
                }

                try:
                    httpx_client = client.get_async_httpx_client()
                    response = await httpx_client.put(
                        f"http://localhost:9000/api/v1/maps/{map_name}/markers/{marker_id}/images",
                        files=files,
                    )
                    print(response)
                    print(f"[PUT] {info['pet_name']}: {response.status_code }")
                except:
                    print(f"[ERROR] failed to upload image")

                for language in ("zh-CN", ):
                    body = MarkerTranslationUpdate(
                        name=info["pet_name"],
                        description=info["name"] or "",
                    )
                    try:
                        response = await marker_translations_update_marker_translation_api_v_1_maps_map_markers_marker_translations_language_patch.asyncio(
                            map_name, marker=marker_id, language=language, client=client, body=body
                        )
                        print(f"[PATCH] {info["pet_name"]} {language}: {response.error_code}")
                    except:
                        print("[ERROR] failed to update marker translation")




if __name__ == '__main__':
    asyncio.run(main())
