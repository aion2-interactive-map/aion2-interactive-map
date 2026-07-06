from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.abyss_artifact_state_info import AbyssArtifactStateInfo


T = TypeVar("T", bound="AbyssArtifactStateUpdate")


@_attrs_define
class AbyssArtifactStateUpdate:
    """
    Attributes:
        states (list[AbyssArtifactStateInfo] | None | Unset):
        record_time (datetime.datetime | None | Unset):
        is_verified (bool | None | Unset):
    """

    states: list[AbyssArtifactStateInfo] | None | Unset = UNSET
    record_time: datetime.datetime | None | Unset = UNSET
    is_verified: bool | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        states: list[dict[str, Any]] | None | Unset
        if isinstance(self.states, Unset):
            states = UNSET
        elif isinstance(self.states, list):
            states = []
            for states_type_0_item_data in self.states:
                states_type_0_item = states_type_0_item_data.to_dict()
                states.append(states_type_0_item)

        else:
            states = self.states

        record_time: None | str | Unset
        if isinstance(self.record_time, Unset):
            record_time = UNSET
        elif isinstance(self.record_time, datetime.datetime):
            record_time = self.record_time.isoformat()
        else:
            record_time = self.record_time

        is_verified: bool | None | Unset
        if isinstance(self.is_verified, Unset):
            is_verified = UNSET
        else:
            is_verified = self.is_verified

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if states is not UNSET:
            field_dict["states"] = states
        if record_time is not UNSET:
            field_dict["recordTime"] = record_time
        if is_verified is not UNSET:
            field_dict["isVerified"] = is_verified

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.abyss_artifact_state_info import AbyssArtifactStateInfo

        d = dict(src_dict)

        def _parse_states(data: object) -> list[AbyssArtifactStateInfo] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                states_type_0 = []
                _states_type_0 = data
                for states_type_0_item_data in _states_type_0:
                    states_type_0_item = AbyssArtifactStateInfo.from_dict(states_type_0_item_data)

                    states_type_0.append(states_type_0_item)

                return states_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[AbyssArtifactStateInfo] | None | Unset, data)

        states = _parse_states(d.pop("states", UNSET))

        def _parse_record_time(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                record_time_type_0 = isoparse(data)

                return record_time_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        record_time = _parse_record_time(d.pop("recordTime", UNSET))

        def _parse_is_verified(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_verified = _parse_is_verified(d.pop("isVerified", UNSET))

        abyss_artifact_state_update = cls(
            states=states,
            record_time=record_time,
            is_verified=is_verified,
        )

        abyss_artifact_state_update.additional_properties = d
        return abyss_artifact_state_update

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
