from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="RegionUpdate")


@_attrs_define
class RegionUpdate:
    """
    Attributes:
        borders (list[list[list[float]]] | None):
        name (None | str | Unset):
        type_ (None | str | Unset):
    """

    borders: list[list[list[float]]] | None
    name: None | str | Unset = UNSET
    type_: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        borders: list[list[list[float]]] | None
        if isinstance(self.borders, list):
            borders = []
            for borders_type_0_item_data in self.borders:
                borders_type_0_item = []
                for borders_type_0_item_item_data in borders_type_0_item_data:
                    borders_type_0_item_item = borders_type_0_item_item_data

                    borders_type_0_item.append(borders_type_0_item_item)

                borders.append(borders_type_0_item)

        else:
            borders = self.borders

        name: None | str | Unset
        if isinstance(self.name, Unset):
            name = UNSET
        else:
            name = self.name

        type_: None | str | Unset
        if isinstance(self.type_, Unset):
            type_ = UNSET
        else:
            type_ = self.type_

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "borders": borders,
            }
        )
        if name is not UNSET:
            field_dict["name"] = name
        if type_ is not UNSET:
            field_dict["type"] = type_

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_borders(data: object) -> list[list[list[float]]] | None:
            if data is None:
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
            return cast(list[list[list[float]]] | None, data)

        borders = _parse_borders(d.pop("borders"))

        def _parse_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        name = _parse_name(d.pop("name", UNSET))

        def _parse_type_(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        type_ = _parse_type_(d.pop("type", UNSET))

        region_update = cls(
            borders=borders,
            name=name,
            type_=type_,
        )

        region_update.additional_properties = d
        return region_update

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
