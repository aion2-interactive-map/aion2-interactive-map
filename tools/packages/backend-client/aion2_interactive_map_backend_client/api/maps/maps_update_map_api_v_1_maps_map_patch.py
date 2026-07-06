from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.map_read_detail_resp import MapReadDetailResp
from ...models.map_update import MapUpdate
from ...types import Response


def _get_kwargs(
    map_: str,
    *,
    body: MapUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": f"/api/v1/maps/{map_}",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | MapReadDetailResp | None:
    if response.status_code == 200:
        response_200 = MapReadDetailResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | MapReadDetailResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    map_: str,
    *,
    client: AuthenticatedClient,
    body: MapUpdate,
) -> Response[HTTPValidationError | MapReadDetailResp]:
    """Maps.Update Map

    Args:
        map_ (str):
        body (MapUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MapReadDetailResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    *,
    client: AuthenticatedClient,
    body: MapUpdate,
) -> HTTPValidationError | MapReadDetailResp | None:
    """Maps.Update Map

    Args:
        map_ (str):
        body (MapUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MapReadDetailResp
    """

    return sync_detailed(
        map_=map_,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    map_: str,
    *,
    client: AuthenticatedClient,
    body: MapUpdate,
) -> Response[HTTPValidationError | MapReadDetailResp]:
    """Maps.Update Map

    Args:
        map_ (str):
        body (MapUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MapReadDetailResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    *,
    client: AuthenticatedClient,
    body: MapUpdate,
) -> HTTPValidationError | MapReadDetailResp | None:
    """Maps.Update Map

    Args:
        map_ (str):
        body (MapUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MapReadDetailResp
    """

    return (
        await asyncio_detailed(
            map_=map_,
            client=client,
            body=body,
        )
    ).parsed
