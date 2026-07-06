import json
import os
from pathlib import Path

import pytest

from palworld.encyclopedia import ELEMENTS, WORK_TYPES, run_encyclopedia

RAW = Path(os.environ.get("PALWORLD_RAW", "E:/SteamLibrary/steamapps/common/Palworld/Exports/Pal/Content/Pal"))


@pytest.mark.skipif(not RAW.exists(), reason="raw Palworld export not available")
def test_encyclopedia_integration(tmp_path):
    data_out, res_out = tmp_path / "data", tmp_path / "res"
    out = run_encyclopedia(RAW, data_out, res_out)
    pals, passives = out["pals"], out["passives"]
    by_id = {p["id"]: p for p in pals}

    # Roster matches the breeding stage's catalogued-Pal filter.
    assert len(pals) == 286
    assert all(p["zukanIndex"] >= 1 and p["icon"].startswith("T_") for p in pals)

    # A known Pal's stats / elements / work / drops / learnset.
    anubis = by_id["Anubis"]
    assert anubis["elements"] == ["Earth"]
    assert anubis["genus"] == "Humanoid"
    assert anubis["stats"]["hp"] == 120
    assert anubis["work"]["Handcraft"] == 6 and anubis["bestWork"] == "Handcraft"
    assert len(anubis["activeSkills"]) >= 1
    assert anubis["activeSkills"][0]["level"] <= anubis["activeSkills"][-1]["level"]
    assert any(d["item"] == "Bone" for d in anubis["drops"])

    # Every Pal has a learnset and a localized partner-skill name.
    assert all(p["activeSkills"] for p in pals)

    # Global passive list: the 115 displayable, each with a rank and effects list.
    assert len(passives) == 115
    assert all("rank" in p and isinstance(p["effects"], list) for p in passives)

    # Locale files: 17 languages, non-mojibake real text for a known Pal.
    en_pals = json.loads((data_out / "locales/en-US/pals.json").read_text(encoding="utf-8"))
    assert en_pals["Anubis"]["name"] == "Anubis"
    assert en_pals["Anubis"]["description"]
    assert en_pals["Anubis"]["partnerSkill"]["name"]
    zh_name = json.loads((data_out / "locales/zh-CN/pals.json").read_text(encoding="utf-8"))["Anubis"]["name"]
    assert zh_name and all("一" <= c <= "鿿" for c in zh_name)  # real CJK, not JA base
    en_enums = json.loads((data_out / "locales/en-US/enums.json").read_text(encoding="utf-8"))
    assert en_enums["elements"]["Fire"] == "Fire" and en_enums["work"]["Mining"]

    # Icons: 9 elements + 13 colored work suitabilities (all WORK_TYPES).
    assert {p.name for p in (res_out / "icons").glob("element_*.webp")} == {f"element_{e}.webp" for e in ELEMENTS}
    work_icons = {p.name for p in (res_out / "icons").glob("work_*.webp")}
    assert work_icons == {f"work_{w}.webp" for w in WORK_TYPES}
