from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

T = TypeVar("T", bound="SeasonCreate")


@_attrs_define
class SeasonCreate:
    """
    Attributes:
        number (int):
        server_region (str):
        start_date (datetime.datetime):
        end_date (datetime.datetime):
        matching_number (int | Unset):  Default: 1.
    """

    number: int
    server_region: str
    start_date: datetime.datetime
    end_date: datetime.datetime
    matching_number: int | Unset = 1
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        number = self.number

        server_region = self.server_region

        start_date = self.start_date.isoformat()

        end_date = self.end_date.isoformat()

        matching_number = self.matching_number

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "number": number,
                "serverRegion": server_region,
                "startDate": start_date,
                "endDate": end_date,
            }
        )
        if matching_number is not UNSET:
            field_dict["matchingNumber"] = matching_number

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        number = d.pop("number")

        server_region = d.pop("serverRegion")

        start_date = isoparse(d.pop("startDate"))

        end_date = isoparse(d.pop("endDate"))

        matching_number = d.pop("matchingNumber", UNSET)

        season_create = cls(
            number=number,
            server_region=server_region,
            start_date=start_date,
            end_date=end_date,
            matching_number=matching_number,
        )

        season_create.additional_properties = d
        return season_create

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
