from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="ServerMatchingRead")


@_attrs_define
class ServerMatchingRead:
    """
    Attributes:
        id (UUID):
        season_id (UUID):
        server_1_id (UUID):
        server_2_id (UUID):
        order (int):
    """

    id: UUID
    season_id: UUID
    server_1_id: UUID
    server_2_id: UUID
    order: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        season_id = str(self.season_id)

        server_1_id = str(self.server_1_id)

        server_2_id = str(self.server_2_id)

        order = self.order

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "seasonId": season_id,
                "server1Id": server_1_id,
                "server2Id": server_2_id,
                "order": order,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        season_id = UUID(d.pop("seasonId"))

        server_1_id = UUID(d.pop("server1Id"))

        server_2_id = UUID(d.pop("server2Id"))

        order = d.pop("order")

        server_matching_read = cls(
            id=id,
            season_id=season_id,
            server_1_id=server_1_id,
            server_2_id=server_2_id,
            order=order,
        )

        server_matching_read.additional_properties = d
        return server_matching_read

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
