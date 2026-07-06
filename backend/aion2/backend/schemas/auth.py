from altcha.altcha import AlgoType
from aion2.backend.schemas.base import BaseModel

class AltchaChallenge(BaseModel):
    algorithm: AlgoType
    challenge: str
    max_number: int
    salt: str
    signature: str