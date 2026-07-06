from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.abyss_artifact_contributor_read import AbyssArtifactContributorRead
    from ..models.abyss_artifact_state_info import AbyssArtifactStateInfo


T = TypeVar("T", bound="AbyssArtifactStateRead")


@_attrs_define
class AbyssArtifactStateRead:
    """
    Attributes:
        id (UUID):
        map_id (UUID):
        server_matching_id (UUID):
        states (list[AbyssArtifactStateInfo]):
        record_time (datetime.datetime):
        is_verified (bool):
        contributors (list[AbyssArtifactContributorRead]):
        upvotes_count (int | Unset):  Default: 0.
        downvotes_count (int | Unset):  Default: 0.
        user_vote (bool | None | Unset):
    """

    id: UUID
    map_id: UUID
    server_matching_id: UUID
    states: list[AbyssArtifactStateInfo]
    record_time: datetime.datetime
    is_verified: bool
    contributors: list[AbyssArtifactContributorRead]
    upvotes_count: int | Unset = 0
    downvotes_count: int | Unset = 0
    user_vote: bool | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        map_id = str(self.map_id)

        server_matching_id = str(self.server_matching_id)

        states = []
        for states_item_data in self.states:
            states_item = states_item_data.to_dict()
            states.append(states_item)

        record_time = self.record_time.isoformat()

        is_verified = self.is_verified

        contributors = []
        for contributors_item_data in self.contributors:
            contributors_item = contributors_item_data.to_dict()
            contributors.append(contributors_item)

        upvotes_count = self.upvotes_count

        downvotes_count = self.downvotes_count

        user_vote: bool | None | Unset
        if isinstance(self.user_vote, Unset):
            user_vote = UNSET
        else:
            user_vote = self.user_vote

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "mapId": map_id,
                "serverMatchingId": server_matching_id,
                "states": states,
                "recordTime": record_time,
                "isVerified": is_verified,
                "contributors": contributors,
            }
        )
        if upvotes_count is not UNSET:
            field_dict["upvotesCount"] = upvotes_count
        if downvotes_count is not UNSET:
            field_dict["downvotesCount"] = downvotes_count
        if user_vote is not UNSET:
            field_dict["userVote"] = user_vote

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.abyss_artifact_contributor_read import AbyssArtifactContributorRead
        from ..models.abyss_artifact_state_info import AbyssArtifactStateInfo

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        map_id = UUID(d.pop("mapId"))

        server_matching_id = UUID(d.pop("serverMatchingId"))

        states = []
        _states = d.pop("states")
        for states_item_data in _states:
            states_item = AbyssArtifactStateInfo.from_dict(states_item_data)

            states.append(states_item)

        record_time = isoparse(d.pop("recordTime"))

        is_verified = d.pop("isVerified")

        contributors = []
        _contributors = d.pop("contributors")
        for contributors_item_data in _contributors:
            contributors_item = AbyssArtifactContributorRead.from_dict(contributors_item_data)

            contributors.append(contributors_item)

        upvotes_count = d.pop("upvotesCount", UNSET)

        downvotes_count = d.pop("downvotesCount", UNSET)

        def _parse_user_vote(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        user_vote = _parse_user_vote(d.pop("userVote", UNSET))

        abyss_artifact_state_read = cls(
            id=id,
            map_id=map_id,
            server_matching_id=server_matching_id,
            states=states,
            record_time=record_time,
            is_verified=is_verified,
            contributors=contributors,
            upvotes_count=upvotes_count,
            downvotes_count=downvotes_count,
            user_vote=user_vote,
        )

        abyss_artifact_state_read.additional_properties = d
        return abyss_artifact_state_read

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
