from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="MapUpdate")


@_attrs_define
class MapUpdate:
    """
    Attributes:
        name (None | str | Unset):
        tile_width (int | None | Unset):
        tile_height (int | None | Unset):
        tiles_count_x (int | None | Unset):
        tiles_count_y (int | None | Unset):
        order (int | None | Unset):
        is_visible (bool | None | Unset):
        type_ (None | str | Unset):
    """

    name: None | str | Unset = UNSET
    tile_width: int | None | Unset = UNSET
    tile_height: int | None | Unset = UNSET
    tiles_count_x: int | None | Unset = UNSET
    tiles_count_y: int | None | Unset = UNSET
    order: int | None | Unset = UNSET
    is_visible: bool | None | Unset = UNSET
    type_: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name: None | str | Unset
        if isinstance(self.name, Unset):
            name = UNSET
        else:
            name = self.name

        tile_width: int | None | Unset
        if isinstance(self.tile_width, Unset):
            tile_width = UNSET
        else:
            tile_width = self.tile_width

        tile_height: int | None | Unset
        if isinstance(self.tile_height, Unset):
            tile_height = UNSET
        else:
            tile_height = self.tile_height

        tiles_count_x: int | None | Unset
        if isinstance(self.tiles_count_x, Unset):
            tiles_count_x = UNSET
        else:
            tiles_count_x = self.tiles_count_x

        tiles_count_y: int | None | Unset
        if isinstance(self.tiles_count_y, Unset):
            tiles_count_y = UNSET
        else:
            tiles_count_y = self.tiles_count_y

        order: int | None | Unset
        if isinstance(self.order, Unset):
            order = UNSET
        else:
            order = self.order

        is_visible: bool | None | Unset
        if isinstance(self.is_visible, Unset):
            is_visible = UNSET
        else:
            is_visible = self.is_visible

        type_: None | str | Unset
        if isinstance(self.type_, Unset):
            type_ = UNSET
        else:
            type_ = self.type_

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if name is not UNSET:
            field_dict["name"] = name
        if tile_width is not UNSET:
            field_dict["tileWidth"] = tile_width
        if tile_height is not UNSET:
            field_dict["tileHeight"] = tile_height
        if tiles_count_x is not UNSET:
            field_dict["tilesCountX"] = tiles_count_x
        if tiles_count_y is not UNSET:
            field_dict["tilesCountY"] = tiles_count_y
        if order is not UNSET:
            field_dict["order"] = order
        if is_visible is not UNSET:
            field_dict["isVisible"] = is_visible
        if type_ is not UNSET:
            field_dict["type"] = type_

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

        def _parse_tile_width(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        tile_width = _parse_tile_width(d.pop("tileWidth", UNSET))

        def _parse_tile_height(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        tile_height = _parse_tile_height(d.pop("tileHeight", UNSET))

        def _parse_tiles_count_x(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        tiles_count_x = _parse_tiles_count_x(d.pop("tilesCountX", UNSET))

        def _parse_tiles_count_y(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        tiles_count_y = _parse_tiles_count_y(d.pop("tilesCountY", UNSET))

        def _parse_order(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        order = _parse_order(d.pop("order", UNSET))

        def _parse_is_visible(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_visible = _parse_is_visible(d.pop("isVisible", UNSET))

        def _parse_type_(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        type_ = _parse_type_(d.pop("type", UNSET))

        map_update = cls(
            name=name,
            tile_width=tile_width,
            tile_height=tile_height,
            tiles_count_x=tiles_count_x,
            tiles_count_y=tiles_count_y,
            order=order,
            is_visible=is_visible,
            type_=type_,
        )

        map_update.additional_properties = d
        return map_update

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
