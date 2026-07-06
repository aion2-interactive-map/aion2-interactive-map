from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.season_read import SeasonRead
    from ..models.server_read import ServerRead


T = TypeVar("T", bound="ServerMatchingReadDetail")


@_attrs_define
class ServerMatchingReadDetail:
    """
    Attributes:
        id (UUID):
        season_id (UUID):
        server_1_id (UUID):
        server_2_id (UUID):
        order (int):
        season (SeasonRead):
        server1 (ServerRead):
        server2 (ServerRead):
    """

    id: UUID
    season_id: UUID
    server_1_id: UUID
    server_2_id: UUID
    order: int
    season: SeasonRead
    server1: ServerRead
    server2: ServerRead
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        season_id = str(self.season_id)

        server_1_id = str(self.server_1_id)

        server_2_id = str(self.server_2_id)

        order = self.order

        season = self.season.to_dict()

        server1 = self.server1.to_dict()

        server2 = self.server2.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "seasonId": season_id,
                "server1Id": server_1_id,
                "server2Id": server_2_id,
                "order": order,
                "season": season,
                "server1": server1,
                "server2": server2,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.season_read import SeasonRead
        from ..models.server_read import ServerRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        season_id = UUID(d.pop("seasonId"))

        server_1_id = UUID(d.pop("server1Id"))

        server_2_id = UUID(d.pop("server2Id"))

        order = d.pop("order")

        season = SeasonRead.from_dict(d.pop("season"))

        server1 = ServerRead.from_dict(d.pop("server1"))

        server2 = ServerRead.from_dict(d.pop("server2"))

        server_matching_read_detail = cls(
            id=id,
            season_id=season_id,
            server_1_id=server_1_id,
            server_2_id=server_2_id,
            order=order,
            season=season,
            server1=server1,
            server2=server2,
        )

        server_matching_read_detail.additional_properties = d
        return server_matching_read_detail

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
