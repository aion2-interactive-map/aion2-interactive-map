"""Asserts on the regenerated data/ repo. Run AFTER the emitter (Step 3)."""
import json
import os
from pathlib import Path

# Sibling `data/` repo (same resolution as emit_frontend's DATA_REPO):
# .../tools/apps/aion2/tests/this_file -> parents[4] == .../<workspace> -> /data.
# Override with DATA_REPO for a non-standard layout.
DATA = Path(os.environ.get("DATA_REPO") or (Path(__file__).resolve().parents[4] / "data"))


def _locale(lng):
    return json.loads((DATA / "locales" / lng / "maps.json").read_text(encoding="utf-8"))


def test_locales_are_localized_and_differ_across_languages():
    en, zh = _locale("en"), _locale("zh-CN")
    assert en["World_L_A"]["name"] == "Verteron (Elyos)"
    assert zh["World_L_A"]["name"].endswith("（天）")
    assert zh["World_L_A"]["name"] != en["World_L_A"]["name"]


def test_starter_and_b_maps_localized():
    en = _locale("en")
    assert en["World_L_Starter"]["name"] == "Poeta (Elyos)"
    assert en["World_D_Starter"]["name"] == "Ishalgen (Asmodian)"
    assert en["World_L_B"]["name"] == "Eltnen (Elyos)"
    assert en["World_D_B"]["name"] == "Morheim (Asmodian)"


def test_zh_tw_differs_from_zh_cn():
    cn, tw = _locale("zh-CN"), _locale("zh-TW")
    assert tw["World_L_A"]["name"] != cn["World_L_A"]["name"]


def test_generated_maps_json_visibility():
    maps = {m["name"]: m for m in
            json.loads((DATA / "maps.json").read_text(encoding="utf-8"))["maps"]}
    assert maps["World_L_B"]["isVisible"] is True
    assert maps["World_D_B"]["isVisible"] is True
    # Reshanta_B was removed from the game; the new abyss maps replaced it.
    assert "Abyss_Reshanta_B" not in maps
    assert maps["Abyss_Reshanta_D"]["isVisible"] is True
    assert maps["Abyss_Battlefield_A"]["isVisible"] is True


def test_fragments_have_valid_type():
    markers = json.loads(
        (DATA / "markers" / "World_L_A.json").read_text(encoding="utf-8")
    )["markers"]
    frags = [m for m in markers if m["subtype"] == "fragments"]
    assert frags, "expected fragment markers in World_L_A"
    assert all(m.get("fragmentType") in {"ground", "air", "water"} for m in frags)
    # World_L_A (Verteron) spawns all three kinds (ground 390 / air 120 / water 50).
    assert {"air", "water", "ground"} <= {m["fragmentType"] for m in frags}


def test_fragments_subtype_uses_real_icons():
    types = json.loads((DATA / "types.json").read_text(encoding="utf-8"))
    sub = next(
        s
        for c in types["categories"]
        for s in c["subtypes"]
        if s["name"] == "fragments"
    )
    assert sub["icon"] == "UI/Resource/Texture/Icon/UT_Marker_MonolithFragment.webp"
    assert sub["iconComplete"] == "UI/Resource/Texture/Icon/UT_Marker_MonolithFragment_Complete.webp"


def _markers(map_name):
    return json.loads(
        (DATA / "markers" / f"{map_name}.json").read_text(encoding="utf-8")
    )["markers"]


def _marker_loc(lng, map_name):
    return json.loads(
        (DATA / "locales" / lng / "markers" / f"{map_name}.json").read_text(encoding="utf-8")
    )


def _subtype_label(lng, subtype):
    types = json.loads(
        (DATA / "locales" / lng / "types.json").read_text(encoding="utf-8")
    )
    return types["subtypes"][subtype]["name"]


def test_fragment_title_is_subtype_label_and_desc_is_region_and_number():
    """Fragment title shows the subtype label ("主神痕迹"); the description is
    "<region> #<n>" with the number restarting per region."""
    import re

    markers = _markers("World_L_A")
    frags = [m for m in markers if m["subtype"] == "fragments"]
    for lng in ("en", "zh-CN", "zh-TW"):
        loc = _marker_loc(lng, "World_L_A")
        label = _subtype_label(lng, "fragments")
        per_region = {}
        for m in frags:
            entry = loc[m["id"]]
            assert entry["name"] == label, (lng, m["id"], entry["name"])
            # description ends with " #<n>" and is NOT just the bare region name.
            assert re.search(r" #\d+$", entry["description"]), (lng, entry)
            per_region.setdefault(m["region"], []).append(entry["description"])
        # Every region's fragments number from #1 upward, contiguously.
        for region, descs in per_region.items():
            nums = [int(d.rsplit("#", 1)[1]) for d in descs]
            assert nums == list(range(1, len(nums) + 1)), (region, nums[:5])


def test_hidden_cube_title_is_label_and_desc_is_number():
    markers = _markers("World_L_A")
    cubes = [m for m in markers if m["subtype"] == "hiddenCube"]
    assert cubes, "expected hiddenCube markers in World_L_A"
    for lng in ("en", "zh-CN", "zh-TW"):
        loc = _marker_loc(lng, "World_L_A")
        label = _subtype_label(lng, "hiddenCube")
        for m in cubes:
            entry = loc[m["id"]]
            assert entry["name"] == label, (lng, m["id"], entry["name"])
            assert entry["description"].lstrip("#").isdigit(), (lng, entry)


def test_hidden_cube_label_matches_game_l10n():
    """Game L10N term is 背包 ("Hidden Cube"), never the wrong 宝箱/揹包."""
    assert _subtype_label("en", "hiddenCube") == "Hidden Cube"
    assert _subtype_label("zh-CN", "hiddenCube") == "隐藏背包"
    assert _subtype_label("zh-TW", "hiddenCube") == "隱藏背包"
    tw = _marker_loc("zh-TW", "World_L_A")
    assert "揹" not in json.dumps(tw, ensure_ascii=False)


def test_hidden_cube_is_not_collectable():
    types = json.loads((DATA / "types.json").read_text(encoding="utf-8"))
    sub = next(
        s for c in types["categories"] for s in c["subtypes"] if s["name"] == "hiddenCube"
    )
    assert sub["canComplete"] is False
    # fragments stay collectable (icon-swap completion).
    frag = next(
        s for c in types["categories"] for s in c["subtypes"] if s["name"] == "fragments"
    )
    assert frag["canComplete"] is True
