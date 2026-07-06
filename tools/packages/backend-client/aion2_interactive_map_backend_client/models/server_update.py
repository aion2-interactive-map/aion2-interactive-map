from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="ServerUpdate")


@_attrs_define
class ServerUpdate:
    """
    Attributes:
        server_region (None | str | Unset):
        race_id (int | None | Unset):
        server_id (int | None | Unset):
        server_name (None | str | Unset):
        server_short_name (None | str | Unset):
    """

    server_region: None | str | Unset = UNSET
    race_id: int | None | Unset = UNSET
    server_id: int | None | Unset = UNSET
    server_name: None | str | Unset = UNSET
    server_short_name: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        server_region: None | str | Unset
        if isinstance(self.server_region, Unset):
            server_region = UNSET
        else:
            server_region = self.server_region

        race_id: int | None | Unset
        if isinstance(self.race_id, Unset):
            race_id = UNSET
        else:
            race_id = self.race_id

        server_id: int | None | Unset
        if isinstance(self.server_id, Unset):
            server_id = UNSET
        else:
            server_id = self.server_id

        server_name: None | str | Unset
        if isinstance(self.server_name, Unset):
            server_name = UNSET
        else:
            server_name = self.server_name

        server_short_name: None | str | Unset
        if isinstance(self.server_short_name, Unset):
            server_short_name = UNSET
        else:
            server_short_name = self.server_short_name

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if server_region is not UNSET:
            field_dict["serverRegion"] = server_region
        if race_id is not UNSET:
            field_dict["raceId"] = race_id
        if server_id is not UNSET:
            field_dict["serverId"] = server_id
        if server_name is not UNSET:
            field_dict["serverName"] = server_name
        if server_short_name is not UNSET:
            field_dict["serverShortName"] = server_short_name

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_server_region(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        server_region = _parse_server_region(d.pop("serverRegion", UNSET))

        def _parse_race_id(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        race_id = _parse_race_id(d.pop("raceId", UNSET))

        def _parse_server_id(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        server_id = _parse_server_id(d.pop("serverId", UNSET))

        def _parse_server_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        server_name = _parse_server_name(d.pop("serverName", UNSET))

        def _parse_server_short_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        server_short_name = _parse_server_short_name(d.pop("serverShortName", UNSET))

        server_update = cls(
            server_region=server_region,
            race_id=race_id,
            server_id=server_id,
            server_name=server_name,
            server_short_name=server_short_name,
        )

        server_update.additional_properties = d
        return server_update

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
