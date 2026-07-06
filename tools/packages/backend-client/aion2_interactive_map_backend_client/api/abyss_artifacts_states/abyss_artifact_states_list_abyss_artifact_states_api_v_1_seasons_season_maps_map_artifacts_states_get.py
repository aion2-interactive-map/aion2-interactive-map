import datetime
from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.abyss_artifact_state_read_list_resp import AbyssArtifactStateReadListResp
from ...models.http_validation_error import HTTPValidationError
from ...types import UNSET, Response, Unset


def _get_kwargs(
    season: UUID,
    map_: str,
    *,
    server_matching_id: None | Unset | UUID = UNSET,
    current_time: datetime.datetime | None | Unset = UNSET,
) -> dict[str, Any]:
    params: dict[str, Any] = {}

    json_server_matching_id: None | str | Unset
    if isinstance(server_matching_id, Unset):
        json_server_matching_id = UNSET
    elif isinstance(server_matching_id, UUID):
        json_server_matching_id = str(server_matching_id)
    else:
        json_server_matching_id = server_matching_id
    params["server_matching_id"] = json_server_matching_id

    json_current_time: None | str | Unset
    if isinstance(current_time, Unset):
        json_current_time = UNSET
    elif isinstance(current_time, datetime.datetime):
        json_current_time = current_time.isoformat()
    else:
        json_current_time = current_time
    params["current_time"] = json_current_time

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": f"/api/v1/seasons/{season}/maps/{map_}/artifacts/states",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AbyssArtifactStateReadListResp | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = AbyssArtifactStateReadListResp.from_dict(response.json())

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
) -> Response[AbyssArtifactStateReadListResp | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    season: UUID,
    map_: str,
    *,
    client: AuthenticatedClient,
    server_matching_id: None | Unset | UUID = UNSET,
    current_time: datetime.datetime | None | Unset = UNSET,
) -> Response[AbyssArtifactStateReadListResp | HTTPValidationError]:
    """Abyssartifactstates.List Abyss Artifact States

    Args:
        season (UUID):
        map_ (str):
        server_matching_id (None | Unset | UUID):
        current_time (datetime.datetime | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AbyssArtifactStateReadListResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        season=season,
        map_=map_,
        server_matching_id=server_matching_id,
        current_time=current_time,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    season: UUID,
    map_: str,
    *,
    client: AuthenticatedClient,
    server_matching_id: None | Unset | UUID = UNSET,
    current_time: datetime.datetime | None | Unset = UNSET,
) -> AbyssArtifactStateReadListResp | HTTPValidationError | None:
    """Abyssartifactstates.List Abyss Artifact States

    Args:
        season (UUID):
        map_ (str):
        server_matching_id (None | Unset | UUID):
        current_time (datetime.datetime | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AbyssArtifactStateReadListResp | HTTPValidationError
    """

    return sync_detailed(
        season=season,
        map_=map_,
        client=client,
        server_matching_id=server_matching_id,
        current_time=current_time,
    ).parsed


async def asyncio_detailed(
    season: UUID,
    map_: str,
    *,
    client: AuthenticatedClient,
    server_matching_id: None | Unset | UUID = UNSET,
    current_time: datetime.datetime | None | Unset = UNSET,
) -> Response[AbyssArtifactStateReadListResp | HTTPValidationError]:
    """Abyssartifactstates.List Abyss Artifact States

    Args:
        season (UUID):
        map_ (str):
        server_matching_id (None | Unset | UUID):
        current_time (datetime.datetime | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AbyssArtifactStateReadListResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        season=season,
        map_=map_,
        server_matching_id=server_matching_id,
        current_time=current_time,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    season: UUID,
    map_: str,
    *,
    client: AuthenticatedClient,
    server_matching_id: None | Unset | UUID = UNSET,
    current_time: datetime.datetime | None | Unset = UNSET,
) -> AbyssArtifactStateReadListResp | HTTPValidationError | None:
    """Abyssartifactstates.List Abyss Artifact States

    Args:
        season (UUID):
        map_ (str):
        server_matching_id (None | Unset | UUID):
        current_time (datetime.datetime | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AbyssArtifactStateReadListResp | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            season=season,
            map_=map_,
            client=client,
            server_matching_id=server_matching_id,
            current_time=current_time,
        )
    ).parsed
