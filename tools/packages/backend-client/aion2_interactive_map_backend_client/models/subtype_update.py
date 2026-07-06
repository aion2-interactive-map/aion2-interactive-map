from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="SubtypeUpdate")


@_attrs_define
class SubtypeUpdate:
    """
    Attributes:
        name (None | str | Unset):
        color (None | str | Unset):
        icon (None | str | Unset):
        icon_scale (float | None | Unset):
        hide_tooltip (bool | None | Unset):
        order (int | None | Unset):
        category_id (None | str | Unset | UUID):
        can_complete (bool | None | Unset):
    """

    name: None | str | Unset = UNSET
    color: None | str | Unset = UNSET
    icon: None | str | Unset = UNSET
    icon_scale: float | None | Unset = UNSET
    hide_tooltip: bool | None | Unset = UNSET
    order: int | None | Unset = UNSET
    category_id: None | str | Unset | UUID = UNSET
    can_complete: bool | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name: None | str | Unset
        if isinstance(self.name, Unset):
            name = UNSET
        else:
            name = self.name

        color: None | str | Unset
        if isinstance(self.color, Unset):
            color = UNSET
        else:
            color = self.color

        icon: None | str | Unset
        if isinstance(self.icon, Unset):
            icon = UNSET
        else:
            icon = self.icon

        icon_scale: float | None | Unset
        if isinstance(self.icon_scale, Unset):
            icon_scale = UNSET
        else:
            icon_scale = self.icon_scale

        hide_tooltip: bool | None | Unset
        if isinstance(self.hide_tooltip, Unset):
            hide_tooltip = UNSET
        else:
            hide_tooltip = self.hide_tooltip

        order: int | None | Unset
        if isinstance(self.order, Unset):
            order = UNSET
        else:
            order = self.order

        category_id: None | str | Unset
        if isinstance(self.category_id, Unset):
            category_id = UNSET
        elif isinstance(self.category_id, UUID):
            category_id = str(self.category_id)
        else:
            category_id = self.category_id

        can_complete: bool | None | Unset
        if isinstance(self.can_complete, Unset):
            can_complete = UNSET
        else:
            can_complete = self.can_complete

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if name is not UNSET:
            field_dict["name"] = name
        if color is not UNSET:
            field_dict["color"] = color
        if icon is not UNSET:
            field_dict["icon"] = icon
        if icon_scale is not UNSET:
            field_dict["iconScale"] = icon_scale
        if hide_tooltip is not UNSET:
            field_dict["hideTooltip"] = hide_tooltip
        if order is not UNSET:
            field_dict["order"] = order
        if category_id is not UNSET:
            field_dict["categoryId"] = category_id
        if can_complete is not UNSET:
            field_dict["canComplete"] = can_complete

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        name = _parse_name(d.pop("name", UNSET))

        def _parse_color(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        color = _parse_color(d.pop("color", UNSET))

        def _parse_icon(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        icon = _parse_icon(d.pop("icon", UNSET))

        def _parse_icon_scale(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        icon_scale = _parse_icon_scale(d.pop("iconScale", UNSET))

        def _parse_hide_tooltip(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        hide_tooltip = _parse_hide_tooltip(d.pop("hideTooltip", UNSET))

        def _parse_order(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        order = _parse_order(d.pop("order", UNSET))

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

        def _parse_can_complete(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        can_complete = _parse_can_complete(d.pop("canComplete", UNSET))

        subtype_update = cls(
            name=name,
            color=color,
            icon=icon,
            icon_scale=icon_scale,
            hide_tooltip=hide_tooltip,
            order=order,
            category_id=category_id,
            can_complete=can_complete,
        )

        subtype_update.additional_properties = d
        return subtype_update

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
