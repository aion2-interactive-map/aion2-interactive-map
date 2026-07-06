from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.body_marker_feedback_create_marker_feedback_api_v1_maps_map_marker_feedbacks_post import (
    BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost,
)
from ...models.http_validation_error import HTTPValidationError
from ...models.marker_feedback_read_resp import MarkerFeedbackReadResp
from ...types import Response


def _get_kwargs(
    map_: str,
    *,
    body: BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": f"/api/v1/maps/{map_}/marker_feedbacks",
    }

    _kwargs["files"] = body.to_multipart()

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> HTTPValidationError | MarkerFeedbackReadResp | None:
    if response.status_code == 200:
        response_200 = MarkerFeedbackReadResp.from_dict(response.json())

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
) -> Response[HTTPValidationError | MarkerFeedbackReadResp]:
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
    body: BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost,
) -> Response[HTTPValidationError | MarkerFeedbackReadResp]:
    """Markerfeedback.Create Marker Feedback

    Args:
        map_ (str):
        body (BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MarkerFeedbackReadResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    *,
    client: AuthenticatedClient,
    body: BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost,
) -> HTTPValidationError | MarkerFeedbackReadResp | None:
    """Markerfeedback.Create Marker Feedback

    Args:
        map_ (str):
        body (BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MarkerFeedbackReadResp
    """

    return sync_detailed(
        map_=map_,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    map_: str,
    *,
    client: AuthenticatedClient,
    body: BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost,
) -> Response[HTTPValidationError | MarkerFeedbackReadResp]:
    """Markerfeedback.Create Marker Feedback

    Args:
        map_ (str):
        body (BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MarkerFeedbackReadResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    *,
    client: AuthenticatedClient,
    body: BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost,
) -> HTTPValidationError | MarkerFeedbackReadResp | None:
    """Markerfeedback.Create Marker Feedback

    Args:
        map_ (str):
        body (BodyMarkerFeedbackCreateMarkerFeedbackApiV1MapsMapMarkerFeedbacksPost):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MarkerFeedbackReadResp
    """

    return (
        await asyncio_detailed(
            map_=map_,
            client=client,
            body=body,
        )
    ).parsed
