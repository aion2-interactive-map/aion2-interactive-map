from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.error_code import ErrorCode
from ..models.error_show_type import ErrorShowType
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.server_read_list import ServerReadList


T = TypeVar("T", bound="ServerReadListResp")


@_attrs_define
class ServerReadListResp:
    """
    Attributes:
        error_code (ErrorCode):
        error_message (str | Unset):  Default: ''.
        show_type (ErrorShowType | Unset):
        data (None | ServerReadList | Unset):
    """

    error_code: ErrorCode
    error_message: str | Unset = ""
    show_type: ErrorShowType | Unset = UNSET
    data: None | ServerReadList | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.server_read_list import ServerReadList

        error_code = self.error_code.value

        error_message = self.error_message

        show_type: int | Unset = UNSET
        if not isinstance(self.show_type, Unset):
            show_type = self.show_type.value

        data: dict[str, Any] | None | Unset
        if isinstance(self.data, Unset):
            data = UNSET
        elif isinstance(self.data, ServerReadList):
            data = self.data.to_dict()
        else:
            data = self.data

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "errorCode": error_code,
            }
        )
        if error_message is not UNSET:
            field_dict["errorMessage"] = error_message
        if show_type is not UNSET:
            field_dict["showType"] = show_type
        if data is not UNSET:
            field_dict["data"] = data

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.server_read_list import ServerReadList

        d = dict(src_dict)
        error_code = ErrorCode(d.pop("errorCode"))

        error_message = d.pop("errorMessage", UNSET)

        _show_type = d.pop("showType", UNSET)
        show_type: ErrorShowType | Unset
        if isinstance(_show_type, Unset):
            show_type = UNSET
        else:
            show_type = ErrorShowType(_show_type)

        def _parse_data(data: object) -> None | ServerReadList | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                data_type_0 = ServerReadList.from_dict(data)

                return data_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | ServerReadList | Unset, data)

        data = _parse_data(d.pop("data", UNSET))

        server_read_list_resp = cls(
            error_code=error_code,
            error_message=error_message,
            show_type=show_type,
            data=data,
        )

        server_read_list_resp.additional_properties = d
        return server_read_list_resp

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
