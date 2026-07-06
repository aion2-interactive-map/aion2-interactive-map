from enum import Enum


class MarkerFeedbackStatus(str, Enum):
    ACCEPTED = "accepted"
    DELETED = "deleted"
    PENDING = "pending"
    REJECTED = "rejected"
    REVISION = "revision"

    def __str__(self) -> str:
        return str(self.value)
