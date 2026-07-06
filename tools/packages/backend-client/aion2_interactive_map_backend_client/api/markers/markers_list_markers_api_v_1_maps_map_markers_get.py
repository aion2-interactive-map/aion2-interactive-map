from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.marker_read_detail_list_resp import MarkerReadDetailListResp
from ...types import UNSET, Response, Unset


def _get_kwargs(
    map_: str,
    *,
    limit: int | Unset = 100,
    offset: int | Unset = 0,
    subtype: str | Unset = "",
    region: str | Unset = "",
    name: str | Unset = "",
    x: int | None | Unset = UNSET,
    y: int | None | Unset = UNSET,
) -> dict[str, Any]:
    params: dict[str, Any] = {}

    params["limit"] = limit

    params["offset"] = offset

    params["subtype"] = subtype

    params["region"] = region

    params["name"] = name

    json_x: int | None | Unset
    if isinstance(x, Unset):
        json_x = UNSET
    else:
        json_x = x
    params["x"] = json_x

    json_y: int | None | Unset
    if isinstance(y, Unset):
        json_y = UNSET
    else:
        json_y = y
    params["y"] = json_y

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": f"/api/v1/maps/{map_}/markers",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | MarkerReadDetailListResp | None:
    if response.status_code == 200:
        response_200 = MarkerReadDetailListResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | MarkerReadDetailListResp]:
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
    limit: int | Unset = 100,
    offset: int | Unset = 0,
    subtype: str | Unset = "",
    region: str | Unset = "",
    name: str | Unset = "",
    x: int | None | Unset = UNSET,
    y: int | None | Unset = UNSET,
) -> Response[HTTPValidationError | MarkerReadDetailListResp]:
    """Markers.List Markers

    Args:
        map_ (str):
        limit (int | Unset):  Default: 100.
        offset (int | Unset):  Default: 0.
        subtype (str | Unset):  Default: ''.
        region (str | Unset):  Default: ''.
        name (str | Unset):  Default: ''.
        x (int | None | Unset):
        y (int | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MarkerReadDetailListResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        limit=limit,
        offset=offset,
        subtype=subtype,
        region=region,
        name=name,
        x=x,
        y=y,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    *,
    client: AuthenticatedClient,
    limit: int | Unset = 100,
    offset: int | Unset = 0,
    subtype: str | Unset = "",
    region: str | Unset = "",
    name: str | Unset = "",
    x: int | None | Unset = UNSET,
    y: int | None | Unset = UNSET,
) -> HTTPValidationError | MarkerReadDetailListResp | None:
    """Markers.List Markers

    Args:
        map_ (str):
        limit (int | Unset):  Default: 100.
        offset (int | Unset):  Default: 0.
        subtype (str | Unset):  Default: ''.
        region (str | Unset):  Default: ''.
        name (str | Unset):  Default: ''.
        x (int | None | Unset):
        y (int | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MarkerReadDetailListResp
    """

    return sync_detailed(
        map_=map_,
        client=client,
        limit=limit,
        offset=offset,
        subtype=subtype,
        region=region,
        name=name,
        x=x,
        y=y,
    ).parsed


async def asyncio_detailed(
    map_: str,
    *,
    client: AuthenticatedClient,
    limit: int | Unset = 100,
    offset: int | Unset = 0,
    subtype: str | Unset = "",
    region: str | Unset = "",
    name: str | Unset = "",
    x: int | None | Unset = UNSET,
    y: int | None | Unset = UNSET,
) -> Response[HTTPValidationError | MarkerReadDetailListResp]:
    """Markers.List Markers

    Args:
        map_ (str):
        limit (int | Unset):  Default: 100.
        offset (int | Unset):  Default: 0.
        subtype (str | Unset):  Default: ''.
        region (str | Unset):  Default: ''.
        name (str | Unset):  Default: ''.
        x (int | None | Unset):
        y (int | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MarkerReadDetailListResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        limit=limit,
        offset=offset,
        subtype=subtype,
        region=region,
        name=name,
        x=x,
        y=y,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    *,
    client: AuthenticatedClient,
    limit: int | Unset = 100,
    offset: int | Unset = 0,
    subtype: str | Unset = "",
    region: str | Unset = "",
    name: str | Unset = "",
    x: int | None | Unset = UNSET,
    y: int | None | Unset = UNSET,
) -> HTTPValidationError | MarkerReadDetailListResp | None:
    """Markers.List Markers

    Args:
        map_ (str):
        limit (int | Unset):  Default: 100.
        offset (int | Unset):  Default: 0.
        subtype (str | Unset):  Default: ''.
        region (str | Unset):  Default: ''.
        name (str | Unset):  Default: ''.
        x (int | None | Unset):
        y (int | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MarkerReadDetailListResp
    """

    return (
        await asyncio_detailed(
            map_=map_,
            client=client,
            limit=limit,
            offset=offset,
            subtype=subtype,
            region=region,
            name=name,
            x=x,
            y=y,
        )
    ).parsed
