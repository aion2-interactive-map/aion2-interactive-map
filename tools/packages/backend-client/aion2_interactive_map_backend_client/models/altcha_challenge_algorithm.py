from enum import Enum


class AltchaChallengeAlgorithm(str, Enum):
    SHA_1 = "SHA-1"
    SHA_256 = "SHA-256"
    SHA_512 = "SHA-512"

    def __str__(self) -> str:
        return str(self.value)
