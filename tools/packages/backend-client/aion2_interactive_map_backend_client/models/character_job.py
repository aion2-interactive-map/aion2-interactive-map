from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.character_job_items import CharacterJobItems
    from ..models.character_job_meta import CharacterJobMeta


T = TypeVar("T", bound="CharacterJob")


@_attrs_define
class CharacterJob:
    """
    Attributes:
        status (str): Job status
        meta (CharacterJobMeta):
        job_id (None | str | Unset): Job ID
        items (CharacterJobItems | Unset): Job items
    """

    status: str
    meta: CharacterJobMeta
    job_id: None | str | Unset = UNSET
    items: CharacterJobItems | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        status = self.status

        meta = self.meta.to_dict()

        job_id: None | str | Unset
        if isinstance(self.job_id, Unset):
            job_id = UNSET
        else:
            job_id = self.job_id

        items: dict[str, Any] | Unset = UNSET
        if not isinstance(self.items, Unset):
            items = self.items.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "status": status,
                "meta": meta,
            }
        )
        if job_id is not UNSET:
            field_dict["jobId"] = job_id
        if items is not UNSET:
            field_dict["items"] = items

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.character_job_items import CharacterJobItems
        from ..models.character_job_meta import CharacterJobMeta

        d = dict(src_dict)
        status = d.pop("status")

        meta = CharacterJobMeta.from_dict(d.pop("meta"))

        def _parse_job_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        job_id = _parse_job_id(d.pop("jobId", UNSET))

        _items = d.pop("items", UNSET)
        items: CharacterJobItems | Unset
        if isinstance(_items, Unset):
            items = UNSET
        else:
            items = CharacterJobItems.from_dict(_items)

        character_job = cls(
            status=status,
            meta=meta,
            job_id=job_id,
            items=items,
        )

        character_job.additional_properties = d
        return character_job

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
