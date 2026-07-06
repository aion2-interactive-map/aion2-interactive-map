from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.map_read import MapRead
    from ..models.marker_image_read import MarkerImageRead
    from ..models.marker_translation_read import MarkerTranslationRead
    from ..models.region_read import RegionRead
    from ..models.subtype_read import SubtypeRead


T = TypeVar("T", bound="MarkerReadDetail")


@_attrs_define
class MarkerReadDetail:
    """
    Attributes:
        id (UUID):
        map_id (UUID):
        subtype_id (UUID):
        region_id (None | UUID):
        name (str):
        x (float):
        y (float):
        index_in_subtype (int):
        subtype (SubtypeRead):
        map_ (MapRead):
        translations (list[MarkerTranslationRead]):
        images (list[MarkerImageRead]):
        icon (None | str | Unset):  Default: ''.
        type_ (None | str | Unset):  Default: ''.
        region (None | RegionRead | Unset):
    """

    id: UUID
    map_id: UUID
    subtype_id: UUID
    region_id: None | UUID
    name: str
    x: float
    y: float
    index_in_subtype: int
    subtype: SubtypeRead
    map_: MapRead
    translations: list[MarkerTranslationRead]
    images: list[MarkerImageRead]
    icon: None | str | Unset = ""
    type_: None | str | Unset = ""
    region: None | RegionRead | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.region_read import RegionRead

        id = str(self.id)

        map_id = str(self.map_id)

        subtype_id = str(self.subtype_id)

        region_id: None | str
        if isinstance(self.region_id, UUID):
            region_id = str(self.region_id)
        else:
            region_id = self.region_id

        name = self.name

        x = self.x

        y = self.y

        index_in_subtype = self.index_in_subtype

        subtype = self.subtype.to_dict()

        map_ = self.map_.to_dict()

        translations = []
        for translations_item_data in self.translations:
            translations_item = translations_item_data.to_dict()
            translations.append(translations_item)

        images = []
        for images_item_data in self.images:
            images_item = images_item_data.to_dict()
            images.append(images_item)

        icon: None | str | Unset
        if isinstance(self.icon, Unset):
            icon = UNSET
        else:
            icon = self.icon

        type_: None | str | Unset
        if isinstance(self.type_, Unset):
            type_ = UNSET
        else:
            type_ = self.type_

        region: dict[str, Any] | None | Unset
        if isinstance(self.region, Unset):
            region = UNSET
        elif isinstance(self.region, RegionRead):
            region = self.region.to_dict()
        else:
            region = self.region

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "mapId": map_id,
                "subtypeId": subtype_id,
                "regionId": region_id,
                "name": name,
                "x": x,
                "y": y,
                "indexInSubtype": index_in_subtype,
                "subtype": subtype,
                "map": map_,
                "translations": translations,
                "images": images,
            }
        )
        if icon is not UNSET:
            field_dict["icon"] = icon
        if type_ is not UNSET:
            field_dict["type"] = type_
        if region is not UNSET:
            field_dict["region"] = region

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.map_read import MapRead
        from ..models.marker_image_read import MarkerImageRead
        from ..models.marker_translation_read import MarkerTranslationRead
        from ..models.region_read import RegionRead
        from ..models.subtype_read import SubtypeRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        map_id = UUID(d.pop("mapId"))

        subtype_id = UUID(d.pop("subtypeId"))

        def _parse_region_id(data: object) -> None | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                region_id_type_0 = UUID(data)

                return region_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | UUID, data)

        region_id = _parse_region_id(d.pop("regionId"))

        name = d.pop("name")

        x = d.pop("x")

        y = d.pop("y")

        index_in_subtype = d.pop("indexInSubtype")

        subtype = SubtypeRead.from_dict(d.pop("subtype"))

        map_ = MapRead.from_dict(d.pop("map"))

        translations = []
        _translations = d.pop("translations")
        for translations_item_data in _translations:
            translations_item = MarkerTranslationRead.from_dict(translations_item_data)

            translations.append(translations_item)

        images = []
        _images = d.pop("images")
        for images_item_data in _images:
            images_item = MarkerImageRead.from_dict(images_item_data)

            images.append(images_item)

        def _parse_icon(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        icon = _parse_icon(d.pop("icon", UNSET))

        def _parse_type_(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        type_ = _parse_type_(d.pop("type", UNSET))

        def _parse_region(data: object) -> None | RegionRead | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                region_type_0 = RegionRead.from_dict(data)

                return region_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | RegionRead | Unset, data)

        region = _parse_region(d.pop("region", UNSET))

        marker_read_detail = cls(
            id=id,
            map_id=map_id,
            subtype_id=subtype_id,
            region_id=region_id,
            name=name,
            x=x,
            y=y,
            index_in_subtype=index_in_subtype,
            subtype=subtype,
            map_=map_,
            translations=translations,
            images=images,
            icon=icon,
            type_=type_,
            region=region,
        )

        marker_read_detail.additional_properties = d
        return marker_read_detail

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
