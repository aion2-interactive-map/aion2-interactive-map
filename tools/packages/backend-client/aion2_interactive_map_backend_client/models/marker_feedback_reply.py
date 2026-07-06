from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.marker_feedback_status import MarkerFeedbackStatus
from ..models.marker_feedback_type import MarkerFeedbackType
from ..types import UNSET, Unset

T = TypeVar("T", bound="MarkerFeedbackReply")


@_attrs_define
class MarkerFeedbackReply:
    """
    Attributes:
        subtype_id (None | str | UUID):
        type_ (MarkerFeedbackType | Unset):
        marker_id (None | Unset | UUID):
        x (int | None | Unset):
        y (int | None | Unset):
        name (None | str | Unset):
        description (None | str | Unset):
        status (MarkerFeedbackStatus | Unset):
        reply (str | Unset):  Default: ''.
        language (str | Unset):  Default: 'zh-CN'.
    """

    subtype_id: None | str | UUID
    type_: MarkerFeedbackType | Unset = UNSET
    marker_id: None | Unset | UUID = UNSET
    x: int | None | Unset = UNSET
    y: int | None | Unset = UNSET
    name: None | str | Unset = UNSET
    description: None | str | Unset = UNSET
    status: MarkerFeedbackStatus | Unset = UNSET
    reply: str | Unset = ""
    language: str | Unset = "zh-CN"
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        subtype_id: None | str
        if isinstance(self.subtype_id, UUID):
            subtype_id = str(self.subtype_id)
        else:
            subtype_id = self.subtype_id

        type_: str | Unset = UNSET
        if not isinstance(self.type_, Unset):
            type_ = self.type_.value

        marker_id: None | str | Unset
        if isinstance(self.marker_id, Unset):
            marker_id = UNSET
        elif isinstance(self.marker_id, UUID):
            marker_id = str(self.marker_id)
        else:
            marker_id = self.marker_id

        x: int | None | Unset
        if isinstance(self.x, Unset):
            x = UNSET
        else:
            x = self.x

        y: int | None | Unset
        if isinstance(self.y, Unset):
            y = UNSET
        else:
            y = self.y

        name: None | str | Unset
        if isinstance(self.name, Unset):
            name = UNSET
        else:
            name = self.name

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        reply = self.reply

        language = self.language

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "subtypeId": subtype_id,
            }
        )
        if type_ is not UNSET:
            field_dict["type"] = type_
        if marker_id is not UNSET:
            field_dict["markerId"] = marker_id
        if x is not UNSET:
            field_dict["x"] = x
        if y is not UNSET:
            field_dict["y"] = y
        if name is not UNSET:
            field_dict["name"] = name
        if description is not UNSET:
            field_dict["description"] = description
        if status is not UNSET:
            field_dict["status"] = status
        if reply is not UNSET:
            field_dict["reply"] = reply
        if language is not UNSET:
            field_dict["language"] = language

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_subtype_id(data: object) -> None | str | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                subtype_id_type_0 = UUID(data)

                return subtype_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | str | UUID, data)

        subtype_id = _parse_subtype_id(d.pop("subtypeId"))

        _type_ = d.pop("type", UNSET)
        type_: MarkerFeedbackType | Unset
        if isinstance(_type_, Unset):
            type_ = UNSET
        else:
            type_ = MarkerFeedbackType(_type_)

        def _parse_marker_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                marker_id_type_0 = UUID(data)

                return marker_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        marker_id = _parse_marker_id(d.pop("markerId", UNSET))

        def _parse_x(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        x = _parse_x(d.pop("x", UNSET))

        def _parse_y(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        y = _parse_y(d.pop("y", UNSET))

        def _parse_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        name = _parse_name(d.pop("name", UNSET))

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        _status = d.pop("status", UNSET)
        status: MarkerFeedbackStatus | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = MarkerFeedbackStatus(_status)

        reply = d.pop("reply", UNSET)

        language = d.pop("language", UNSET)

        marker_feedback_reply = cls(
            subtype_id=subtype_id,
            type_=type_,
            marker_id=marker_id,
            x=x,
            y=y,
            name=name,
            description=description,
            status=status,
            reply=reply,
            language=language,
        )

        marker_feedback_reply.additional_properties = d
        return marker_feedback_reply

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
