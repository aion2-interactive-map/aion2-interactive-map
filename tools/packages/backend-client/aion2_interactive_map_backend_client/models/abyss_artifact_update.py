from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="AbyssArtifactUpdate")


@_attrs_define
class AbyssArtifactUpdate:
    """
    Attributes:
        marker_id (None | Unset | UUID):
        order (int | None | Unset):
    """

    marker_id: None | Unset | UUID = UNSET
    order: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        marker_id: None | str | Unset
        if isinstance(self.marker_id, Unset):
            marker_id = UNSET
        elif isinstance(self.marker_id, UUID):
            marker_id = str(self.marker_id)
        else:
            marker_id = self.marker_id

        order: int | None | Unset
        if isinstance(self.order, Unset):
            order = UNSET
        else:
            order = self.order

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if marker_id is not UNSET:
            field_dict["markerId"] = marker_id
        if order is not UNSET:
            field_dict["order"] = order

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_marker_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                marker_id_type_0 = UUID(data)

                return marker_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        marker_id = _parse_marker_id(d.pop("markerId", UNSET))

        def _parse_order(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        order = _parse_order(d.pop("order", UNSET))

        abyss_artifact_update = cls(
            marker_id=marker_id,
            order=order,
        )

        abyss_artifact_update.additional_properties = d
        return abyss_artifact_update

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
