from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="CharacterInfo")


@_attrs_define
class CharacterInfo:
    """
    Attributes:
        id (str):
        name (str):
        race (int):
        pc_id (int):
        level (int):
        server_id (int):
        server_name (str):
        profile_image_url (str):
    """

    id: str
    name: str
    race: int
    pc_id: int
    level: int
    server_id: int
    server_name: str
    profile_image_url: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        name = self.name

        race = self.race

        pc_id = self.pc_id

        level = self.level

        server_id = self.server_id

        server_name = self.server_name

        profile_image_url = self.profile_image_url

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
                "race": race,
                "pcId": pc_id,
                "level": level,
                "serverId": server_id,
                "serverName": server_name,
                "profileImageUrl": profile_image_url,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        name = d.pop("name")

        race = d.pop("race")

        pc_id = d.pop("pcId")

        level = d.pop("level")

        server_id = d.pop("serverId")

        server_name = d.pop("serverName")

        profile_image_url = d.pop("profileImageUrl")

        character_info = cls(
            id=id,
            name=name,
            race=race,
            pc_id=pc_id,
            level=level,
            server_id=server_id,
            server_name=server_name,
            profile_image_url=profile_image_url,
        )

        character_info.additional_properties = d
        return character_info

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
