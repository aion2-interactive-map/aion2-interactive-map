from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.category_read import CategoryRead
    from ..models.subtype_translation_read import SubtypeTranslationRead


T = TypeVar("T", bound="SubtypeReadDetail")


@_attrs_define
class SubtypeReadDetail:
    """
    Attributes:
        id (UUID):
        name (str):
        color (str):
        icon (str):
        icon_scale (float):
        hide_tooltip (bool):
        order (int):
        can_complete (bool):
        category (CategoryRead | None):
        translations (list[SubtypeTranslationRead]):
    """

    id: UUID
    name: str
    color: str
    icon: str
    icon_scale: float
    hide_tooltip: bool
    order: int
    can_complete: bool
    category: CategoryRead | None
    translations: list[SubtypeTranslationRead]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.category_read import CategoryRead

        id = str(self.id)

        name = self.name

        color = self.color

        icon = self.icon

        icon_scale = self.icon_scale

        hide_tooltip = self.hide_tooltip

        order = self.order

        can_complete = self.can_complete

        category: dict[str, Any] | None
        if isinstance(self.category, CategoryRead):
            category = self.category.to_dict()
        else:
            category = self.category

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
                "iconScale": icon_scale,
                "hideTooltip": hide_tooltip,
                "order": order,
                "canComplete": can_complete,
                "category": category,
                "translations": translations,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.category_read import CategoryRead
        from ..models.subtype_translation_read import SubtypeTranslationRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        name = d.pop("name")

        color = d.pop("color")

        icon = d.pop("icon")

        icon_scale = d.pop("iconScale")

        hide_tooltip = d.pop("hideTooltip")

        order = d.pop("order")

        can_complete = d.pop("canComplete")

        def _parse_category(data: object) -> CategoryRead | None:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                category_type_0 = CategoryRead.from_dict(data)

                return category_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(CategoryRead | None, data)

        category = _parse_category(d.pop("category"))

        translations = []
        _translations = d.pop("translations")
        for translations_item_data in _translations:
            translations_item = SubtypeTranslationRead.from_dict(translations_item_data)

            translations.append(translations_item)

        subtype_read_detail = cls(
            id=id,
            name=name,
            color=color,
            icon=icon,
            icon_scale=icon_scale,
            hide_tooltip=hide_tooltip,
            order=order,
            can_complete=can_complete,
            category=category,
            translations=translations,
        )

        subtype_read_detail.additional_properties = d
        return subtype_read_detail

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
