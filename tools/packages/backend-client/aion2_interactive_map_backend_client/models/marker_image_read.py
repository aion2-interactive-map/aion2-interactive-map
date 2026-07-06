from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.image_read import ImageRead


T = TypeVar("T", bound="MarkerImageRead")


@_attrs_define
class MarkerImageRead:
    """
    Attributes:
        id (UUID):
        marker_id (UUID):
        image_id (UUID):
        image (ImageRead):
        order (int):
    """

    id: UUID
    marker_id: UUID
    image_id: UUID
    image: ImageRead
    order: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        marker_id = str(self.marker_id)

        image_id = str(self.image_id)

        image = self.image.to_dict()

        order = self.order

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "markerId": marker_id,
                "imageId": image_id,
                "image": image,
                "order": order,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.image_read import ImageRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        marker_id = UUID(d.pop("markerId"))

        image_id = UUID(d.pop("imageId"))

        image = ImageRead.from_dict(d.pop("image"))

        order = d.pop("order")

        marker_image_read = cls(
            id=id,
            marker_id=marker_id,
            image_id=image_id,
            image=image,
            order=order,
        )

        marker_image_read.additional_properties = d
        return marker_image_read

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
