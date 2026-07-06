from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.category_translation_read_resp import CategoryTranslationReadResp
from ...models.category_translation_update import CategoryTranslationUpdate
from ...models.http_validation_error import HTTPValidationError
from ...types import Response


def _get_kwargs(
    category: str,
    language: str,
    *,
    body: CategoryTranslationUpdate,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": f"/api/v1/categories/{category}/translations/{language}",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> CategoryTranslationReadResp | HTTPValidationError | None:
    if response.status_code == 200:
        response_200 = CategoryTranslationReadResp.from_dict(response.json())

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
) -> Response[CategoryTranslationReadResp | HTTPValidationError]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    category: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: CategoryTranslationUpdate,
) -> Response[CategoryTranslationReadResp | HTTPValidationError]:
    """Categorytranslations.Update Category Translation

    Args:
        category (str):
        language (str):
        body (CategoryTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CategoryTranslationReadResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        category=category,
        language=language,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    category: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: CategoryTranslationUpdate,
) -> CategoryTranslationReadResp | HTTPValidationError | None:
    """Categorytranslations.Update Category Translation

    Args:
        category (str):
        language (str):
        body (CategoryTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CategoryTranslationReadResp | HTTPValidationError
    """

    return sync_detailed(
        category=category,
        language=language,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    category: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: CategoryTranslationUpdate,
) -> Response[CategoryTranslationReadResp | HTTPValidationError]:
    """Categorytranslations.Update Category Translation

    Args:
        category (str):
        language (str):
        body (CategoryTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[CategoryTranslationReadResp | HTTPValidationError]
    """

    kwargs = _get_kwargs(
        category=category,
        language=language,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    category: str,
    language: str,
    *,
    client: AuthenticatedClient,
    body: CategoryTranslationUpdate,
) -> CategoryTranslationReadResp | HTTPValidationError | None:
    """Categorytranslations.Update Category Translation

    Args:
        category (str):
        language (str):
        body (CategoryTranslationUpdate):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CategoryTranslationReadResp | HTTPValidationError
    """

    return (
        await asyncio_detailed(
            category=category,
            language=language,
            client=client,
            body=body,
        )
    ).parsed
