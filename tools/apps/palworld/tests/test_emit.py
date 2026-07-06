import pytest

from palworld.maps.emit import build_dataset
from palworld.maps.orientation import Orientation
from palworld.maps.transform import make_transform

LANGUAGES = ["en-US", "ja-JP", "de-DE", "es-ES", "es-MX", "fr-FR", "id-ID", "it-IT",
             "ko-KR", "pl-PL", "pt-BR", "ru-RU", "th-TH", "tr-TR", "vi-VN", "zh-CN", "zh-TW"]


def _names_by_lang():
    m = {lng: {"Kitsunebi": f"{lng} Kitsunebi", "SheepBall": f"{lng} SheepBall"} for lng in LANGUAGES}
    m["en-US"] = {"Kitsunebi": "Foxparks", "SheepBall": "Lamball"}
    m["ko-KR"] = {"Kitsunebi": "불꽃여우", "SheepBall": "도로롱"}
    return m


PARSED = {
    "bounds": {
        "MainWorld": {"min": {"X": -1099400, "Y": -724400}, "max": {"X": 349400, "Y": 724400}},
        "WorldTree": {"min": {"X": 347351.5, "Y": -818197}, "max": {"X": 689148.5, "Y": -476400}},
    },
    "pois": [
        {"subtype": "fastTravel", "sourceName": "FT_1", "location": {"X": 0, "Y": 0, "Z": 10}},
        {"subtype": "fastTravel", "sourceName": "FT_2", "location": {"X": 400000, "Y": -600000, "Z": 10}},
        {"subtype": "copper", "sourceName": "CU_1", "location": {"X": 100, "Y": 100, "Z": 0}},
    ],
    "bosses": [
        {"key": "0", "characterId": "BOSS_Kitsunebi", "level": 12, "location": {"X": 5000, "Y": 5000, "Z": 0}},
    ],
    "palSpawns": [
        {"spawnerName": "sp1", "pals": [{"id": "SheepBall", "lvMin": 1, "lvMax": 3}], "location": {"X": 0, "Y": 0, "Z": 0}},
        {"spawnerName": "sp1", "pals": [{"id": "SheepBall", "lvMin": 1, "lvMax": 3}], "location": {"X": 50, "Y": 50, "Z": 0}},
    ],
    "namesByLang": _names_by_lang(),
    "palMeta": {
        "SheepBall": {"zukanIndex": 2, "zukanIndexSuffix": ""},
        "Kitsunebi": {"zukanIndex": 5, "zukanIndexSuffix": ""},
    },
    "palIcons": ["T_Kitsunebi_icon_normal", "T_SheepBall_icon_normal"],
}


@pytest.fixture(scope="module")
def ds():
    return build_dataset(PARSED)


def test_two_maps_with_tiling(ds):
    assert [m["id"] for m in ds["maps"]] == ["MainWorld", "WorldTree"]
    m0 = ds["maps"][0]
    assert (m0["tileWidth"], m0["tileHeight"], m0["tilesCountX"], m0["tilesCountY"], m0["isVisible"]) == (1024, 1024, 8, 8, True)


def test_markers_assigned_with_stable_ids(ds):
    ft = [m for m in ds["markers"]["MainWorld"] if m["subtype"] == "fastTravel"]
    assert len(ft) == 1
    assert ft[0]["id"] == "MainWorld-fastTravel-1"
    assert ft[0]["indexInSubtype"] == 1
    assert ft[0]["images"] == [] and ft[0]["contributors"] == []
    assert isinstance(ft[0]["z"], (int, float))
    assert len([m for m in ds["markers"]["WorldTree"] if m["subtype"] == "fastTravel"]) == 1


def test_bosses_get_icon_and_localized_lv_names(ds):
    boss = next(m for m in ds["markers"]["MainWorld"] if m["subtype"] == "alphaPal")
    assert boss["icon"] == "T_Kitsunebi_icon_normal"
    assert ds["locales"]["en-US"]["markers"]["MainWorld"][boss["id"]]["name"] == "Foxparks Lv.12"
    assert ds["locales"]["ko-KR"]["markers"]["MainWorld"][boss["id"]]["name"] == "불꽃여우 Lv.12"


def test_pal_spawns_cluster_with_lv_range(ds):
    spawns = [m for m in ds["markers"]["MainWorld"] if m["subtype"] == "SheepBall"]
    assert len(spawns) == 1
    assert spawns[0]["icon"] == "T_SheepBall_icon_normal"
    assert spawns[0]["count"] == 2
    assert ds["locales"]["en-US"]["markers"]["MainWorld"][spawns[0]["id"]]["description"] == "Lv.1–3"
    assert ds["locales"]["ko-KR"]["markers"]["MainWorld"][spawns[0]["id"]]["description"] == "Lv.1–3"


def test_publishes_world_pixel_params(ds):
    assert ds["maps"][0]["worldBounds"] == {"min": {"x": -1099400, "y": -724400}, "max": {"x": 349400, "y": 724400}}
    assert ds["maps"][0]["orientation"] == {"pxAxis": "Y", "flipX": False, "flipY": True}


def test_raw_world_coords_reproduce_pixel(ds):
    ft = next(m for m in ds["markers"]["MainWorld"] if m["id"] == "MainWorld-fastTravel-1")
    assert ft["x"] == 0 and ft["y"] == 0
    t = make_transform(PARSED["bounds"]["MainWorld"], Orientation("Y", False, True), 8192, 8192)
    px, py = t({"X": ft["x"], "Y": ft["y"]})
    assert px == pytest.approx(4096, abs=1e-3)
    assert py == pytest.approx(1975.62, abs=0.1)


def test_empty_regions_and_full_locale_trees(ds):
    assert ds["regions"]["MainWorld"] == []
    assert list(ds["locales"].keys()) == LANGUAGES
    for lng in LANGUAGES:
        assert ds["locales"][lng]["maps"]["MainWorld"]["name"]
        assert ds["locales"][lng]["types"]["subtypes"]["fastTravel"]["name"]
        assert ds["locales"][lng]["regions"]["MainWorld"] == {}
