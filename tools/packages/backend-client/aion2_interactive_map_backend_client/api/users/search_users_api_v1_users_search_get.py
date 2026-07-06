from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.user_read_list_resp import UserReadListResp
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    name: str | Unset = UNSET,
    email: str | Unset = UNSET,
    page: int | Unset = 1,
    page_size: int | Unset = 20,
) -> dict[str, Any]:
    params: dict[str, Any] = {}

    params["name"] = name

    params["email"] = email

    params["page"] = page

    params["page_size"] = page_size

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/users/search",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | UserReadListResp | None:
    if response.status_code == 200:
        response_200 = UserReadListResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | UserReadListResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    name: str | Unset = UNSET,
    email: str | Unset = UNSET,
    page: int | Unset = 1,
    page_size: int | Unset = 20,
) -> Response[HTTPValidationError | UserReadListResp]:
    """Search Users

    Args:
        name (str | Unset):
        email (str | Unset):
        page (int | Unset):  Default: 1.
        page_size (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | UserReadListResp]
    """

    kwargs = _get_kwargs(
        name=name,
        email=email,
        page=page,
        page_size=page_size,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    name: str | Unset = UNSET,
    email: str | Unset = UNSET,
    page: int | Unset = 1,
    page_size: int | Unset = 20,
) -> HTTPValidationError | UserReadListResp | None:
    """Search Users

    Args:
        name (str | Unset):
        email (str | Unset):
        page (int | Unset):  Default: 1.
        page_size (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | UserReadListResp
    """

    return sync_detailed(
        client=client,
        name=name,
        email=email,
        page=page,
        page_size=page_size,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    name: str | Unset = UNSET,
    email: str | Unset = UNSET,
    page: int | Unset = 1,
    page_size: int | Unset = 20,
) -> Response[HTTPValidationError | UserReadListResp]:
    """Search Users

    Args:
        name (str | Unset):
        email (str | Unset):
        page (int | Unset):  Default: 1.
        page_size (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | UserReadListResp]
    """

    kwargs = _get_kwargs(
        name=name,
        email=email,
        page=page,
        page_size=page_size,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    name: str | Unset = UNSET,
    email: str | Unset = UNSET,
    page: int | Unset = 1,
    page_size: int | Unset = 20,
) -> HTTPValidationError | UserReadListResp | None:
    """Search Users

    Args:
        name (str | Unset):
        email (str | Unset):
        page (int | Unset):  Default: 1.
        page_size (int | Unset):  Default: 20.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | UserReadListResp
    """

    return (
        await asyncio_detailed(
            client=client,
            name=name,
            email=email,
            page=page,
            page_size=page_size,
        )
    ).parsed
