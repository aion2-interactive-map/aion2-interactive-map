from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.region_create import RegionCreate
from ...models.region_read_detail_resp import RegionReadDetailResp
from ...types import Response


def _get_kwargs(
    map_: str,
    *,
    body: RegionCreate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": f"/api/v1/maps/{map_}/regions/",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | RegionReadDetailResp | None:
    if response.status_code == 200:
        response_200 = RegionReadDetailResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | RegionReadDetailResp]:
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
    body: RegionCreate,
) -> Response[HTTPValidationError | RegionReadDetailResp]:
    """Regions.Create Region

    Args:
        map_ (str):
        body (RegionCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | RegionReadDetailResp]
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
    body: RegionCreate,
) -> HTTPValidationError | RegionReadDetailResp | None:
    """Regions.Create Region

    Args:
        map_ (str):
        body (RegionCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | RegionReadDetailResp
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
    body: RegionCreate,
) -> Response[HTTPValidationError | RegionReadDetailResp]:
    """Regions.Create Region

    Args:
        map_ (str):
        body (RegionCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | RegionReadDetailResp]
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
    body: RegionCreate,
) -> HTTPValidationError | RegionReadDetailResp | None:
    """Regions.Create Region

    Args:
        map_ (str):
        body (RegionCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | RegionReadDetailResp
    """

    return (
        await asyncio_detailed(
            map_=map_,
            client=client,
            body=body,
        )
    ).parsed
