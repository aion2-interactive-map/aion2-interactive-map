from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.server_read_resp import ServerReadResp
from ...types import Response


def _get_kwargs(
    server: UUID,
) -> dict[str, Any]:
    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": f"/api/v1/servers/{server}",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | ServerReadResp | None:
    if response.status_code == 200:
        response_200 = ServerReadResp.from_dict(response.json())

        return response_200

    if response.status_code == 422:
        response_422 = HTTPValidationError.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[HTTPValidationError | ServerReadResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    server: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> Response[HTTPValidationError | ServerReadResp]:
    """Servers.Get Server

    Args:
        server (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | ServerReadResp]
    """

    kwargs = _get_kwargs(
        server=server,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    server: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> HTTPValidationError | ServerReadResp | None:
    """Servers.Get Server

    Args:
        server (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | ServerReadResp
    """

    return sync_detailed(
        server=server,
        client=client,
    ).parsed


async def asyncio_detailed(
    server: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> Response[HTTPValidationError | ServerReadResp]:
    """Servers.Get Server

    Args:
        server (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | ServerReadResp]
    """

    kwargs = _get_kwargs(
        server=server,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    server: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> HTTPValidationError | ServerReadResp | None:
    """Servers.Get Server

    Args:
        server (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | ServerReadResp
    """

    return (
        await asyncio_detailed(
            server=server,
            client=client,
        )
    ).parsed
