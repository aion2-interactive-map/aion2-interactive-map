from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.region_translation_read_resp import RegionTranslationReadResp
from ...models.region_translation_update import RegionTranslationUpdate
from ...types import Response


def _get_kwargs(
    map_: str,
    region: str,
    language: str,
    *,
    body: RegionTranslationUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": f"/api/v1/maps/{map_}/regions/{region}/translations/{language}",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | RegionTranslationReadResp | None:
    if response.status_code == 200:
        response_200 = RegionTranslationReadResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | RegionTranslationReadResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    map_: str,
    region: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: RegionTranslationUpdate,
) -> Response[HTTPValidationError | RegionTranslationReadResp]:
    """Regiontranslations.Update Region Translation

    Args:
        map_ (str):
        region (str):
        language (str):
        body (RegionTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | RegionTranslationReadResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        region=region,
        language=language,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    region: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: RegionTranslationUpdate,
) -> HTTPValidationError | RegionTranslationReadResp | None:
    """Regiontranslations.Update Region Translation

    Args:
        map_ (str):
        region (str):
        language (str):
        body (RegionTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | RegionTranslationReadResp
    """

    return sync_detailed(
        map_=map_,
        region=region,
        language=language,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    map_: str,
    region: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: RegionTranslationUpdate,
) -> Response[HTTPValidationError | RegionTranslationReadResp]:
    """Regiontranslations.Update Region Translation

    Args:
        map_ (str):
        region (str):
        language (str):
        body (RegionTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | RegionTranslationReadResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        region=region,
        language=language,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    region: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: RegionTranslationUpdate,
) -> HTTPValidationError | RegionTranslationReadResp | None:
    """Regiontranslations.Update Region Translation

    Args:
        map_ (str):
        region (str):
        language (str):
        body (RegionTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | RegionTranslationReadResp
    """

    return (
        await asyncio_detailed(
            map_=map_,
            region=region,
            language=language,
            client=client,
            body=body,
        )
    ).parsed
