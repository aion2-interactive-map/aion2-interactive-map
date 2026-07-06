from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.marker_feedback_read_list_resp import MarkerFeedbackReadListResp
from ...types import UNSET, Response, Unset


def _get_kwargs(
    map_: str,
    *,
    admin: bool | Unset = False,
    limit: int | Unset = 100,
    offset: int | Unset = 0,
) -> dict[str, Any]:
    params: dict[str, Any] = {}

    params["admin"] = admin

    params["limit"] = limit

    params["offset"] = offset

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": f"/api/v1/maps/{map_}/marker_feedbacks",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | MarkerFeedbackReadListResp | None:
    if response.status_code == 200:
        response_200 = MarkerFeedbackReadListResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | MarkerFeedbackReadListResp]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    map_: str,
    *,
    client: AuthenticatedClient,
    admin: bool | Unset = False,
    limit: int | Unset = 100,
    offset: int | Unset = 0,
) -> Response[HTTPValidationError | MarkerFeedbackReadListResp]:
    """Markerfeedback.List Marker Feedbacks

    Args:
        map_ (str):
        admin (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 100.
        offset (int | Unset):  Default: 0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MarkerFeedbackReadListResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        admin=admin,
        limit=limit,
        offset=offset,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    *,
    client: AuthenticatedClient,
    admin: bool | Unset = False,
    limit: int | Unset = 100,
    offset: int | Unset = 0,
) -> HTTPValidationError | MarkerFeedbackReadListResp | None:
    """Markerfeedback.List Marker Feedbacks

    Args:
        map_ (str):
        admin (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 100.
        offset (int | Unset):  Default: 0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MarkerFeedbackReadListResp
    """

    return sync_detailed(
        map_=map_,
        client=client,
        admin=admin,
        limit=limit,
        offset=offset,
    ).parsed


async def asyncio_detailed(
    map_: str,
    *,
    client: AuthenticatedClient,
    admin: bool | Unset = False,
    limit: int | Unset = 100,
    offset: int | Unset = 0,
) -> Response[HTTPValidationError | MarkerFeedbackReadListResp]:
    """Markerfeedback.List Marker Feedbacks

    Args:
        map_ (str):
        admin (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 100.
        offset (int | Unset):  Default: 0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MarkerFeedbackReadListResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        admin=admin,
        limit=limit,
        offset=offset,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    *,
    client: AuthenticatedClient,
    admin: bool | Unset = False,
    limit: int | Unset = 100,
    offset: int | Unset = 0,
) -> HTTPValidationError | MarkerFeedbackReadListResp | None:
    """Markerfeedback.List Marker Feedbacks

    Args:
        map_ (str):
        admin (bool | Unset):  Default: False.
        limit (int | Unset):  Default: 100.
        offset (int | Unset):  Default: 0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MarkerFeedbackReadListResp
    """

    return (
        await asyncio_detailed(
            map_=map_,
            client=client,
            admin=admin,
            limit=limit,
            offset=offset,
        )
    ).parsed
