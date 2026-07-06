from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="AbyssArtifactServerCount")


@_attrs_define
class AbyssArtifactServerCount:
    """
    Attributes:
        server_id (int):
        artifact_count (int):
        artifact_total (int):
    """

    server_id: int
    artifact_count: int
    artifact_total: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        server_id = self.server_id

        artifact_count = self.artifact_count

        artifact_total = self.artifact_total

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "serverId": server_id,
                "artifactCount": artifact_count,
                "artifactTotal": artifact_total,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        server_id = d.pop("serverId")

        artifact_count = d.pop("artifactCount")

        artifact_total = d.pop("artifactTotal")

        abyss_artifact_server_count = cls(
            server_id=server_id,
            artifact_count=artifact_count,
            artifact_total=artifact_total,
        )

        abyss_artifact_server_count.additional_properties = d
        return abyss_artifact_server_count

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
