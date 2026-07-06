from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.server_matching_create import ServerMatchingCreate
from ...models.server_matching_read_detail_resp import ServerMatchingReadDetailResp
from ...types import Response


def _get_kwargs(
    season: UUID,
    *,
    body: ServerMatchingCreate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": f"/api/v1/seasons/{season}/server_matchings/",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | ServerMatchingReadDetailResp | None:
    if response.status_code == 200:
        response_200 = ServerMatchingReadDetailResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | ServerMatchingReadDetailResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    season: UUID,
    *,
    client: AuthenticatedClient,
    body: ServerMatchingCreate,
) -> Response[HTTPValidationError | ServerMatchingReadDetailResp]:
    """Servermatchings.Create Server Matching

    Args:
        season (UUID):
        body (ServerMatchingCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | ServerMatchingReadDetailResp]
    """

    kwargs = _get_kwargs(
        season=season,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    season: UUID,
    *,
    client: AuthenticatedClient,
    body: ServerMatchingCreate,
) -> HTTPValidationError | ServerMatchingReadDetailResp | None:
    """Servermatchings.Create Server Matching

    Args:
        season (UUID):
        body (ServerMatchingCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | ServerMatchingReadDetailResp
    """

    return sync_detailed(
        season=season,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    season: UUID,
    *,
    client: AuthenticatedClient,
    body: ServerMatchingCreate,
) -> Response[HTTPValidationError | ServerMatchingReadDetailResp]:
    """Servermatchings.Create Server Matching

    Args:
        season (UUID):
        body (ServerMatchingCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | ServerMatchingReadDetailResp]
    """

    kwargs = _get_kwargs(
        season=season,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    season: UUID,
    *,
    client: AuthenticatedClient,
    body: ServerMatchingCreate,
) -> HTTPValidationError | ServerMatchingReadDetailResp | None:
    """Servermatchings.Create Server Matching

    Args:
        season (UUID):
        body (ServerMatchingCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | ServerMatchingReadDetailResp
    """

    return (
        await asyncio_detailed(
            season=season,
            client=client,
            body=body,
        )
    ).parsed
