from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="UserRead")


@_attrs_define
class UserRead:
    """
    Attributes:
        id (UUID):
        email (str):
        name (str):
        is_active (bool | Unset):  Default: True.
        is_superuser (bool | Unset):  Default: False.
        is_verified (bool | Unset):  Default: False.
    """

    id: UUID
    email: str
    name: str
    is_active: bool | Unset = True
    is_superuser: bool | Unset = False
    is_verified: bool | Unset = False
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        email = self.email

        name = self.name

        is_active = self.is_active

        is_superuser = self.is_superuser

        is_verified = self.is_verified

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "email": email,
                "name": name,
            }
        )
        if is_active is not UNSET:
            field_dict["isActive"] = is_active
        if is_superuser is not UNSET:
            field_dict["isSuperuser"] = is_superuser
        if is_verified is not UNSET:
            field_dict["isVerified"] = is_verified

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        email = d.pop("email")

        name = d.pop("name")

        is_active = d.pop("isActive", UNSET)

        is_superuser = d.pop("isSuperuser", UNSET)

        is_verified = d.pop("isVerified", UNSET)

        user_read = cls(
            id=id,
            email=email,
            name=name,
            is_active=is_active,
            is_superuser=is_superuser,
            is_verified=is_verified,
        )

        user_read.additional_properties = d
        return user_read

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
