from __future__ import annotations

from collections.abc import Mapping
from io import BytesIO
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import File

T = TypeVar("T", bound="UserMarkerProgressRead")


@_attrs_define
class UserMarkerProgressRead:
    """
    Attributes:
        id (UUID):
        user_id (UUID):
        map_id (UUID):
        subtype_id (UUID):
        bitset (File):
    """

    id: UUID
    user_id: UUID
    map_id: UUID
    subtype_id: UUID
    bitset: File
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        user_id = str(self.user_id)

        map_id = str(self.map_id)

        subtype_id = str(self.subtype_id)

        bitset = self.bitset.to_tuple()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "userId": user_id,
                "mapId": map_id,
                "subtypeId": subtype_id,
                "bitset": bitset,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        user_id = UUID(d.pop("userId"))

        map_id = UUID(d.pop("mapId"))

        subtype_id = UUID(d.pop("subtypeId"))

        bitset = File(payload=BytesIO(d.pop("bitset")))

        user_marker_progress_read = cls(
            id=id,
            user_id=user_id,
            map_id=map_id,
            subtype_id=subtype_id,
            bitset=bitset,
        )

        user_marker_progress_read.additional_properties = d
        return user_marker_progress_read

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
