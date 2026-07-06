from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.language_read import LanguageRead


T = TypeVar("T", bound="RegionTranslationRead")


@_attrs_define
class RegionTranslationRead:
    """
    Attributes:
        id (UUID):
        language (LanguageRead):
        name (str):
        description (None | str):
    """

    id: UUID
    language: LanguageRead
    name: str
    description: None | str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        language = self.language.to_dict()

        name = self.name

        description: None | str
        description = self.description

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "language": language,
                "name": name,
                "description": description,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.language_read import LanguageRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        language = LanguageRead.from_dict(d.pop("language"))

        name = d.pop("name")

        def _parse_description(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        description = _parse_description(d.pop("description"))

        region_translation_read = cls(
            id=id,
            language=language,
            name=name,
            description=description,
        )

        region_translation_read.additional_properties = d
        return region_translation_read

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
