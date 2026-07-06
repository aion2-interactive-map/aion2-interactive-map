import httpx
from fastapi import Depends, Request

def httpx_client_dep(request: Request) -> httpx.AsyncClient:
    client = getattr(request.app.state, "httpx_client", None)
    assert client is not None, "httpx client not initialized"
    return client

async def get_httpx_client(
    client: httpx.AsyncClient = Depends(httpx_client_dep),
) -> httpx.AsyncClient:
    return client
