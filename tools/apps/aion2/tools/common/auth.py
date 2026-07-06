import asyncio
import os
from functools import lru_cache

from aion2.tools.common.client import client
from aion2_interactive_map_backend_client.api.auth import auth_jwt_login_api_v1_auth_jwt_login_post
from aion2_interactive_map_backend_client.models import BodyAuthJwtLoginApiV1AuthJwtLoginPost

@lru_cache
async def get_access_token():
    async with client as _client:
        body = BodyAuthJwtLoginApiV1AuthJwtLoginPost(
            username=os.environ["AION2_BACKEND_USERNAME"],
            password=os.environ["AION2_BACKEND_PASSWORD"],
            grant_type="password",
        )
        response = await auth_jwt_login_api_v1_auth_jwt_login_post.asyncio(client=_client, body=body)
        print(response)
        return response.access_token

@lru_cache
async def get_headers():
    return {
        "Authorization": f"Bearer {await get_access_token()}",
        # "Content-Type": "application/json",
    }


if __name__ == '__main__':
    print(asyncio.run(get_access_token()))