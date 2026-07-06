from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..models.comment_target_type import CommentTargetType
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.user_read import UserRead


T = TypeVar("T", bound="CommentRead")


@_attrs_define
class CommentRead:
    """
    Attributes:
        id (UUID):
        content (str):
        target_type (CommentTargetType):
        target_id (UUID):
        created_at (datetime.datetime):
        verified (bool):
        user_id (UUID):
        user (UserRead):
        root_id (None | Unset | UUID):
        reply_to_id (None | Unset | UUID):
    """

    id: UUID
    content: str
    target_type: CommentTargetType
    target_id: UUID
    created_at: datetime.datetime
    verified: bool
    user_id: UUID
    user: UserRead
    root_id: None | Unset | UUID = UNSET
    reply_to_id: None | Unset | UUID = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        content = self.content

        target_type = self.target_type.value

        target_id = str(self.target_id)

        created_at = self.created_at.isoformat()

        verified = self.verified

        user_id = str(self.user_id)

        user = self.user.to_dict()

        root_id: None | str | Unset
        if isinstance(self.root_id, Unset):
            root_id = UNSET
        elif isinstance(self.root_id, UUID):
            root_id = str(self.root_id)
        else:
            root_id = self.root_id

        reply_to_id: None | str | Unset
        if isinstance(self.reply_to_id, Unset):
            reply_to_id = UNSET
        elif isinstance(self.reply_to_id, UUID):
            reply_to_id = str(self.reply_to_id)
        else:
            reply_to_id = self.reply_to_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "content": content,
                "targetType": target_type,
                "targetId": target_id,
                "createdAt": created_at,
                "verified": verified,
                "userId": user_id,
                "user": user,
            }
        )
        if root_id is not UNSET:
            field_dict["rootId"] = root_id
        if reply_to_id is not UNSET:
            field_dict["replyToId"] = reply_to_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.user_read import UserRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        content = d.pop("content")

        target_type = CommentTargetType(d.pop("targetType"))

        target_id = UUID(d.pop("targetId"))

        created_at = isoparse(d.pop("createdAt"))

        verified = d.pop("verified")

        user_id = UUID(d.pop("userId"))

        user = UserRead.from_dict(d.pop("user"))

        def _parse_root_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                root_id_type_0 = UUID(data)

                return root_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        root_id = _parse_root_id(d.pop("rootId", UNSET))

        def _parse_reply_to_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                reply_to_id_type_0 = UUID(data)

                return reply_to_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        reply_to_id = _parse_reply_to_id(d.pop("replyToId", UNSET))

        comment_read = cls(
            id=id,
            content=content,
            target_type=target_type,
            target_id=target_id,
            created_at=created_at,
            verified=verified,
            user_id=user_id,
            user=user,
            root_id=root_id,
            reply_to_id=reply_to_id,
        )

        comment_read.additional_properties = d
        return comment_read

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
