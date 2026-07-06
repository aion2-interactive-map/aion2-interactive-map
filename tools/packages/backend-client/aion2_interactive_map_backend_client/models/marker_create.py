from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="MarkerCreate")


@_attrs_define
class MarkerCreate:
    """
    Attributes:
        subtype_id (str | UUID):
        name (str):
        x (float):
        y (float):
        region_id (None | str | Unset | UUID):
        icon (str | Unset):  Default: ''.
        type_ (str | Unset):  Default: ''.
        index_in_subtype (int | None | Unset):
    """

    subtype_id: str | UUID
    name: str
    x: float
    y: float
    region_id: None | str | Unset | UUID = UNSET
    icon: str | Unset = ""
    type_: str | Unset = ""
    index_in_subtype: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        subtype_id: str
        if isinstance(self.subtype_id, UUID):
            subtype_id = str(self.subtype_id)
        else:
            subtype_id = self.subtype_id

        name = self.name

        x = self.x

        y = self.y

        region_id: None | str | Unset
        if isinstance(self.region_id, Unset):
            region_id = UNSET
        elif isinstance(self.region_id, UUID):
            region_id = str(self.region_id)
        else:
            region_id = self.region_id

        icon = self.icon

        type_ = self.type_

        index_in_subtype: int | None | Unset
        if isinstance(self.index_in_subtype, Unset):
            index_in_subtype = UNSET
        else:
            index_in_subtype = self.index_in_subtype

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "subtypeId": subtype_id,
                "name": name,
                "x": x,
                "y": y,
            }
        )
        if region_id is not UNSET:
            field_dict["regionId"] = region_id
        if icon is not UNSET:
            field_dict["icon"] = icon
        if type_ is not UNSET:
            field_dict["type"] = type_
        if index_in_subtype is not UNSET:
            field_dict["indexInSubtype"] = index_in_subtype

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_subtype_id(data: object) -> str | UUID:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                subtype_id_type_0 = UUID(data)

                return subtype_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(str | UUID, data)

        subtype_id = _parse_subtype_id(d.pop("subtypeId"))

        name = d.pop("name")

        x = d.pop("x")

        y = d.pop("y")

        def _parse_region_id(data: object) -> None | str | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                region_id_type_0 = UUID(data)

                return region_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | str | Unset | UUID, data)

        region_id = _parse_region_id(d.pop("regionId", UNSET))

        icon = d.pop("icon", UNSET)

        type_ = d.pop("type", UNSET)

        def _parse_index_in_subtype(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        index_in_subtype = _parse_index_in_subtype(d.pop("indexInSubtype", UNSET))

        marker_create = cls(
            subtype_id=subtype_id,
            name=name,
            x=x,
            y=y,
            region_id=region_id,
            icon=icon,
            type_=type_,
            index_in_subtype=index_in_subtype,
        )

        marker_create.additional_properties = d
        return marker_create

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
