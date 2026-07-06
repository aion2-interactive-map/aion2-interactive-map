from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.user_create import UserCreate
from ...models.user_read_resp import UserReadResp
from ...types import UNSET, Response


def _get_kwargs(
    *,
    body: UserCreate,
    altcha: str,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    params: dict[str, Any] = {}

    params["altcha"] = altcha

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/v1/auth/register",
        "params": params,
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | UserReadResp | None:
    if response.status_code == 201:
        response_201 = UserReadResp.from_dict(response.json())

        return response_201

    if response.status_code == 422:
        response_422 = HTTPValidationError.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[HTTPValidationError | UserReadResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: UserCreate,
    altcha: str,
) -> Response[HTTPValidationError | UserReadResp]:
    """Register:Register

    Args:
        altcha (str): Altcha Challenge
        body (UserCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | UserReadResp]
    """

    kwargs = _get_kwargs(
        body=body,
        altcha=altcha,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    body: UserCreate,
    altcha: str,
) -> HTTPValidationError | UserReadResp | None:
    """Register:Register

    Args:
        altcha (str): Altcha Challenge
        body (UserCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | UserReadResp
    """

    return sync_detailed(
        client=client,
        body=body,
        altcha=altcha,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: UserCreate,
    altcha: str,
) -> Response[HTTPValidationError | UserReadResp]:
    """Register:Register

    Args:
        altcha (str): Altcha Challenge
        body (UserCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | UserReadResp]
    """

    kwargs = _get_kwargs(
        body=body,
        altcha=altcha,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: UserCreate,
    altcha: str,
) -> HTTPValidationError | UserReadResp | None:
    """Register:Register

    Args:
        altcha (str): Altcha Challenge
        body (UserCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | UserReadResp
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
            altcha=altcha,
        )
    ).parsed
