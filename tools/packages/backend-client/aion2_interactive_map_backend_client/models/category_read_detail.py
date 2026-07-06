from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.category_translation_read import CategoryTranslationRead
    from ..models.subtype_read import SubtypeRead


T = TypeVar("T", bound="CategoryReadDetail")


@_attrs_define
class CategoryReadDetail:
    """
    Attributes:
        id (UUID):
        name (str):
        color (str):
        icon (str):
        order (int):
        subtypes (list[SubtypeRead]):
        translations (list[CategoryTranslationRead]):
    """

    id: UUID
    name: str
    color: str
    icon: str
    order: int
    subtypes: list[SubtypeRead]
    translations: list[CategoryTranslationRead]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        name = self.name

        color = self.color

        icon = self.icon

        order = self.order

        subtypes = []
        for subtypes_item_data in self.subtypes:
            subtypes_item = subtypes_item_data.to_dict()
            subtypes.append(subtypes_item)

        translations = []
        for translations_item_data in self.translations:
            translations_item = translations_item_data.to_dict()
            translations.append(translations_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
                "color": color,
                "icon": icon,
                "order": order,
                "subtypes": subtypes,
                "translations": translations,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.category_translation_read import CategoryTranslationRead
        from ..models.subtype_read import SubtypeRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        name = d.pop("name")

        color = d.pop("color")

        icon = d.pop("icon")

        order = d.pop("order")

        subtypes = []
        _subtypes = d.pop("subtypes")
        for subtypes_item_data in _subtypes:
            subtypes_item = SubtypeRead.from_dict(subtypes_item_data)

            subtypes.append(subtypes_item)

        translations = []
        _translations = d.pop("translations")
        for translations_item_data in _translations:
            translations_item = CategoryTranslationRead.from_dict(translations_item_data)

            translations.append(translations_item)

        category_read_detail = cls(
            id=id,
            name=name,
            color=color,
            icon=icon,
            order=order,
            subtypes=subtypes,
            translations=translations,
        )

        category_read_detail.additional_properties = d
        return category_read_detail

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
