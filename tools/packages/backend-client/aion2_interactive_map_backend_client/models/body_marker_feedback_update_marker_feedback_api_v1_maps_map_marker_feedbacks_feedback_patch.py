from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field
import json
from .. import types

from ..types import UNSET, Unset

from ..models.marker_feedback_type import MarkerFeedbackType
from ..types import File, FileTypes
from ..types import UNSET, Unset
from io import BytesIO
from typing import cast
from uuid import UUID






T = TypeVar("T", bound="BodyMarkerFeedbackUpdateMarkerFeedbackApiV1MapsMapMarkerFeedbacksFeedbackPatch")



@_attrs_define
class BodyMarkerFeedbackUpdateMarkerFeedbackApiV1MapsMapMarkerFeedbacksFeedbackPatch:
    """ 
        Attributes:
            file (File | None | Unset):
            type_ (MarkerFeedbackType | Unset):
            marker_id (None | Unset | UUID):
            subtype_id (None | str | Unset | UUID):
            x (int | None | Unset):
            y (int | None | Unset):
            name (None | str | Unset):
            description (None | str | Unset):
     """

    file: File | None | Unset = UNSET
    type_: MarkerFeedbackType | Unset = UNSET
    marker_id: None | Unset | UUID = UNSET
    subtype_id: None | str | Unset | UUID = UNSET
    x: int | None | Unset = UNSET
    y: int | None | Unset = UNSET
    name: None | str | Unset = UNSET
    description: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        file: FileTypes | None | Unset
        if isinstance(self.file, Unset):
            file = UNSET
        elif isinstance(self.file, File):
            file = self.file.to_tuple()

        else:
            file = self.file

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

        subtype_id: None | str | Unset
        if isinstance(self.subtype_id, Unset):
            subtype_id = UNSET
        elif isinstance(self.subtype_id, UUID):
            subtype_id = str(self.subtype_id)
        else:
            subtype_id = self.subtype_id

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


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if file is not UNSET:
            field_dict["file"] = file
        if type_ is not UNSET:
            field_dict["type"] = type_
        if marker_id is not UNSET:
            field_dict["marker_id"] = marker_id
        if subtype_id is not UNSET:
            field_dict["subtype_id"] = subtype_id
        if x is not UNSET:
            field_dict["x"] = x
        if y is not UNSET:
            field_dict["y"] = y
        if name is not UNSET:
            field_dict["name"] = name
        if description is not UNSET:
            field_dict["description"] = description

        return field_dict


    def to_multipart(self) -> types.RequestFiles:
        files: types.RequestFiles = []

        if not isinstance(self.file, Unset):
            if isinstance(self.file, File):

                files.append(("file", self.file.to_tuple()))
            else:
                files.append(("file", (None, str(self.file).encode(), "text/plain")))


        if not isinstance(self.type_, Unset):
            files.append(("type",  (None, str(self.type_.value).encode(), "text/plain")))



        if not isinstance(self.marker_id, Unset):
            if isinstance(self.marker_id, UUID):

                files.append(("marker_id", (None, str(self.marker_id), "text/plain")))
            else:
                files.append(("marker_id", (None, str(self.marker_id).encode(), "text/plain")))


        if not isinstance(self.subtype_id, Unset):
            if isinstance(self.subtype_id, UUID):

                files.append(("subtype_id", (None, str(self.subtype_id), "text/plain")))
            elif isinstance(self.subtype_id, str):

                files.append(("subtype_id", (None, str(self.subtype_id).encode(), "text/plain")))
            else:
                files.append(("subtype_id", (None, str(self.subtype_id).encode(), "text/plain")))


        if not isinstance(self.x, Unset):
            if isinstance(self.x, int):

                files.append(("x", (None, str(self.x).encode(), "text/plain")))
            else:
                files.append(("x", (None, str(self.x).encode(), "text/plain")))


        if not isinstance(self.y, Unset):
            if isinstance(self.y, int):

                files.append(("y", (None, str(self.y).encode(), "text/plain")))
            else:
                files.append(("y", (None, str(self.y).encode(), "text/plain")))


        if not isinstance(self.name, Unset):
            if isinstance(self.name, str):

                files.append(("name", (None, str(self.name).encode(), "text/plain")))
            else:
                files.append(("name", (None, str(self.name).encode(), "text/plain")))


        if not isinstance(self.description, Unset):
            if isinstance(self.description, str):

                files.append(("description", (None, str(self.description).encode(), "text/plain")))
            else:
                files.append(("description", (None, str(self.description).encode(), "text/plain")))



        for prop_name, prop in self.additional_properties.items():
            files.append((prop_name, (None, str(prop).encode(), "text/plain")))



        return files


    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        def _parse_file(data: object) -> File | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, bytes):
                    raise TypeError()
                file_type_0 = File(
                     payload = BytesIO(data)
                )



                return file_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(File | None | Unset, data)

        file = _parse_file(d.pop("file", UNSET))


        _type_ = d.pop("type", UNSET)
        type_: MarkerFeedbackType | Unset
        if isinstance(_type_,  Unset):
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

        marker_id = _parse_marker_id(d.pop("marker_id", UNSET))


        def _parse_subtype_id(data: object) -> None | str | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                subtype_id_type_0 = UUID(data)



                return subtype_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | str | Unset | UUID, data)

        subtype_id = _parse_subtype_id(d.pop("subtype_id", UNSET))


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


        body_marker_feedback_update_marker_feedback_api_v1_maps_map_marker_feedbacks_feedback_patch = cls(
            file=file,
            type_=type_,
            marker_id=marker_id,
            subtype_id=subtype_id,
            x=x,
            y=y,
            name=name,
            description=description,
        )


        body_marker_feedback_update_marker_feedback_api_v1_maps_map_marker_feedbacks_feedback_patch.additional_properties = d
        return body_marker_feedback_update_marker_feedback_api_v1_maps_map_marker_feedbacks_feedback_patch

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
