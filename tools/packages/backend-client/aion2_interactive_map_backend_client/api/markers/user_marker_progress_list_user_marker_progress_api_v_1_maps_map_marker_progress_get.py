from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.user_marker_progress_read_list_resp import UserMarkerProgressReadListResp
from ...types import Response


def _get_kwargs(
    map_: str,
) -> dict[str, Any]:
    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": f"/api/v1/maps/{map_}/marker_progress",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | UserMarkerProgressReadListResp | None:
    if response.status_code == 200:
        response_200 = UserMarkerProgressReadListResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | UserMarkerProgressReadListResp]:
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
) -> Response[HTTPValidationError | UserMarkerProgressReadListResp]:
    """Usermarkerprogress.List User Marker Progress

    Args:
        map_ (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | UserMarkerProgressReadListResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | UserMarkerProgressReadListResp | None:
    """Usermarkerprogress.List User Marker Progress

    Args:
        map_ (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | UserMarkerProgressReadListResp
    """

    return sync_detailed(
        map_=map_,
        client=client,
    ).parsed


async def asyncio_detailed(
    map_: str,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | UserMarkerProgressReadListResp]:
    """Usermarkerprogress.List User Marker Progress

    Args:
        map_ (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | UserMarkerProgressReadListResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | UserMarkerProgressReadListResp | None:
    """Usermarkerprogress.List User Marker Progress

    Args:
        map_ (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | UserMarkerProgressReadListResp
    """

    return (
        await asyncio_detailed(
            map_=map_,
            client=client,
        )
    ).parsed
