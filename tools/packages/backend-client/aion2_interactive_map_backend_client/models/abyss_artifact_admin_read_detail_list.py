from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.abyss_artifact_admin_read_detail import AbyssArtifactAdminReadDetail


T = TypeVar("T", bound="AbyssArtifactAdminReadDetailList")


@_attrs_define
class AbyssArtifactAdminReadDetailList:
    """
    Attributes:
        count (int | Unset):  Default: 0.
        results (list[AbyssArtifactAdminReadDetail] | Unset):
    """

    count: int | Unset = 0
    results: list[AbyssArtifactAdminReadDetail] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        count = self.count

        results: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.results, Unset):
            results = []
            for results_item_data in self.results:
                results_item = results_item_data.to_dict()
                results.append(results_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if count is not UNSET:
            field_dict["count"] = count
        if results is not UNSET:
            field_dict["results"] = results

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.abyss_artifact_admin_read_detail import AbyssArtifactAdminReadDetail

        d = dict(src_dict)
        count = d.pop("count", UNSET)

        _results = d.pop("results", UNSET)
        results: list[AbyssArtifactAdminReadDetail] | Unset = UNSET
        if _results is not UNSET:
            results = []
            for results_item_data in _results:
                results_item = AbyssArtifactAdminReadDetail.from_dict(results_item_data)

                results.append(results_item)

        abyss_artifact_admin_read_detail_list = cls(
            count=count,
            results=results,
        )

        abyss_artifact_admin_read_detail_list.additional_properties = d
        return abyss_artifact_admin_read_detail_list

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
