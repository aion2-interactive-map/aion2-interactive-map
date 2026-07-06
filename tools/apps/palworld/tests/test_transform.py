import pytest

from palworld.maps.bounds import assign_map
from palworld.maps.orientation import Orientation
from palworld.maps.transform import make_inverse_transform, make_transform

BOUNDS = {"min": {"X": -1099400, "Y": -724400}, "max": {"X": 349400, "Y": 724400}}


def test_maps_corners_with_identity_orientation():
    t = make_transform(BOUNDS, Orientation("X", False, False), 8192, 8192)
    assert t({"X": -1099400, "Y": -724400}) == pytest.approx((0, 0))
    assert t({"X": 349400, "Y": 724400}) == pytest.approx((8192, 8192))


def test_swaps_axes_when_px_axis_is_y():
    t = make_transform(BOUNDS, Orientation("Y", False, False), 8192, 8192)
    assert t({"X": -1099400, "Y": 724400}) == pytest.approx((8192, 0))


def test_applies_flips():
    t = make_transform(BOUNDS, Orientation("X", True, True), 8192, 8192)
    assert t({"X": -1099400, "Y": -724400}) == pytest.approx((8192, 8192))


@pytest.mark.parametrize("o", [
    Orientation("X", False, False),
    Orientation("Y", False, True),
    Orientation("Y", True, True),
])
def test_inverse_round_trips(o):
    fwd = make_transform(BOUNDS, o, 8192, 8192)
    inv = make_inverse_transform(BOUNDS, o, 8192, 8192)
    for w in [{"X": -375000, "Y": 0}, {"X": 12345.6, "Y": -98765.4}, {"X": 200000, "Y": 500000}]:
        px, py = fwd(w)
        back = inv(px, py)
        assert back["X"] == pytest.approx(w["X"], abs=1e-3)
        assert back["Y"] == pytest.approx(w["Y"], abs=1e-3)


MAPS = [
    {"mapId": "WorldTree", "min": {"X": 347351.5, "Y": -818197}, "max": {"X": 689148.5, "Y": -476400}},
    {"mapId": "MainWorld", "min": {"X": -1099400, "Y": -724400}, "max": {"X": 349400, "Y": 724400}},
]


def test_assign_map():
    assert assign_map({"X": 500000, "Y": -600000}, MAPS) == "WorldTree"  # Tree tried first
    assert assign_map({"X": 0, "Y": 0}, MAPS) == "MainWorld"
    assert assign_map({"X": 9e6, "Y": 9e6}, MAPS) is None
