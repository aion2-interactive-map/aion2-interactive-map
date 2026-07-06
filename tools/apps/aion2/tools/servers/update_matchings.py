import asyncio
import csv
from pathlib import Path

from aion2_interactive_map_backend_client.api.servers import (
    servers_list_servers_api_v_1_servers_get,
)
from aion2_interactive_map_backend_client.api.server_matchings import (
    server_matchings_create_server_matching_api_v_1_seasons_season_server_matchings_post
)
from aion2_interactive_map_backend_client.api.seasons import seasons_list_seasons_api_v_1_seasons_get
from aion2_interactive_map_backend_client.models.server_matching_create import ServerMatchingCreate
from aion2.tools.common.auth import get_headers
from aion2.tools.common.client import client as base_client

async def update_matchings():
    # 1. Get headers and initialize client
    headers = await get_headers()
    client = base_client.with_headers(headers)

    async with client as _client:
        # 2. Get all servers
        print("Fetching servers...")
        servers_resp = await servers_list_servers_api_v_1_servers_get.asyncio(client=_client)
        if not servers_resp or not servers_resp.data or not servers_resp.data.results:
            print("No servers found.")
            return
        
        # Filter servers by region "tw"
        servers = {s.server_id: s for s in servers_resp.data.results if s.server_region == "tw"}
        print(f"Found {len(servers)} 'tw' servers.")

        # 3. Get all seasons
        print("Fetching seasons...")
        seasons_resp = await seasons_list_seasons_api_v_1_seasons_get.asyncio(client=_client)
        if not seasons_resp or not seasons_resp.data or not seasons_resp.data.results:
            print("No seasons found.")
            return
        
        seasons = {(s.number, s.matching_number): s for s in seasons_resp.data.results}
        print(f"Found {len(seasons)} seasons.")

        # 4. Read matchings from CSV files
        matching_files = [
            ("matchings_3_2.csv", 3, 2),
        ]

        for file_name, season_number, matching_number in matching_files:
            csv_path = Path(__file__).parent / file_name
            if not csv_path.exists():
                print(f"Matching file not found at {csv_path}")
                continue

            print(f"Processing {file_name} for season {season_number} (matching {matching_number})...")
            
            if (season_number, matching_number) not in seasons:
                print(f"Season number {season_number} with matching number {matching_number} not found in database.")
                continue

            season_id = seasons[(season_number, matching_number)].id

            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                rows = []
                server_ids_in_file = set()
                duplicate_found = False
                
                for line_number, row in enumerate(reader, start=1):
                    if not row or len(row) < 2:
                        continue
                    
                    try:
                        server_1_id = int(row[0].strip())
                        server_2_id = int(row[1].strip())
                    except ValueError:
                        print(f"Skipping invalid row in {file_name} at line {line_number}: {row}")
                        continue
                    
                    if server_1_id in server_ids_in_file:
                        print(f"Duplicate server ID {server_1_id} found in {file_name} at line {line_number}.")
                        duplicate_found = True
                    server_ids_in_file.add(server_1_id)
                    
                    if server_2_id in server_ids_in_file:
                        print(f"Duplicate server ID {server_2_id} found in {file_name} at line {line_number}.")
                        duplicate_found = True
                    server_ids_in_file.add(server_2_id)
                    
                    rows.append((line_number, server_1_id, server_2_id))
                
                if duplicate_found:
                    print(f"Aborting processing for {file_name} due to duplicate server IDs.")
                    continue

                for line_number, server_1_id, server_2_id in rows:
                    if server_1_id not in servers:
                        print(f"Server ID {server_1_id} (tw) not found.")
                        continue

                    if server_2_id not in servers:
                        print(f"Server ID {server_2_id} (tw) not found.")
                        continue

                    body = ServerMatchingCreate(
                        server_1_id=servers[server_1_id].id,
                        server_2_id=servers[server_2_id].id,
                        order=line_number
                    )

                    print(f"Creating matching for season {season_number} (matching {matching_number}) [order {line_number}]: {server_1_id} <-> {server_2_id}")
                    response = await server_matchings_create_server_matching_api_v_1_seasons_season_server_matchings_post.asyncio(
                        client=_client,
                        season=season_id,
                        body=body
                    )

                    if response:
                        print(f"Successfully created matching for {server_1_id} <-> {server_2_id}.")
                    else:
                        print(f"Failed to create matching for {server_1_id} <-> {server_2_id}.")

if __name__ == "__main__":
    asyncio.run(update_matchings())
