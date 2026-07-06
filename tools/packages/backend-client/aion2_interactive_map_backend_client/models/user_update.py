from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="UserUpdate")


@_attrs_define
class UserUpdate:
    """
    Attributes:
        name (None | str):
        password (None | str | Unset):
        email (None | str | Unset):
        is_active (bool | None | Unset):
        is_superuser (bool | None | Unset):
        is_verified (bool | None | Unset):
    """

    name: None | str
    password: None | str | Unset = UNSET
    email: None | str | Unset = UNSET
    is_active: bool | None | Unset = UNSET
    is_superuser: bool | None | Unset = UNSET
    is_verified: bool | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name: None | str
        name = self.name

        password: None | str | Unset
        if isinstance(self.password, Unset):
            password = UNSET
        else:
            password = self.password

        email: None | str | Unset
        if isinstance(self.email, Unset):
            email = UNSET
        else:
            email = self.email

        is_active: bool | None | Unset
        if isinstance(self.is_active, Unset):
            is_active = UNSET
        else:
            is_active = self.is_active

        is_superuser: bool | None | Unset
        if isinstance(self.is_superuser, Unset):
            is_superuser = UNSET
        else:
            is_superuser = self.is_superuser

        is_verified: bool | None | Unset
        if isinstance(self.is_verified, Unset):
            is_verified = UNSET
        else:
            is_verified = self.is_verified

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
            }
        )
        if password is not UNSET:
            field_dict["password"] = password
        if email is not UNSET:
            field_dict["email"] = email
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

        def _parse_name(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        name = _parse_name(d.pop("name"))

        def _parse_password(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        password = _parse_password(d.pop("password", UNSET))

        def _parse_email(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        email = _parse_email(d.pop("email", UNSET))

        def _parse_is_active(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_active = _parse_is_active(d.pop("isActive", UNSET))

        def _parse_is_superuser(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_superuser = _parse_is_superuser(d.pop("isSuperuser", UNSET))

        def _parse_is_verified(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_verified = _parse_is_verified(d.pop("isVerified", UNSET))

        user_update = cls(
            name=name,
            password=password,
            email=email,
            is_active=is_active,
            is_superuser=is_superuser,
            is_verified=is_verified,
        )

        user_update.additional_properties = d
        return user_update

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
