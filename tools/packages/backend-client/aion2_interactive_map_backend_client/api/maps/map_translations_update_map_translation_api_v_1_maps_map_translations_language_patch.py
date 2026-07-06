from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.map_translation_read_resp import MapTranslationReadResp
from ...models.map_translation_update import MapTranslationUpdate
from ...types import Response


def _get_kwargs(
    map_: str,
    language: str,
    *,
    body: MapTranslationUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": f"/api/v1/maps/{map_}/translations/{language}",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | MapTranslationReadResp | None:
    if response.status_code == 200:
        response_200 = MapTranslationReadResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | MapTranslationReadResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    map_: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: MapTranslationUpdate,
) -> Response[HTTPValidationError | MapTranslationReadResp]:
    """Maptranslations.Update Map Translation

    Args:
        map_ (str):
        language (str):
        body (MapTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MapTranslationReadResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        language=language,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: MapTranslationUpdate,
) -> HTTPValidationError | MapTranslationReadResp | None:
    """Maptranslations.Update Map Translation

    Args:
        map_ (str):
        language (str):
        body (MapTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MapTranslationReadResp
    """

    return sync_detailed(
        map_=map_,
        language=language,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    map_: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: MapTranslationUpdate,
) -> Response[HTTPValidationError | MapTranslationReadResp]:
    """Maptranslations.Update Map Translation

    Args:
        map_ (str):
        language (str):
        body (MapTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MapTranslationReadResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        language=language,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: MapTranslationUpdate,
) -> HTTPValidationError | MapTranslationReadResp | None:
    """Maptranslations.Update Map Translation

    Args:
        map_ (str):
        language (str):
        body (MapTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MapTranslationReadResp
    """

    return (
        await asyncio_detailed(
            map_=map_,
            language=language,
            client=client,
            body=body,
        )
    ).parsed
