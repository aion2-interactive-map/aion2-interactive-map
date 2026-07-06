from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.subtype_read_detail_resp import SubtypeReadDetailResp
from ...types import Response


def _get_kwargs(
    subtype: str,
) -> dict[str, Any]:
    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": f"/api/v1/subtypes/{subtype}",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | SubtypeReadDetailResp | None:
    if response.status_code == 200:
        response_200 = SubtypeReadDetailResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | SubtypeReadDetailResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    subtype: str,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | SubtypeReadDetailResp]:
    """Categories.Get Subtype

    Args:
        subtype (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | SubtypeReadDetailResp]
    """

    kwargs = _get_kwargs(
        subtype=subtype,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    subtype: str,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | SubtypeReadDetailResp | None:
    """Categories.Get Subtype

    Args:
        subtype (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | SubtypeReadDetailResp
    """

    return sync_detailed(
        subtype=subtype,
        client=client,
    ).parsed


async def asyncio_detailed(
    subtype: str,
    *,
    client: AuthenticatedClient,
) -> Response[HTTPValidationError | SubtypeReadDetailResp]:
    """Categories.Get Subtype

    Args:
        subtype (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | SubtypeReadDetailResp]
    """

    kwargs = _get_kwargs(
        subtype=subtype,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    subtype: str,
    *,
    client: AuthenticatedClient,
) -> HTTPValidationError | SubtypeReadDetailResp | None:
    """Categories.Get Subtype

    Args:
        subtype (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | SubtypeReadDetailResp
    """

    return (
        await asyncio_detailed(
            subtype=subtype,
            client=client,
        )
    ).parsed
