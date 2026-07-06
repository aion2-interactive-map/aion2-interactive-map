from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.season_read_resp import SeasonReadResp
from ...models.season_update import SeasonUpdate
from ...types import Response


def _get_kwargs(
    season: UUID,
    *,
    body: SeasonUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": f"/api/v1/seasons/{season}",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | SeasonReadResp | None:
    if response.status_code == 200:
        response_200 = SeasonReadResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | SeasonReadResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    season: UUID,
    *,
    client: AuthenticatedClient,
    body: SeasonUpdate,
) -> Response[HTTPValidationError | SeasonReadResp]:
    """Seasons.Update Season

    Args:
        season (UUID):
        body (SeasonUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | SeasonReadResp]
    """

    kwargs = _get_kwargs(
        season=season,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    season: UUID,
    *,
    client: AuthenticatedClient,
    body: SeasonUpdate,
) -> HTTPValidationError | SeasonReadResp | None:
    """Seasons.Update Season

    Args:
        season (UUID):
        body (SeasonUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | SeasonReadResp
    """

    return sync_detailed(
        season=season,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    season: UUID,
    *,
    client: AuthenticatedClient,
    body: SeasonUpdate,
) -> Response[HTTPValidationError | SeasonReadResp]:
    """Seasons.Update Season

    Args:
        season (UUID):
        body (SeasonUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | SeasonReadResp]
    """

    kwargs = _get_kwargs(
        season=season,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    season: UUID,
    *,
    client: AuthenticatedClient,
    body: SeasonUpdate,
) -> HTTPValidationError | SeasonReadResp | None:
    """Seasons.Update Season

    Args:
        season (UUID):
        body (SeasonUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | SeasonReadResp
    """

    return (
        await asyncio_detailed(
            season=season,
            client=client,
            body=body,
        )
    ).parsed
