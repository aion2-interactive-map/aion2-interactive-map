from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="CharacterJobMeta")


@_attrs_define
class CharacterJobMeta:
    """
    Attributes:
        job_id (str): Job ID
        status (str): Job status
        updated_at (float): Updated at
        started_at (float | None | Unset): Updated at
        done (int | Unset): Done Default: 0.
        failed (int | Unset): Failed Default: 0.
        total (int | Unset): Total Default: 0.
    """

    job_id: str
    status: str
    updated_at: float
    started_at: float | None | Unset = UNSET
    done: int | Unset = 0
    failed: int | Unset = 0
    total: int | Unset = 0
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        job_id = self.job_id

        status = self.status

        updated_at = self.updated_at

        started_at: float | None | Unset
        if isinstance(self.started_at, Unset):
            started_at = UNSET
        else:
            started_at = self.started_at

        done = self.done

        failed = self.failed

        total = self.total

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "jobId": job_id,
                "status": status,
                "updatedAt": updated_at,
            }
        )
        if started_at is not UNSET:
            field_dict["startedAt"] = started_at
        if done is not UNSET:
            field_dict["done"] = done
        if failed is not UNSET:
            field_dict["failed"] = failed
        if total is not UNSET:
            field_dict["total"] = total

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        job_id = d.pop("jobId")

        status = d.pop("status")

        updated_at = d.pop("updatedAt")

        def _parse_started_at(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        started_at = _parse_started_at(d.pop("startedAt", UNSET))

        done = d.pop("done", UNSET)

        failed = d.pop("failed", UNSET)

        total = d.pop("total", UNSET)

        character_job_meta = cls(
            job_id=job_id,
            status=status,
            updated_at=updated_at,
            started_at=started_at,
            done=done,
            failed=failed,
            total=total,
        )

        character_job_meta.additional_properties = d
        return character_job_meta

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
