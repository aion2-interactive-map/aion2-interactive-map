from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.marker_translation_read_resp import MarkerTranslationReadResp
from ...models.marker_translation_update import MarkerTranslationUpdate
from ...types import Response


def _get_kwargs(
    map_: str,
    marker: UUID,
    language: str,
    *,
    body: MarkerTranslationUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": f"/api/v1/maps/{map_}/markers/{marker}/translations/{language}",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | MarkerTranslationReadResp | None:
    if response.status_code == 200:
        response_200 = MarkerTranslationReadResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | MarkerTranslationReadResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    map_: str,
    marker: UUID,
    language: str,
    *,
    client: AuthenticatedClient,
    body: MarkerTranslationUpdate,
) -> Response[HTTPValidationError | MarkerTranslationReadResp]:
    """Markertranslations.Update Marker Translation

    Args:
        map_ (str):
        marker (UUID):
        language (str):
        body (MarkerTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MarkerTranslationReadResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        marker=marker,
        language=language,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    marker: UUID,
    language: str,
    *,
    client: AuthenticatedClient,
    body: MarkerTranslationUpdate,
) -> HTTPValidationError | MarkerTranslationReadResp | None:
    """Markertranslations.Update Marker Translation

    Args:
        map_ (str):
        marker (UUID):
        language (str):
        body (MarkerTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MarkerTranslationReadResp
    """

    return sync_detailed(
        map_=map_,
        marker=marker,
        language=language,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    map_: str,
    marker: UUID,
    language: str,
    *,
    client: AuthenticatedClient,
    body: MarkerTranslationUpdate,
) -> Response[HTTPValidationError | MarkerTranslationReadResp]:
    """Markertranslations.Update Marker Translation

    Args:
        map_ (str):
        marker (UUID):
        language (str):
        body (MarkerTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MarkerTranslationReadResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        marker=marker,
        language=language,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    marker: UUID,
    language: str,
    *,
    client: AuthenticatedClient,
    body: MarkerTranslationUpdate,
) -> HTTPValidationError | MarkerTranslationReadResp | None:
    """Markertranslations.Update Marker Translation

    Args:
        map_ (str):
        marker (UUID):
        language (str):
        body (MarkerTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MarkerTranslationReadResp
    """

    return (
        await asyncio_detailed(
            map_=map_,
            marker=marker,
            language=language,
            client=client,
            body=body,
        )
    ).parsed
