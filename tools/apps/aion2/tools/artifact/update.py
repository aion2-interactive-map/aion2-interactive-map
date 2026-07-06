import asyncio
import csv
from datetime import datetime
from pathlib import Path
from aion2.tools.common.auth import get_headers
from aion2.tools.common.client import client as base_client
from aion2_interactive_map_backend_client.api.seasons import seasons_list_seasons_api_v_1_seasons_get
from aion2_interactive_map_backend_client.api.server_matchings import (
    server_matchings_list_server_matchings_api_v_1_seasons_season_server_matchings_get
)
from aion2_interactive_map_backend_client.api.abyss_artifacts import (
    abyss_artifacts_get_abyss_artifacts_api_v_1_maps_map_artifacts_get
)
from aion2_interactive_map_backend_client.models.abyss_artifact_map_state_create import AbyssArtifactMapStateCreate
from aion2_interactive_map_backend_client.models.abyss_artifact_map_state_info import AbyssArtifactMapStateInfo
from aion2_interactive_map_backend_client.api.abyss_artifacts_states import (
    abyss_artifact_states_create_abyss_artifact_state_api_v_1_seasons_season_maps_map_artifacts_states_post
)

async def update(input_file: str, map_name: str = None):
    # 1. Initialize client with auth headers
    headers = await get_headers()
    client = base_client.with_headers(headers)

    all_maps_config = {
        "Abyss_Reshanta_A": {
            "artifact_columns": {
                2: "艾雷修蓝塔之根神器",
                3: "硫磺树岛神器",
                4: "希埃尔之翼群岛神器"
            },
            "time_column": 5
        },
        "Abyss_Reshanta_B": {
            "artifact_columns": {
                6: "加爾西坎觀測所神器",
                7: "加爾西坎城寨神器",
                8: "地下寺院神器"
            },
            "time_column": 9
        }
    }

    if map_name:
        if map_name not in all_maps_config:
            print(f"Error: Map '{map_name}' not found in configuration.")
            return
        maps_config = {map_name: all_maps_config[map_name]}
    else:
        maps_config = all_maps_config

    async with client as _client:
        # 2. Find the season id with season number=2 and region=tw
        print("Fetching seasons...")
        seasons_resp = await seasons_list_seasons_api_v_1_seasons_get.asyncio(client=_client)
        if not seasons_resp or not seasons_resp.data or not seasons_resp.data.results:
            print("No seasons found.")
            return

        target_season = None
        for season in seasons_resp.data.results:
            if season.number == 2 and season.server_region == "tw":
                target_season = season
                break

        if not target_season:
            print("Season with number=2 and region=tw not found.")
            return

        print(f"Found target season: ID={target_season.id}, Number={target_season.number}, Region={target_season.server_region}")

        # 3. Find all server matchings in the season
        print(f"Fetching server matchings for season {target_season.id}...")
        matchings_resp = await server_matchings_list_server_matchings_api_v_1_seasons_season_server_matchings_get.asyncio(
            season=target_season.id,
            client=_client
        )

        if not matchings_resp or not matchings_resp.data or not matchings_resp.data.results:
            print("No server matchings found for this season.")
            return

        matchings = matchings_resp.data.results
        print(f"Found {len(matchings)} server matchings.")

        # 4. Get all abyss artifacts for all maps
        artifacts_by_map = {}
        from aion2_interactive_map_backend_client.types import Unset
        
        for m_name in maps_config.keys():
            print(f"Fetching abyss artifacts for map {m_name}...")
            artifacts_resp = await abyss_artifacts_get_abyss_artifacts_api_v_1_maps_map_artifacts_get.asyncio(
                map_=m_name,
                client=_client
            )

            if not artifacts_resp or not artifacts_resp.data or not artifacts_resp.data.results:
                print(f"No abyss artifacts found for map {m_name}.")
                continue
            
            if isinstance(artifacts_resp.data.results, Unset):
                print(f"No abyss artifacts results found for map {m_name}.")
                continue

            artifacts_by_map[m_name] = {a.marker.name: a.id for a in artifacts_resp.data.results}
            print(f"Found {len(artifacts_by_map[m_name])} artifacts for {m_name}.")

        # 5. Read CSV
        csv_path = Path(input_file)
        if not csv_path.exists():
            print(f"CSV file not found at {csv_path}")
            return

        race_map = {"天": 1, "魔": 2}

        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader)  # Skip header
            
            for row_idx, row in enumerate(reader):
                if not row or len(row) < 10:
                    continue
                
                if row_idx >= len(matchings):
                    print(f"Warning: Row {row_idx + 2} in CSV exceeds available matchings ({len(matchings)})")
                    continue

                matching_id = matchings[row_idx].id

                for m_name, config in maps_config.items():
                    record_time_str = row[config["time_column"]].strip()

                    if record_time_str == "#" or not record_time_str:
                        continue

                    try:
                        record_time = datetime.strptime(record_time_str, "%Y/%m/%d %H:%M:%S")
                    except ValueError as e:
                        print(f"Error parsing date {record_time_str} for map {m_name}: {e}")
                        continue

                    artifacts_by_name = artifacts_by_map.get(m_name, {})
                    
                    states_info = []
                    for col_idx, artifact_name in config["artifact_columns"].items():
                        state_str = row[col_idx].strip()
                        state = race_map.get(state_str, 0)
                        
                        artifact_id = artifacts_by_name.get(artifact_name)
                        if not artifact_id:
                            print(f"Warning: Artifact '{artifact_name}' not found in database for map {m_name}.")
                            continue

                        states_info.append(AbyssArtifactMapStateInfo(
                            abyss_artifact_id=artifact_id,
                            state=state
                        ))

                    if not states_info:
                        continue

                    # Output the inputs for the create abyss artifact state api
                    print(f"Creating states: Row={row_idx + 2}, Map={m_name}, Season={target_season.id}, Matching={matching_id}, StatesCount={len(states_info)}, Time={record_time}")
                    
                    body = AbyssArtifactMapStateCreate(
                        server_matching_id=matching_id,
                        states=states_info,
                        record_time=record_time
                    )

                    response = await abyss_artifact_states_create_abyss_artifact_state_api_v_1_seasons_season_maps_map_artifacts_states_post.asyncio(
                        season=target_season.id,
                        map_=m_name,
                        client=_client,
                        body=body
                    )

                    if response:
                        if response.error_code == "Success":
                            print(f"Successfully created states for {m_name}.")
                        else:
                            print(f"Failed to create states for {m_name}: {response.error_message}.")
                    else:
                        print(f"Failed to create states for {m_name}.")

if __name__ == "__main__":
    input_file = "day3.csv"
    map_name = "Abyss_Reshanta_B"
    asyncio.run(update(input_file, map_name))
