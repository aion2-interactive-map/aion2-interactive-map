from http import HTTPStatus
from typing import Any
from uuid import UUID

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.http_validation_error import HTTPValidationError
from ...models.marker_feedback_read_resp import MarkerFeedbackReadResp
from ...models.marker_feedback_reply import MarkerFeedbackReply
from ...types import Response


def _get_kwargs(
    map_: str,
    feedback: UUID,
    *,
    body: MarkerFeedbackReply,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": f"/api/v1/maps/{map_}/marker_feedbacks/{feedback}",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

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
    feedback: UUID,
    *,
    client: AuthenticatedClient,
    body: MarkerFeedbackReply,
) -> Response[HTTPValidationError | MarkerFeedbackReadResp]:
    """Markerfeedback.Reply Marker Feedback

    Args:
        map_ (str):
        feedback (UUID):
        body (MarkerFeedbackReply):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MarkerFeedbackReadResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        feedback=feedback,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    map_: str,
    feedback: UUID,
    *,
    client: AuthenticatedClient,
    body: MarkerFeedbackReply,
) -> HTTPValidationError | MarkerFeedbackReadResp | None:
    """Markerfeedback.Reply Marker Feedback

    Args:
        map_ (str):
        feedback (UUID):
        body (MarkerFeedbackReply):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MarkerFeedbackReadResp
    """

    return sync_detailed(
        map_=map_,
        feedback=feedback,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    map_: str,
    feedback: UUID,
    *,
    client: AuthenticatedClient,
    body: MarkerFeedbackReply,
) -> Response[HTTPValidationError | MarkerFeedbackReadResp]:
    """Markerfeedback.Reply Marker Feedback

    Args:
        map_ (str):
        feedback (UUID):
        body (MarkerFeedbackReply):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[HTTPValidationError | MarkerFeedbackReadResp]
    """

    kwargs = _get_kwargs(
        map_=map_,
        feedback=feedback,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    map_: str,
    feedback: UUID,
    *,
    client: AuthenticatedClient,
    body: MarkerFeedbackReply,
) -> HTTPValidationError | MarkerFeedbackReadResp | None:
    """Markerfeedback.Reply Marker Feedback

    Args:
        map_ (str):
        feedback (UUID):
        body (MarkerFeedbackReply):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        HTTPValidationError | MarkerFeedbackReadResp
    """

    return (
        await asyncio_detailed(
            map_=map_,
            feedback=feedback,
            client=client,
            body=body,
        )
    ).parsed
