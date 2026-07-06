import asyncio
import yaml
from pathlib import Path

from aion2_interactive_map_backend_client.api.servers import servers_create_server_api_v_1_servers_post
from aion2_interactive_map_backend_client.models.server_create import ServerCreate
from aion2.tools.common.auth import get_headers
from aion2.tools.common.client import client as base_client

async def update_servers():
    yaml_path = Path(__file__).parent / "servers.yaml"
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    headers = await get_headers()
    client = base_client.with_headers(headers)

    async with client as _client:
        for server_data in data["servers"]:
            body = ServerCreate(
                server_region="tw",
                race_id=server_data["raceId"],
                server_id=server_data["serverId"],
                server_name=server_data["serverName"],
                server_short_name=server_data["serverShortName"],
            )
            
            print(f"Creating server: {body.server_name} ({body.server_id})")
            response = await servers_create_server_api_v_1_servers_post.asyncio(
                client=_client,
                body=body
            )
            if response is None:
                # If we get None, it might be an error depending on how the client is configured
                print(f"Failed to create server {body.server_name}")
            else:
                print(f"Successfully created server {body.server_name}")

if __name__ == "__main__":
    asyncio.run(update_servers())
