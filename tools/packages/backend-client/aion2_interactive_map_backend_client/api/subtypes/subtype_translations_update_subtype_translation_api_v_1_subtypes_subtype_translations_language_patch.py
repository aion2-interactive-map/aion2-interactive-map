from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.subtype_translation_read_resp import SubtypeTranslationReadResp
from ...models.subtype_translation_update import SubtypeTranslationUpdate
from ...types import Response


def _get_kwargs(
    subtype: str,
    language: str,
    *,
    body: SubtypeTranslationUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": f"/api/v1/subtypes/{subtype}/translations/{language}",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | SubtypeTranslationReadResp | None:
    if response.status_code == 200:
        response_200 = SubtypeTranslationReadResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | SubtypeTranslationReadResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    subtype: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: SubtypeTranslationUpdate,
) -> Response[HTTPValidationError | SubtypeTranslationReadResp]:
    """Subtypetranslations.Update Subtype Translation

    Args:
        subtype (str):
        language (str):
        body (SubtypeTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | SubtypeTranslationReadResp]
    """

    kwargs = _get_kwargs(
        subtype=subtype,
        language=language,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    subtype: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: SubtypeTranslationUpdate,
) -> HTTPValidationError | SubtypeTranslationReadResp | None:
    """Subtypetranslations.Update Subtype Translation

    Args:
        subtype (str):
        language (str):
        body (SubtypeTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | SubtypeTranslationReadResp
    """

    return sync_detailed(
        subtype=subtype,
        language=language,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    subtype: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: SubtypeTranslationUpdate,
) -> Response[HTTPValidationError | SubtypeTranslationReadResp]:
    """Subtypetranslations.Update Subtype Translation

    Args:
        subtype (str):
        language (str):
        body (SubtypeTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | SubtypeTranslationReadResp]
    """

    kwargs = _get_kwargs(
        subtype=subtype,
        language=language,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    subtype: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: SubtypeTranslationUpdate,
) -> HTTPValidationError | SubtypeTranslationReadResp | None:
    """Subtypetranslations.Update Subtype Translation

    Args:
        subtype (str):
        language (str):
        body (SubtypeTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | SubtypeTranslationReadResp
    """

    return (
        await asyncio_detailed(
            subtype=subtype,
            language=language,
            client=client,
            body=body,
        )
    ).parsed
