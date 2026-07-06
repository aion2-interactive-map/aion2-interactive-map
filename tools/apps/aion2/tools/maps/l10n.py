"""L10N resolver. en-US/ko-KR directly; zh-CN derived from zh-TW via opencc (t2s)."""
import json
from pathlib import Path

from opencc import OpenCC

from . import RAW_ROOT

_L10N_DIR = RAW_ROOT / "Data" / "Table" / "L10N"


class L10N:
    def __init__(self):
        self._en = json.loads((_L10N_DIR / "en-US" / "L10NString.json").read_text(encoding="utf-8"))["Entries"]
        self._ko = json.loads((_L10N_DIR / "ko-KR" / "L10NString.json").read_text(encoding="utf-8"))["Entries"]
        self._tw = json.loads((_L10N_DIR / "zh-TW" / "L10NString.json").read_text(encoding="utf-8"))["Entries"]
        self._cc = OpenCC("t2s")

    @staticmethod
    def _lookup(tbl, key: str) -> str:
        if not key or key == "None":
            return ""
        for k in (key, f"String_{key}_body", f"{key}_body", f"String_{key}"):
            if k in tbl:
                return tbl[k]
        return ""

    def en(self, key: str) -> str:
        return self._lookup(self._en, key)

    def zh_cn(self, key: str) -> str:
        v = self._lookup(self._tw, key)
        return self._cc.convert(v) if v else ""

    def ko(self, key: str) -> str:
        return self._lookup(self._ko, key)
