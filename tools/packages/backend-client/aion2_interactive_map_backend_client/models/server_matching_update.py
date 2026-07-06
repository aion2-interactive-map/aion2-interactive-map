from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="ServerMatchingUpdate")


@_attrs_define
class ServerMatchingUpdate:
    """
    Attributes:
        server_1_id (None | Unset | UUID):
        server_2_id (None | Unset | UUID):
        order (int | None | Unset):
    """

    server_1_id: None | Unset | UUID = UNSET
    server_2_id: None | Unset | UUID = UNSET
    order: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        server_1_id: None | str | Unset
        if isinstance(self.server_1_id, Unset):
            server_1_id = UNSET
        elif isinstance(self.server_1_id, UUID):
            server_1_id = str(self.server_1_id)
        else:
            server_1_id = self.server_1_id

        server_2_id: None | str | Unset
        if isinstance(self.server_2_id, Unset):
            server_2_id = UNSET
        elif isinstance(self.server_2_id, UUID):
            server_2_id = str(self.server_2_id)
        else:
            server_2_id = self.server_2_id

        order: int | None | Unset
        if isinstance(self.order, Unset):
            order = UNSET
        else:
            order = self.order

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if server_1_id is not UNSET:
            field_dict["server1Id"] = server_1_id
        if server_2_id is not UNSET:
            field_dict["server2Id"] = server_2_id
        if order is not UNSET:
            field_dict["order"] = order

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_server_1_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                server_1_id_type_0 = UUID(data)

                return server_1_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        server_1_id = _parse_server_1_id(d.pop("server1Id", UNSET))

        def _parse_server_2_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                server_2_id_type_0 = UUID(data)

                return server_2_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        server_2_id = _parse_server_2_id(d.pop("server2Id", UNSET))

        def _parse_order(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        order = _parse_order(d.pop("order", UNSET))

        server_matching_update = cls(
            server_1_id=server_1_id,
            server_2_id=server_2_id,
            order=order,
        )

        server_matching_update.additional_properties = d
        return server_matching_update

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
