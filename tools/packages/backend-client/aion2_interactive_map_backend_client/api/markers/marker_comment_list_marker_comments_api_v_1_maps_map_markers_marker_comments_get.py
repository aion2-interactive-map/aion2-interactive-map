from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.comment_read_list_resp import CommentReadListResp
from ...models.http_validation_error import HTTPValidationError
from ...types import Response


def _get_kwargs(
    map_: str,
    marker: UUID,
) -> dict[str, Any]:
    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": f"/api/v1/maps/{map_}/markers/{marker}/comments",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CommentReadListResp | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = CommentReadListResp.from_dict(response.json())

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
) -> Response[CommentReadListResp | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    map_: str,
    marker: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[CommentReadListResp | HTTPValidationError]:
    """Markercomment.List Marker Comments

    Args:
        map_ (str):
        marker (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CommentReadListResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        map_=map_,
        marker=marker,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    marker: UUID,
    *,
    client: AuthenticatedClient,
) -> CommentReadListResp | HTTPValidationError | None:
    """Markercomment.List Marker Comments

    Args:
        map_ (str):
        marker (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CommentReadListResp | HTTPValidationError
    """

    return sync_detailed(
        map_=map_,
        marker=marker,
        client=client,
    ).parsed


async def asyncio_detailed(
    map_: str,
    marker: UUID,
    *,
    client: AuthenticatedClient,
) -> Response[CommentReadListResp | HTTPValidationError]:
    """Markercomment.List Marker Comments

    Args:
        map_ (str):
        marker (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CommentReadListResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        map_=map_,
        marker=marker,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    marker: UUID,
    *,
    client: AuthenticatedClient,
) -> CommentReadListResp | HTTPValidationError | None:
    """Markercomment.List Marker Comments

    Args:
        map_ (str):
        marker (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CommentReadListResp | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            map_=map_,
            marker=marker,
            client=client,
        )
    ).parsed
