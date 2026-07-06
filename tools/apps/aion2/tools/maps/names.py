import re


def tokens(s: str) -> frozenset[str]:
    s = s.replace("_", " ")
    s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", s)   # split camelCase
    return frozenset(t.lower() for t in s.split() if t)
