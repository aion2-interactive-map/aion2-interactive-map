from enum import Enum


class CommentTargetType(str, Enum):
    MARKER = "marker"

    def __str__(self) -> str:
        return str(self.value)
