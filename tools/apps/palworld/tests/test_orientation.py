import pytest

from palworld.maps.orientation import ORIENTATIONS, Orientation
from palworld.maps.transform import make_transform


def test_per_map_orientations_are_calibrated():
    assert ORIENTATIONS["MainWorld"] == Orientation("Y", False, True)
    assert ORIENTATIONS["WorldTree"] == Orientation("Y", False, True)


def test_golden_pixels_for_known_statues():
    bounds = {"min": {"X": -1099400, "Y": -724400}, "max": {"X": 349400, "Y": 724400}}
    t = make_transform(bounds, ORIENTATIONS["MainWorld"], 8192, 8192)
    assert t({"X": -108666.75, "Y": 79119.87}) == pytest.approx((4543.370220209828, 2590.062683600221), abs=1e-6)
    assert t({"X": -302825, "Y": 241060}) == pytest.approx((5459.0339039204855, 3687.8983986747653), abs=1e-6)
