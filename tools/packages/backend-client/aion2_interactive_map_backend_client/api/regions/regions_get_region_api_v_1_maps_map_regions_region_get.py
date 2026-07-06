from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.region_read_detail_resp import RegionReadDetailResp
from ...types import Response


def _get_kwargs(
    map_: str,
    region: str,
) -> dict[str, Any]:
    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": f"/api/v1/maps/{map_}/regions/{region}",
    }

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
    region: str,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | RegionReadDetailResp]:
    """Regions.Get Region

    Args:
        map_ (str):
        region (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | RegionReadDetailResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        region=region,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    region: str,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | RegionReadDetailResp | None:
    """Regions.Get Region

    Args:
        map_ (str):
        region (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | RegionReadDetailResp
    """

    return sync_detailed(
        map_=map_,
        region=region,
        client=client,
    ).parsed


async def asyncio_detailed(
    map_: str,
    region: str,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | RegionReadDetailResp]:
    """Regions.Get Region

    Args:
        map_ (str):
        region (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | RegionReadDetailResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        region=region,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    region: str,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | RegionReadDetailResp | None:
    """Regions.Get Region

    Args:
        map_ (str):
        region (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | RegionReadDetailResp
    """

    return (
        await asyncio_detailed(
            map_=map_,
            region=region,
            client=client,
        )
    ).parsed
