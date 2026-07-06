from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.marker_read import MarkerRead


T = TypeVar("T", bound="AbyssArtifactReadDetail")


@_attrs_define
class AbyssArtifactReadDetail:
    """
    Attributes:
        id (UUID):
        marker_id (UUID):
        order (int):
        marker (MarkerRead):
    """

    id: UUID
    marker_id: UUID
    order: int
    marker: MarkerRead
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        marker_id = str(self.marker_id)

        order = self.order

        marker = self.marker.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "markerId": marker_id,
                "order": order,
                "marker": marker,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.marker_read import MarkerRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        marker_id = UUID(d.pop("markerId"))

        order = d.pop("order")

        marker = MarkerRead.from_dict(d.pop("marker"))

        abyss_artifact_read_detail = cls(
            id=id,
            marker_id=marker_id,
            order=order,
            marker=marker,
        )

        abyss_artifact_read_detail.additional_properties = d
        return abyss_artifact_read_detail

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
