from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.abyss_artifact_read_detail_resp import AbyssArtifactReadDetailResp
from ...models.http_validation_error import HTTPValidationError
from ...types import Response


def _get_kwargs(
    map_: str,
    abyss_artifact: UUID,
) -> dict[str, Any]:
    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": f"/api/v1/maps/{map_}/artifacts/{abyss_artifact}",
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AbyssArtifactReadDetailResp | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = AbyssArtifactReadDetailResp.from_dict(response.json())

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
) -> Response[AbyssArtifactReadDetailResp | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    map_: str,
    abyss_artifact: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> Response[AbyssArtifactReadDetailResp | HTTPValidationError]:
    """Abyssartifacts.Get Abyss Artifact

    Args:
        map_ (str):
        abyss_artifact (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AbyssArtifactReadDetailResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        map_=map_,
        abyss_artifact=abyss_artifact,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    abyss_artifact: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> AbyssArtifactReadDetailResp | HTTPValidationError | None:
    """Abyssartifacts.Get Abyss Artifact

    Args:
        map_ (str):
        abyss_artifact (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AbyssArtifactReadDetailResp | HTTPValidationError
    """

    return sync_detailed(
        map_=map_,
        abyss_artifact=abyss_artifact,
        client=client,
    ).parsed


async def asyncio_detailed(
    map_: str,
    abyss_artifact: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> Response[AbyssArtifactReadDetailResp | HTTPValidationError]:
    """Abyssartifacts.Get Abyss Artifact

    Args:
        map_ (str):
        abyss_artifact (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AbyssArtifactReadDetailResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        map_=map_,
        abyss_artifact=abyss_artifact,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    abyss_artifact: UUID,
    *,
    client: AuthenticatedClient | Client,
) -> AbyssArtifactReadDetailResp | HTTPValidationError | None:
    """Abyssartifacts.Get Abyss Artifact

    Args:
        map_ (str):
        abyss_artifact (UUID):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AbyssArtifactReadDetailResp | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            map_=map_,
            abyss_artifact=abyss_artifact,
            client=client,
        )
    ).parsed
