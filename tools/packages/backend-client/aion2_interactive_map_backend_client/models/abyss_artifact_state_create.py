from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

if TYPE_CHECKING:
    from ..models.abyss_artifact_state_info import AbyssArtifactStateInfo


T = TypeVar("T", bound="AbyssArtifactStateCreate")


@_attrs_define
class AbyssArtifactStateCreate:
    """
    Attributes:
        server_matching_id (UUID):
        states (list[AbyssArtifactStateInfo]):
        record_time (datetime.datetime):
    """

    server_matching_id: UUID
    states: list[AbyssArtifactStateInfo]
    record_time: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        server_matching_id = str(self.server_matching_id)

        states = []
        for states_item_data in self.states:
            states_item = states_item_data.to_dict()
            states.append(states_item)

        record_time = self.record_time.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "serverMatchingId": server_matching_id,
                "states": states,
                "recordTime": record_time,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.abyss_artifact_state_info import AbyssArtifactStateInfo

        d = dict(src_dict)
        server_matching_id = UUID(d.pop("serverMatchingId"))

        states = []
        _states = d.pop("states")
        for states_item_data in _states:
            states_item = AbyssArtifactStateInfo.from_dict(states_item_data)

            states.append(states_item)

        record_time = isoparse(d.pop("recordTime"))

        abyss_artifact_state_create = cls(
            server_matching_id=server_matching_id,
            states=states,
            record_time=record_time,
        )

        abyss_artifact_state_create.additional_properties = d
        return abyss_artifact_state_create

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
