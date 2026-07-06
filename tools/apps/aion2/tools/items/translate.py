from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from opencc import OpenCC


BASE_DIR = Path(__file__).resolve().parent
CFG_DIR = BASE_DIR / "opencc_config"

CUSTOM_MAP_PATH = CFG_DIR / "custom_map.txt"
PROTECT_PATH = CFG_DIR / "protect_phrases.txt"  # optional

cc_t2s = OpenCC("t2s")


def _token(i: int) -> str:
    return f"\uE000{i}\uE001"  # private-use markers unlikely to appear in text


def load_custom_map(path: Path) -> list[tuple[str, str]]:
    """
    Load SOURCE=TARGET pairs. Longest SOURCE first to avoid partial overlaps.
    """
    if not path.exists():
        return []

    pairs: list[tuple[str, str]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if "=" not in s:
            raise ValueError(f"Invalid custom_map line (missing '='): {s}")
        src, dst = s.split("=", 1)
        src = src.strip()
        dst = dst.strip()
        if not src:
            continue
        pairs.append((src, dst))

    pairs.sort(key=lambda x: len(x[0]), reverse=True)
    return pairs


def load_protected_phrases(path: Path) -> list[str]:
    if not path.exists():
        return []
    phrases: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        phrases.append(s)
    phrases.sort(key=len, reverse=True)
    return phrases


CUSTOM_MAP = load_custom_map(CUSTOM_MAP_PATH)
PROTECTED = load_protected_phrases(PROTECT_PATH)


def apply_custom_map_then_opencc(s: str) -> str:
    """
    1) Apply custom SOURCE=TARGET phrase rewrites.
       - The TARGET is protected by tokens so OpenCC won't re-convert it.
    2) Apply "protected phrases" (kept unchanged) via tokens.
    3) Run OpenCC t2s.
    4) Restore tokens.
    """
    token_to_text: dict[str, str] = {}
    tmp = s
    tok_idx = 0

    # (1) Custom map: replace SOURCE with a token that stands for TARGET
    for src, dst in CUSTOM_MAP:
        if src in tmp:
            t = _token(tok_idx)
            tok_idx += 1
            tmp = tmp.replace(src, t)
            token_to_text[t] = dst

    # (2) Protected phrases: replace phrase with token that restores the original phrase
    for phrase in PROTECTED:
        if phrase in tmp:
            t = _token(tok_idx)
            tok_idx += 1
            tmp = tmp.replace(phrase, t)
            token_to_text[t] = phrase

    # (3) OpenCC conversion
    converted = cc_t2s.convert(tmp)

    # (4) Restore tokens
    for t, text in token_to_text.items():
        converted = converted.replace(t, text)

    return converted


def convert_obj(obj: Any) -> Any:
    if isinstance(obj, str):
        return apply_custom_map_then_opencc(obj)
    if isinstance(obj, list):
        return [convert_obj(x) for x in obj]
    if isinstance(obj, dict):
        return {convert_obj(k): convert_obj(v) for k, v in obj.items()}
    return obj


def translate_json(input_path: Path, output_path: Path) -> None:
    with input_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    converted = convert_obj(data)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(converted, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    # Sanity checks for your requirement
    print("乾龍王 ->", apply_custom_map_then_opencc("乾龍王"))  # expect 乾龙王
    print("乾燥 ->", apply_custom_map_then_opencc("乾燥"))      # expect 干燥
    print("開放中文轉換 ->", apply_custom_map_then_opencc("開放中文轉換"))  # expect 开放中文转换

    for name in ("items", "categories", "classes", "grades", "servers"):
        translate_json(
            input_path=BASE_DIR / f"{name}.zh-TW.json",
            output_path=BASE_DIR / f"{name}.zh-CN.json",
        )
