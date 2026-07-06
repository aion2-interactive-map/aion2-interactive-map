from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.abyss_artifact_state_read_resp import AbyssArtifactStateReadResp
from ...models.abyss_artifact_vote_create import AbyssArtifactVoteCreate
from ...models.http_validation_error import HTTPValidationError
from ...types import Response


def _get_kwargs(
    season: UUID,
    map_: str,
    state: UUID,
    *,
    body: AbyssArtifactVoteCreate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": f"/api/v1/seasons/{season}/maps/{map_}/artifacts/states/{state}/vote",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AbyssArtifactStateReadResp | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = AbyssArtifactStateReadResp.from_dict(response.json())

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
) -> Response[AbyssArtifactStateReadResp | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    season: UUID,
    map_: str,
    state: UUID,
    *,
    client: AuthenticatedClient,
    body: AbyssArtifactVoteCreate,
) -> Response[AbyssArtifactStateReadResp | HTTPValidationError]:
    """Abyssartifactstates.Vote Abyss Artifact State

    Args:
        season (UUID):
        map_ (str):
        state (UUID):
        body (AbyssArtifactVoteCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AbyssArtifactStateReadResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        season=season,
        map_=map_,
        state=state,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    season: UUID,
    map_: str,
    state: UUID,
    *,
    client: AuthenticatedClient,
    body: AbyssArtifactVoteCreate,
) -> AbyssArtifactStateReadResp | HTTPValidationError | None:
    """Abyssartifactstates.Vote Abyss Artifact State

    Args:
        season (UUID):
        map_ (str):
        state (UUID):
        body (AbyssArtifactVoteCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AbyssArtifactStateReadResp | HTTPValidationError
    """

    return sync_detailed(
        season=season,
        map_=map_,
        state=state,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    season: UUID,
    map_: str,
    state: UUID,
    *,
    client: AuthenticatedClient,
    body: AbyssArtifactVoteCreate,
) -> Response[AbyssArtifactStateReadResp | HTTPValidationError]:
    """Abyssartifactstates.Vote Abyss Artifact State

    Args:
        season (UUID):
        map_ (str):
        state (UUID):
        body (AbyssArtifactVoteCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AbyssArtifactStateReadResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        season=season,
        map_=map_,
        state=state,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    season: UUID,
    map_: str,
    state: UUID,
    *,
    client: AuthenticatedClient,
    body: AbyssArtifactVoteCreate,
) -> AbyssArtifactStateReadResp | HTTPValidationError | None:
    """Abyssartifactstates.Vote Abyss Artifact State

    Args:
        season (UUID):
        map_ (str):
        state (UUID):
        body (AbyssArtifactVoteCreate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AbyssArtifactStateReadResp | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            season=season,
            map_=map_,
            state=state,
            client=client,
            body=body,
        )
    ).parsed
