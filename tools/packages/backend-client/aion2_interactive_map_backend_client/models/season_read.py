from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

T = TypeVar("T", bound="SeasonRead")


@_attrs_define
class SeasonRead:
    """
    Attributes:
        id (UUID):
        number (int):
        matching_number (int):
        server_region (str):
        start_date (datetime.datetime):
        end_date (datetime.datetime):
    """

    id: UUID
    number: int
    matching_number: int
    server_region: str
    start_date: datetime.datetime
    end_date: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        number = self.number

        matching_number = self.matching_number

        server_region = self.server_region

        start_date = self.start_date.isoformat()

        end_date = self.end_date.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "number": number,
                "matchingNumber": matching_number,
                "serverRegion": server_region,
                "startDate": start_date,
                "endDate": end_date,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        number = d.pop("number")

        matching_number = d.pop("matchingNumber")

        server_region = d.pop("serverRegion")

        start_date = isoparse(d.pop("startDate"))

        end_date = isoparse(d.pop("endDate"))

        season_read = cls(
            id=id,
            number=number,
            matching_number=matching_number,
            server_region=server_region,
            start_date=start_date,
            end_date=end_date,
        )

        season_read.additional_properties = d
        return season_read

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
