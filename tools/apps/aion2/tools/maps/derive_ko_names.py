"""Derive curated Korean subtype names from official AION2 L10N.

Run:
    RAW_DATA_PATH=E:/Exports/AION2/Content uv run python -m aion2.tools.maps.derive_ko_names

The script exact-matches each curated English subtype label against
``en-US/L10NString.json``, reads the same key from ``ko-KR/L10NString.json``,
and prints the Korean values to paste into ``emit_frontend.py``. Ambiguous
English labels print all candidates and the selected most name-like key.

Derived mapping output from ``RAW_DATA_PATH=E:/Exports/AION2/Content``:

EXTRA_SUBTYPE_NAMES:
  hiddenCube = 히든 큐브
  fragments = 모노리스
  dungeon = 던전
  boss = 보스
  occupation = NO MATCH for "Garrison"

GATHER_SUBTYPE_NAMES:
  gatheringOdyle = 오드
  gatheringOrichalcumOre = 오리하르콘
  gatheringYggdrasilLog = 이그드라실
  gatheringSapphireGemstone = 사파이어
  gatheringDiamondGemstone = 다이아몬드
  gatheringRubyGemstone = 루비
  gatheringAria = 안젤리카
  gatheringTargena = 타라곤
  gatheringCoriolus = 코리올루스
  gatheringKukuru = 쿠쿠르
  gatheringMela = 멜라
  gatheringInina = 쉐리
  gatheringCypri = 킬리
  gatheringAsvata = 아스바타
  gatheringAzpha = 안누스
  gatheringCalendula = 카렌두라
  gatheringMorfa = 모르파
  gatheringRaydam = 레이담
  gatheringPujery = 푸제리
  gatheringOhkra = 오크라
  gatheringConide = 코니데
  gatheringOd = 오드
  gatheringHerb = 약초
  gatheringJewelry = NO MATCH for "Gemstone"
  gatheringMetal = 금속
  gatheringRareMetal = NO MATCH for "Rare Metal"
  gatheringTree = NO MATCH for "Wood"
  gatheringFlower = 플라워
  gatheringBerry = NO MATCH for "Berry"
  gatheringVegetable = 채소
  gatheringShellfish = NO MATCH for "Shellfish"
"""
from __future__ import annotations

import json
import sys

from . import RAW_ROOT
from .emit_frontend import EXTRA_SUBTYPE_NAMES, GATHER_SUBTYPE_NAMES

_L10N_DIR = RAW_ROOT / "Data" / "Table" / "L10N"


def _entries(lang: str) -> dict[str, str]:
    path = _L10N_DIR / lang / "L10NString.json"
    return json.loads(path.read_text(encoding="utf-8"))["Entries"]


def _score_key(key: str) -> tuple[int, int, str]:
    upper = key.upper()
    prefixes = (
        "STR_ITEM_NAME_",
        "ENVOBJDATA_GATHER_",
        "ENVOBJDATA_BASIC_",
        "ENVOBJDATA_",
        "STRING_UI_WORLDMAP_LIST_FILTER_CONTENT_",
        "STRING_STR_GATHERSOURCETYPE_",
        "STRING_UI_GATHERSKILLCATEGORY_",
        "STRING_UI_GATHER_SKILL_CHART_",
        "STR_GATHER_",
        "STR_ENVOBJ_",
        "STRING_STR_ENVOBJ_",
        "STRING_",
    )
    rank = next((i for i, prefix in enumerate(prefixes) if upper.startswith(prefix)), len(prefixes))
    return rank, len(key), key


def _derive_one(en_entries: dict[str, str], ko_entries: dict[str, str], value: str):
    candidates = [(key, ko_entries.get(key, "")) for key, text in en_entries.items() if text == value]
    candidates = [(key, ko) for key, ko in candidates if ko]
    if not candidates:
        return None, []
    ko_values = {ko for _, ko in candidates}
    if len(ko_values) == 1:
        return candidates[0], candidates
    chosen = min(candidates, key=lambda kv: _score_key(kv[0]))
    return chosen, candidates


def _emit(label: str, table: dict[str, dict], en_entries: dict[str, str], ko_entries: dict[str, str]) -> None:
    print(f"{label}:")
    for subtype, names in table.items():
        chosen, candidates = _derive_one(en_entries, ko_entries, names["en"])
        if chosen is None:
            print(f"  {subtype}: NO MATCH for {names['en']!r}")
            continue
        key, ko = chosen
        if len({candidate_ko for _, candidate_ko in candidates}) > 1:
            print(f"  {subtype}: {ko!r}  # picked {key}")
            for candidate_key, candidate_ko in sorted(candidates, key=lambda kv: _score_key(kv[0])):
                print(f"    candidate {candidate_key}: {candidate_ko!r}")
        else:
            print(f"  {subtype}: {ko!r}  # {key}")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    en_entries = _entries("en-US")
    ko_entries = _entries("ko-KR")
    _emit("EXTRA_SUBTYPE_NAMES", EXTRA_SUBTYPE_NAMES, en_entries, ko_entries)
    _emit("GATHER_SUBTYPE_NAMES", GATHER_SUBTYPE_NAMES, en_entries, ko_entries)


if __name__ == "__main__":
    main()
