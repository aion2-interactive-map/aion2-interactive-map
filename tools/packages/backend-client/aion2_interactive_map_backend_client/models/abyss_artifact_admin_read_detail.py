from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.server_matching_read import ServerMatchingRead
    from ..models.user_read import UserRead


T = TypeVar("T", bound="AbyssArtifactAdminReadDetail")


@_attrs_define
class AbyssArtifactAdminReadDetail:
    """
    Attributes:
        id (UUID):
        user_id (UUID):
        server_matching_id (UUID):
        user (UserRead):
        server_matching (ServerMatchingRead):
    """

    id: UUID
    user_id: UUID
    server_matching_id: UUID
    user: UserRead
    server_matching: ServerMatchingRead
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        user_id = str(self.user_id)

        server_matching_id = str(self.server_matching_id)

        user = self.user.to_dict()

        server_matching = self.server_matching.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "userId": user_id,
                "serverMatchingId": server_matching_id,
                "user": user,
                "serverMatching": server_matching,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.server_matching_read import ServerMatchingRead
        from ..models.user_read import UserRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        user_id = UUID(d.pop("userId"))

        server_matching_id = UUID(d.pop("serverMatchingId"))

        user = UserRead.from_dict(d.pop("user"))

        server_matching = ServerMatchingRead.from_dict(d.pop("serverMatching"))

        abyss_artifact_admin_read_detail = cls(
            id=id,
            user_id=user_id,
            server_matching_id=server_matching_id,
            user=user,
            server_matching=server_matching,
        )

        abyss_artifact_admin_read_detail.additional_properties = d
        return abyss_artifact_admin_read_detail

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
