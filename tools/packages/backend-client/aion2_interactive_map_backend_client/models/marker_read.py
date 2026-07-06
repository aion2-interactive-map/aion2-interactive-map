from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="MarkerRead")


@_attrs_define
class MarkerRead:
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
        icon (None | str | Unset):  Default: ''.
        type_ (None | str | Unset):  Default: ''.
    """

    id: UUID
    map_id: UUID
    subtype_id: UUID
    region_id: None | UUID
    name: str
    x: float
    y: float
    index_in_subtype: int
    icon: None | str | Unset = ""
    type_: None | str | Unset = ""
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
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
            }
        )
        if icon is not UNSET:
            field_dict["icon"] = icon
        if type_ is not UNSET:
            field_dict["type"] = type_

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
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

        marker_read = cls(
            id=id,
            map_id=map_id,
            subtype_id=subtype_id,
            region_id=region_id,
            name=name,
            x=x,
            y=y,
            index_in_subtype=index_in_subtype,
            icon=icon,
            type_=type_,
        )

        marker_read.additional_properties = d
        return marker_read

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
