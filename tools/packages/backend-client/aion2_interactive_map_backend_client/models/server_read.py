from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="ServerRead")


@_attrs_define
class ServerRead:
    """
    Attributes:
        id (UUID):
        server_region (str):
        race_id (int):
        server_id (int):
        server_name (str):
        server_short_name (str):
    """

    id: UUID
    server_region: str
    race_id: int
    server_id: int
    server_name: str
    server_short_name: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        server_region = self.server_region

        race_id = self.race_id

        server_id = self.server_id

        server_name = self.server_name

        server_short_name = self.server_short_name

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "serverRegion": server_region,
                "raceId": race_id,
                "serverId": server_id,
                "serverName": server_name,
                "serverShortName": server_short_name,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        server_region = d.pop("serverRegion")

        race_id = d.pop("raceId")

        server_id = d.pop("serverId")

        server_name = d.pop("serverName")

        server_short_name = d.pop("serverShortName")

        server_read = cls(
            id=id,
            server_region=server_region,
            race_id=race_id,
            server_id=server_id,
            server_name=server_name,
            server_short_name=server_short_name,
        )

        server_read.additional_properties = d
        return server_read

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
