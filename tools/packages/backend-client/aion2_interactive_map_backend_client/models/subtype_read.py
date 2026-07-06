from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="SubtypeRead")


@_attrs_define
class SubtypeRead:
    """
    Attributes:
        id (UUID):
        name (str):
        color (str):
        icon (str):
        icon_scale (float):
        hide_tooltip (bool):
        order (int):
        can_complete (bool):
    """

    id: UUID
    name: str
    color: str
    icon: str
    icon_scale: float
    hide_tooltip: bool
    order: int
    can_complete: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        name = self.name

        color = self.color

        icon = self.icon

        icon_scale = self.icon_scale

        hide_tooltip = self.hide_tooltip

        order = self.order

        can_complete = self.can_complete

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
                "color": color,
                "icon": icon,
                "iconScale": icon_scale,
                "hideTooltip": hide_tooltip,
                "order": order,
                "canComplete": can_complete,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        name = d.pop("name")

        color = d.pop("color")

        icon = d.pop("icon")

        icon_scale = d.pop("iconScale")

        hide_tooltip = d.pop("hideTooltip")

        order = d.pop("order")

        can_complete = d.pop("canComplete")

        subtype_read = cls(
            id=id,
            name=name,
            color=color,
            icon=icon,
            icon_scale=icon_scale,
            hide_tooltip=hide_tooltip,
            order=order,
            can_complete=can_complete,
        )

        subtype_read.additional_properties = d
        return subtype_read

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
