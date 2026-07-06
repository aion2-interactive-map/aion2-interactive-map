from aion2.tools.maps.calibrate import calibrate


def test_calibrate_world_l_a_finds_low_residual_orientation():
    result = calibrate("World_L_A")
    # Enough subzone<->subzone-group names match exactly to calibrate
    assert result.num_matches >= 8
    # Subzone groups span hundreds of px; the correct orientation aligns centroids tightly.
    assert result.residual_px < 300.0
    # The second-best orientation must be clearly worse — proves the fit is discriminative.
    assert result.runner_up_residual_px > 2.0 * result.residual_px
