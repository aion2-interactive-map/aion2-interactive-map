from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.character_info_list_resp import CharacterInfoListResp
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    keyword: str,
    race: int,
    server: int | None | Unset = UNSET,
    region: str | Unset = "tw",
) -> dict[str, Any]:
    params: dict[str, Any] = {}

    params["keyword"] = keyword

    params["race"] = race

    json_server: int | None | Unset
    if isinstance(server, Unset):
        json_server = UNSET
    else:
        json_server = server
    params["server"] = json_server

    params["region"] = region

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/characters/search",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CharacterInfoListResp | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = CharacterInfoListResp.from_dict(response.json())

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
) -> Response[CharacterInfoListResp | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    keyword: str,
    race: int,
    server: int | None | Unset = UNSET,
    region: str | Unset = "tw",
) -> Response[CharacterInfoListResp | HTTPValidationError]:
    """Character.Search Characters

    Args:
        keyword (str):
        race (int):
        server (int | None | Unset):
        region (str | Unset):  Default: 'tw'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CharacterInfoListResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        keyword=keyword,
        race=race,
        server=server,
        region=region,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    keyword: str,
    race: int,
    server: int | None | Unset = UNSET,
    region: str | Unset = "tw",
) -> CharacterInfoListResp | HTTPValidationError | None:
    """Character.Search Characters

    Args:
        keyword (str):
        race (int):
        server (int | None | Unset):
        region (str | Unset):  Default: 'tw'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CharacterInfoListResp | HTTPValidationError
    """

    return sync_detailed(
        client=client,
        keyword=keyword,
        race=race,
        server=server,
        region=region,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    keyword: str,
    race: int,
    server: int | None | Unset = UNSET,
    region: str | Unset = "tw",
) -> Response[CharacterInfoListResp | HTTPValidationError]:
    """Character.Search Characters

    Args:
        keyword (str):
        race (int):
        server (int | None | Unset):
        region (str | Unset):  Default: 'tw'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CharacterInfoListResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        keyword=keyword,
        race=race,
        server=server,
        region=region,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    keyword: str,
    race: int,
    server: int | None | Unset = UNSET,
    region: str | Unset = "tw",
) -> CharacterInfoListResp | HTTPValidationError | None:
    """Character.Search Characters

    Args:
        keyword (str):
        race (int):
        server (int | None | Unset):
        region (str | Unset):  Default: 'tw'.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CharacterInfoListResp | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            client=client,
            keyword=keyword,
            race=race,
            server=server,
            region=region,
        )
    ).parsed
