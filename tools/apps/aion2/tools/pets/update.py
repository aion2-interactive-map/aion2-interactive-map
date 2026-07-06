import asyncio
import json

from aion2.tools.common.auth import get_headers
from aion2_interactive_map_backend_client import Client
from aion2_interactive_map_backend_client.api.markers import markers_list_markers_api_v_1_maps_map_markers_get, markers_update_marker_api_v_1_maps_map_markers_marker_patch
from aion2_interactive_map_backend_client.models import MarkerUpdate

pets_data = json.load(open("table.pets.json", "r", encoding="utf-8"))
pets_dict = {x["zh-CN"]: x for x in pets_data}

async def main():
    headers = await get_headers()
    async with Client(base_url="http://localhost:9000", headers=headers) as client:
        for map_ in ("World_L_A", "World_D_A"):
            for subtype in ("creatureIntellect", "creatureFeral", "creatureNature", "creatureTrans", "creatureSpecial"):
                response = await markers_list_markers_api_v_1_maps_map_markers_get.asyncio(
                    map_=map_,
                    limit=1000,
                    subtype=subtype,
                    client=client,
                )
                for marker in response.data.results:
                    print(marker.name)
                    if marker.name in pets_dict:
                        icon = pets_dict[marker.name]["icon"]
                        icon_path = f"UI/Resource/Texture/Portrait/Portrait_Vehicle/{icon}.webp"
                        print(marker.name, icon_path)

                        body = MarkerUpdate(
                            subtype_id=marker.subtype_id,
                            region_id=marker.region_id,
                            name=marker.name,
                            x=marker.x,
                            y=marker.y,
                            icon=icon_path,
                        )

                        response2 = await markers_update_marker_api_v_1_maps_map_markers_marker_patch.asyncio(
                            map_=map_,
                            marker=marker.id,
                            client=client,
                            body=body,
                        )
                        print(response2)

                    else:
                        print("not found:", marker.name)
                # print(response)


if __name__ == '__main__':
    asyncio.run(main())
