from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.altcha_challenge_algorithm import AltchaChallengeAlgorithm

T = TypeVar("T", bound="AltchaChallenge")


@_attrs_define
class AltchaChallenge:
    """
    Attributes:
        algorithm (AltchaChallengeAlgorithm):
        challenge (str):
        max_number (int):
        salt (str):
        signature (str):
    """

    algorithm: AltchaChallengeAlgorithm
    challenge: str
    max_number: int
    salt: str
    signature: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        algorithm = self.algorithm.value

        challenge = self.challenge

        max_number = self.max_number

        salt = self.salt

        signature = self.signature

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "algorithm": algorithm,
                "challenge": challenge,
                "maxNumber": max_number,
                "salt": salt,
                "signature": signature,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        algorithm = AltchaChallengeAlgorithm(d.pop("algorithm"))

        challenge = d.pop("challenge")

        max_number = d.pop("maxNumber")

        salt = d.pop("salt")

        signature = d.pop("signature")

        altcha_challenge = cls(
            algorithm=algorithm,
            challenge=challenge,
            max_number=max_number,
            salt=salt,
            signature=signature,
        )

        altcha_challenge.additional_properties = d
        return altcha_challenge

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
