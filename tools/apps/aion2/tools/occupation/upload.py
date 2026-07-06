import json
import asyncio
from pathlib import Path

from aion2.tools.common.auth import get_headers
from aion2_interactive_map_backend_client.api.markers import markers_create_marker_api_v_1_maps_map_markers_post, marker_translations_update_marker_translation_api_v_1_maps_map_markers_marker_translations_language_patch
from aion2_interactive_map_backend_client.models import MarkerCreate, MarkerTranslationUpdate
from aion2_interactive_map_backend_client.client import Client

MAP_NAME = "World_L_A"
BASEPATH = Path(__file__).parent
FILENAME = BASEPATH / f"{MAP_NAME}.json"


async def main():
    with FILENAME.open("r", encoding="utf-8") as f:
        markers = json.load(f)
    headers = await get_headers()
    async with Client(base_url="http://localhost:9000", headers=headers) as client:
        for marker in markers:

            body = MarkerCreate(
                subtype_id=marker["subtype"],
                name=marker["name"],
                x=marker["x"],
                y=marker["y"],
            )

            try:
                response = await markers_create_marker_api_v_1_maps_map_markers_post.asyncio(
                    MAP_NAME, client=client, body=body
                )
                print(f"[POST] {marker["name"]}: {response.error_code}")
                marker_id = response.data.id
            except:
                marker_id = None

            if marker_id is None:
                print("[ERROR] marker_id is None")
                continue

            # ---- 2) PATCH add all translations ----
            for language in ("en", "zh-CN", "zh-TW"):
                body = MarkerTranslationUpdate(
                    name=marker[language],
                    description=marker[language],
                )
                try:
                    response = await marker_translations_update_marker_translation_api_v_1_maps_map_markers_marker_translations_language_patch.asyncio(
                        MAP_NAME, marker=marker_id, language=language, client=client, body=body
                    )
                    print(f"[PATCH] {marker["name"]} {language}: {response.error_code}")
                except:
                    print("[ERROR] failed to update marker translation")
        
        
if __name__ == "__main__":
    asyncio.run(main())