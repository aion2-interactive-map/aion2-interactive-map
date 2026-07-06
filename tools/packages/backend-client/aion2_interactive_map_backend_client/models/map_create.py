from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="MapCreate")


@_attrs_define
class MapCreate:
    """
    Attributes:
        name (str):
        order (int):
        tile_width (int):
        tile_height (int):
        tiles_count_x (int):
        tiles_count_y (int):
        type_ (str | Unset):  Default: ''.
        is_visible (bool | Unset):  Default: True.
    """

    name: str
    order: int
    tile_width: int
    tile_height: int
    tiles_count_x: int
    tiles_count_y: int
    type_: str | Unset = ""
    is_visible: bool | Unset = True
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        order = self.order

        tile_width = self.tile_width

        tile_height = self.tile_height

        tiles_count_x = self.tiles_count_x

        tiles_count_y = self.tiles_count_y

        type_ = self.type_

        is_visible = self.is_visible

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "order": order,
                "tileWidth": tile_width,
                "tileHeight": tile_height,
                "tilesCountX": tiles_count_x,
                "tilesCountY": tiles_count_y,
            }
        )
        if type_ is not UNSET:
            field_dict["type"] = type_
        if is_visible is not UNSET:
            field_dict["isVisible"] = is_visible

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        order = d.pop("order")

        tile_width = d.pop("tileWidth")

        tile_height = d.pop("tileHeight")

        tiles_count_x = d.pop("tilesCountX")

        tiles_count_y = d.pop("tilesCountY")

        type_ = d.pop("type", UNSET)

        is_visible = d.pop("isVisible", UNSET)

        map_create = cls(
            name=name,
            order=order,
            tile_width=tile_width,
            tile_height=tile_height,
            tiles_count_x=tiles_count_x,
            tiles_count_y=tiles_count_y,
            type_=type_,
            is_visible=is_visible,
        )

        map_create.additional_properties = d
        return map_create

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
