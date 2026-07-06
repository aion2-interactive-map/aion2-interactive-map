from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="RegionCreate")


@_attrs_define
class RegionCreate:
    """
    Attributes:
        name (str):
        map_id (None | Unset | UUID):
        type_ (str | Unset):  Default: ''.
        borders (list[list[list[float]]] | None | Unset):
    """

    name: str
    map_id: None | Unset | UUID = UNSET
    type_: str | Unset = ""
    borders: list[list[list[float]]] | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        map_id: None | str | Unset
        if isinstance(self.map_id, Unset):
            map_id = UNSET
        elif isinstance(self.map_id, UUID):
            map_id = str(self.map_id)
        else:
            map_id = self.map_id

        type_ = self.type_

        borders: list[list[list[float]]] | None | Unset
        if isinstance(self.borders, Unset):
            borders = UNSET
        elif isinstance(self.borders, list):
            borders = []
            for borders_type_0_item_data in self.borders:
                borders_type_0_item = []
                for borders_type_0_item_item_data in borders_type_0_item_data:
                    borders_type_0_item_item = borders_type_0_item_item_data

                    borders_type_0_item.append(borders_type_0_item_item)

                borders.append(borders_type_0_item)

        else:
            borders = self.borders

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
            }
        )
        if map_id is not UNSET:
            field_dict["mapId"] = map_id
        if type_ is not UNSET:
            field_dict["type"] = type_
        if borders is not UNSET:
            field_dict["borders"] = borders

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        def _parse_map_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                map_id_type_0 = UUID(data)

                return map_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        map_id = _parse_map_id(d.pop("mapId", UNSET))

        type_ = d.pop("type", UNSET)

        def _parse_borders(data: object) -> list[list[list[float]]] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                borders_type_0 = []
                _borders_type_0 = data
                for borders_type_0_item_data in _borders_type_0:
                    borders_type_0_item = []
                    _borders_type_0_item = borders_type_0_item_data
                    for borders_type_0_item_item_data in _borders_type_0_item:
                        borders_type_0_item_item = cast(list[float], borders_type_0_item_item_data)

                        borders_type_0_item.append(borders_type_0_item_item)

                    borders_type_0.append(borders_type_0_item)

                return borders_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[list[list[float]]] | None | Unset, data)

        borders = _parse_borders(d.pop("borders", UNSET))

        region_create = cls(
            name=name,
            map_id=map_id,
            type_=type_,
            borders=borders,
        )

        region_create.additional_properties = d
        return region_create

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
