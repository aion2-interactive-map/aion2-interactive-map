from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.marker_feedback_status import MarkerFeedbackStatus
from ..models.marker_feedback_type import MarkerFeedbackType
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.image_read import ImageRead
    from ..models.user_read import UserRead


T = TypeVar("T", bound="MarkerFeedbackRead")


@_attrs_define
class MarkerFeedbackRead:
    """
    Attributes:
        id (UUID):
        map_id (UUID):
        subtype_id (None | UUID):
        marker_id (None | UUID):
        image_id (None | UUID):
        user_id (UUID):
        type_ (MarkerFeedbackType):
        status (MarkerFeedbackStatus):
        user (UserRead):
        x (int | None | Unset):
        y (int | None | Unset):
        name (None | str | Unset):
        description (None | str | Unset):
        reply (None | str | Unset):
        image (ImageRead | None | Unset):
    """

    id: UUID
    map_id: UUID
    subtype_id: None | UUID
    marker_id: None | UUID
    image_id: None | UUID
    user_id: UUID
    type_: MarkerFeedbackType
    status: MarkerFeedbackStatus
    user: UserRead
    x: int | None | Unset = UNSET
    y: int | None | Unset = UNSET
    name: None | str | Unset = UNSET
    description: None | str | Unset = UNSET
    reply: None | str | Unset = UNSET
    image: ImageRead | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.image_read import ImageRead

        id = str(self.id)

        map_id = str(self.map_id)

        subtype_id: None | str
        if isinstance(self.subtype_id, UUID):
            subtype_id = str(self.subtype_id)
        else:
            subtype_id = self.subtype_id

        marker_id: None | str
        if isinstance(self.marker_id, UUID):
            marker_id = str(self.marker_id)
        else:
            marker_id = self.marker_id

        image_id: None | str
        if isinstance(self.image_id, UUID):
            image_id = str(self.image_id)
        else:
            image_id = self.image_id

        user_id = str(self.user_id)

        type_ = self.type_.value

        status = self.status.value

        user = self.user.to_dict()

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

        reply: None | str | Unset
        if isinstance(self.reply, Unset):
            reply = UNSET
        else:
            reply = self.reply

        image: dict[str, Any] | None | Unset
        if isinstance(self.image, Unset):
            image = UNSET
        elif isinstance(self.image, ImageRead):
            image = self.image.to_dict()
        else:
            image = self.image

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "mapId": map_id,
                "subtypeId": subtype_id,
                "markerId": marker_id,
                "imageId": image_id,
                "userId": user_id,
                "type": type_,
                "status": status,
                "user": user,
            }
        )
        if x is not UNSET:
            field_dict["x"] = x
        if y is not UNSET:
            field_dict["y"] = y
        if name is not UNSET:
            field_dict["name"] = name
        if description is not UNSET:
            field_dict["description"] = description
        if reply is not UNSET:
            field_dict["reply"] = reply
        if image is not UNSET:
            field_dict["image"] = image

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.image_read import ImageRead
        from ..models.user_read import UserRead

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        map_id = UUID(d.pop("mapId"))

        def _parse_subtype_id(data: object) -> None | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                subtype_id_type_0 = UUID(data)

                return subtype_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | UUID, data)

        subtype_id = _parse_subtype_id(d.pop("subtypeId"))

        def _parse_marker_id(data: object) -> None | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                marker_id_type_0 = UUID(data)

                return marker_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | UUID, data)

        marker_id = _parse_marker_id(d.pop("markerId"))

        def _parse_image_id(data: object) -> None | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                image_id_type_0 = UUID(data)

                return image_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | UUID, data)

        image_id = _parse_image_id(d.pop("imageId"))

        user_id = UUID(d.pop("userId"))

        type_ = MarkerFeedbackType(d.pop("type"))

        status = MarkerFeedbackStatus(d.pop("status"))

        user = UserRead.from_dict(d.pop("user"))

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

        def _parse_reply(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        reply = _parse_reply(d.pop("reply", UNSET))

        def _parse_image(data: object) -> ImageRead | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                image_type_0 = ImageRead.from_dict(data)

                return image_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(ImageRead | None | Unset, data)

        image = _parse_image(d.pop("image", UNSET))

        marker_feedback_read = cls(
            id=id,
            map_id=map_id,
            subtype_id=subtype_id,
            marker_id=marker_id,
            image_id=image_id,
            user_id=user_id,
            type_=type_,
            status=status,
            user=user,
            x=x,
            y=y,
            name=name,
            description=description,
            reply=reply,
            image=image,
        )

        marker_feedback_read.additional_properties = d
        return marker_feedback_read

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
