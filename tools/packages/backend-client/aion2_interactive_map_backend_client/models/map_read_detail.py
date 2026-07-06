from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.map_translation_read import MapTranslationRead


T = TypeVar("T", bound="MapReadDetail")


@_attrs_define
class MapReadDetail:
    """
    Attributes:
        id (UUID):
        name (str):
        tile_width (int):
        tile_height (int):
        tiles_count_x (int):
        tiles_count_y (int):
        order (int):
        is_visible (bool):
        type_ (str):
        translations (list[MapTranslationRead]):
    """

    id: UUID
    name: str
    tile_width: int
    tile_height: int
    tiles_count_x: int
    tiles_count_y: int
    order: int
    is_visible: bool
    type_: str
    translations: list[MapTranslationRead]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        name = self.name

        tile_width = self.tile_width

        tile_height = self.tile_height

        tiles_count_x = self.tiles_count_x

        tiles_count_y = self.tiles_count_y

        order = self.order

        is_visible = self.is_visible

        type_ = self.type_

        translations = []
        for translations_item_data in self.translations:
            translations_item = translations_item_data.to_dict()
            translations.append(translations_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
                "tileWidth": tile_width,
                "tileHeight": tile_height,
                "tilesCountX": tiles_count_x,
                "tilesCountY": tiles_count_y,
                "order": order,
                "isVisible": is_visible,
                "type": type_,
                "translations": translations,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.map_translation_read import MapTranslationRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        name = d.pop("name")

        tile_width = d.pop("tileWidth")

        tile_height = d.pop("tileHeight")

        tiles_count_x = d.pop("tilesCountX")

        tiles_count_y = d.pop("tilesCountY")

        order = d.pop("order")

        is_visible = d.pop("isVisible")

        type_ = d.pop("type")

        translations = []
        _translations = d.pop("translations")
        for translations_item_data in _translations:
            translations_item = MapTranslationRead.from_dict(translations_item_data)

            translations.append(translations_item)

        map_read_detail = cls(
            id=id,
            name=name,
            tile_width=tile_width,
            tile_height=tile_height,
            tiles_count_x=tiles_count_x,
            tiles_count_y=tiles_count_y,
            order=order,
            is_visible=is_visible,
            type_=type_,
            translations=translations,
        )

        map_read_detail.additional_properties = d
        return map_read_detail

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
