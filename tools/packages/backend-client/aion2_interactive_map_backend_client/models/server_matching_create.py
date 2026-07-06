from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="ServerMatchingCreate")


@_attrs_define
class ServerMatchingCreate:
    """
    Attributes:
        server_1_id (UUID):
        server_2_id (UUID):
        order (int | None | Unset):  Default: 0.
    """

    server_1_id: UUID
    server_2_id: UUID
    order: int | None | Unset = 0
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        server_1_id = str(self.server_1_id)

        server_2_id = str(self.server_2_id)

        order: int | None | Unset
        if isinstance(self.order, Unset):
            order = UNSET
        else:
            order = self.order

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "server1Id": server_1_id,
                "server2Id": server_2_id,
            }
        )
        if order is not UNSET:
            field_dict["order"] = order

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        server_1_id = UUID(d.pop("server1Id"))

        server_2_id = UUID(d.pop("server2Id"))

        def _parse_order(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        order = _parse_order(d.pop("order", UNSET))

        server_matching_create = cls(
            server_1_id=server_1_id,
            server_2_id=server_2_id,
            order=order,
        )

        server_matching_create.additional_properties = d
        return server_matching_create

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
