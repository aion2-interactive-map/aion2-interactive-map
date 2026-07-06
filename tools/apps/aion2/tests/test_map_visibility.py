from tools.maps.emit_frontend import MAP_META


def test_world_b_maps_are_visible():
    assert MAP_META["World_L_B"]["isVisible"] is True
    assert MAP_META["World_D_B"]["isVisible"] is True


def test_reshanta_b_is_removed():
    # Abyss_Reshanta_B was dropped from the game (absent from Map.json and
    # Data/WorldMap), so it is no longer a published map at all.
    assert "Abyss_Reshanta_B" not in MAP_META


def test_new_abyss_maps_are_visible():
    # Added with the map update: a new open-world Reshanta layer and the
    # Abyss Rift battlefield.
    assert MAP_META["Abyss_Reshanta_D"]["isVisible"] is True
    assert MAP_META["Abyss_Battlefield_A"]["isVisible"] is True


def test_b_maps_are_ordered_first():
    # World_L_B / World_D_B lead the map list (the newest content maps).
    assert MAP_META["World_L_B"]["order"] == 0
    assert MAP_META["World_D_B"]["order"] == 1
