from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.character_job_resp import CharacterJobResp
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    region: str | Unset = "tw",
    character: str,
    server: int,
    refresh: bool | Unset = False,
) -> dict[str, Any]:
    params: dict[str, Any] = {}

    params["region"] = region

    params["character"] = character

    params["server"] = server

    params["refresh"] = refresh

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/characters/info",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CharacterJobResp | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = CharacterJobResp.from_dict(response.json())

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
) -> Response[CharacterJobResp | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    region: str | Unset = "tw",
    character: str,
    server: int,
    refresh: bool | Unset = False,
) -> Response[CharacterJobResp | HTTPValidationError]:
    """Character.Get Character Info

    Args:
        region (str | Unset):  Default: 'tw'.
        character (str):
        server (int):
        refresh (bool | Unset):  Default: False.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CharacterJobResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        region=region,
        character=character,
        server=server,
        refresh=refresh,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    region: str | Unset = "tw",
    character: str,
    server: int,
    refresh: bool | Unset = False,
) -> CharacterJobResp | HTTPValidationError | None:
    """Character.Get Character Info

    Args:
        region (str | Unset):  Default: 'tw'.
        character (str):
        server (int):
        refresh (bool | Unset):  Default: False.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CharacterJobResp | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        region=region,
        character=character,
        server=server,
        refresh=refresh,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    region: str | Unset = "tw",
    character: str,
    server: int,
    refresh: bool | Unset = False,
) -> Response[CharacterJobResp | HTTPValidationError]:
    """Character.Get Character Info

    Args:
        region (str | Unset):  Default: 'tw'.
        character (str):
        server (int):
        refresh (bool | Unset):  Default: False.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CharacterJobResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        region=region,
        character=character,
        server=server,
        refresh=refresh,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    region: str | Unset = "tw",
    character: str,
    server: int,
    refresh: bool | Unset = False,
) -> CharacterJobResp | HTTPValidationError | None:
    """Character.Get Character Info

    Args:
        region (str | Unset):  Default: 'tw'.
        character (str):
        server (int):
        refresh (bool | Unset):  Default: False.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CharacterJobResp | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            region=region,
            character=character,
            server=server,
            refresh=refresh,
        )
    ).parsed
