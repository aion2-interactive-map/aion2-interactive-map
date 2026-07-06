from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="ImageRead")


@_attrs_define
class ImageRead:
    """
    Attributes:
        id (UUID):
        s_3_key (str):
        height (int):
        width (int):
    """

    id: UUID
    s_3_key: str
    height: int
    width: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        s_3_key = self.s_3_key

        height = self.height

        width = self.width

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "s3Key": s_3_key,
                "height": height,
                "width": width,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        s_3_key = d.pop("s3Key")

        height = d.pop("height")

        width = d.pop("width")

        image_read = cls(
            id=id,
            s_3_key=s_3_key,
            height=height,
            width=width,
        )

        image_read.additional_properties = d
        return image_read

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
