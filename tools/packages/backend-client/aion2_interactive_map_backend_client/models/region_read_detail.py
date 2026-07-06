from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.map_read import MapRead
    from ..models.region_translation_read import RegionTranslationRead


T = TypeVar("T", bound="RegionReadDetail")


@_attrs_define
class RegionReadDetail:
    """
    Attributes:
        id (UUID):
        map_id (UUID):
        name (str):
        type_ (str):
        borders (list[list[list[float]]]):
        map_ (MapRead):
        translations (list[RegionTranslationRead]):
    """

    id: UUID
    map_id: UUID
    name: str
    type_: str
    borders: list[list[list[float]]]
    map_: MapRead
    translations: list[RegionTranslationRead]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        map_id = str(self.map_id)

        name = self.name

        type_ = self.type_

        borders = []
        for borders_item_data in self.borders:
            borders_item = []
            for borders_item_item_data in borders_item_data:
                borders_item_item = borders_item_item_data

                borders_item.append(borders_item_item)

            borders.append(borders_item)

        map_ = self.map_.to_dict()

        translations = []
        for translations_item_data in self.translations:
            translations_item = translations_item_data.to_dict()
            translations.append(translations_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "mapId": map_id,
                "name": name,
                "type": type_,
                "borders": borders,
                "map": map_,
                "translations": translations,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.map_read import MapRead
        from ..models.region_translation_read import RegionTranslationRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        map_id = UUID(d.pop("mapId"))

        name = d.pop("name")

        type_ = d.pop("type")

        borders = []
        _borders = d.pop("borders")
        for borders_item_data in _borders:
            borders_item = []
            _borders_item = borders_item_data
            for borders_item_item_data in _borders_item:
                borders_item_item = cast(list[float], borders_item_item_data)

                borders_item.append(borders_item_item)

            borders.append(borders_item)

        map_ = MapRead.from_dict(d.pop("map"))

        translations = []
        _translations = d.pop("translations")
        for translations_item_data in _translations:
            translations_item = RegionTranslationRead.from_dict(translations_item_data)

            translations.append(translations_item)

        region_read_detail = cls(
            id=id,
            map_id=map_id,
            name=name,
            type_=type_,
            borders=borders,
            map_=map_,
            translations=translations,
        )

        region_read_detail.additional_properties = d
        return region_read_detail

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
