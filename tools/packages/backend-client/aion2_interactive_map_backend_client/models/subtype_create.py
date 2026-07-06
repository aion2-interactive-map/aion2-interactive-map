from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="SubtypeCreate")


@_attrs_define
class SubtypeCreate:
    """
    Attributes:
        name (str):
        color (str):
        icon (str):
        order (int):
        icon_scale (float | Unset):  Default: 1.0.
        hide_tooltip (bool | Unset):  Default: False.
        can_complete (bool | Unset):  Default: False.
        category_id (None | str | Unset | UUID):
    """

    name: str
    color: str
    icon: str
    order: int
    icon_scale: float | Unset = 1.0
    hide_tooltip: bool | Unset = False
    can_complete: bool | Unset = False
    category_id: None | str | Unset | UUID = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        color = self.color

        icon = self.icon

        order = self.order

        icon_scale = self.icon_scale

        hide_tooltip = self.hide_tooltip

        can_complete = self.can_complete

        category_id: None | str | Unset
        if isinstance(self.category_id, Unset):
            category_id = UNSET
        elif isinstance(self.category_id, UUID):
            category_id = str(self.category_id)
        else:
            category_id = self.category_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "color": color,
                "icon": icon,
                "order": order,
            }
        )
        if icon_scale is not UNSET:
            field_dict["iconScale"] = icon_scale
        if hide_tooltip is not UNSET:
            field_dict["hideTooltip"] = hide_tooltip
        if can_complete is not UNSET:
            field_dict["canComplete"] = can_complete
        if category_id is not UNSET:
            field_dict["categoryId"] = category_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        color = d.pop("color")

        icon = d.pop("icon")

        order = d.pop("order")

        icon_scale = d.pop("iconScale", UNSET)

        hide_tooltip = d.pop("hideTooltip", UNSET)

        can_complete = d.pop("canComplete", UNSET)

        def _parse_category_id(data: object) -> None | str | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                category_id_type_1 = UUID(data)

                return category_id_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | str | Unset | UUID, data)

        category_id = _parse_category_id(d.pop("categoryId", UNSET))

        subtype_create = cls(
            name=name,
            color=color,
            icon=icon,
            order=order,
            icon_scale=icon_scale,
            hide_tooltip=hide_tooltip,
            can_complete=can_complete,
            category_id=category_id,
        )

        subtype_create.additional_properties = d
        return subtype_create

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
