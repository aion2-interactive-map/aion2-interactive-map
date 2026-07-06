from aion2.tools.maps.worldmap import WorldMapMeta
from aion2.tools.maps import worldmap_path


def test_worldmap_meta_from_real_world_l_a():
    meta = WorldMapMeta.from_json(worldmap_path("World_L_A"), "World_L_A")
    assert (meta.min_x, meta.min_y) == (-408000.0, -408000.0)
    assert (meta.max_x, meta.max_y) == (408000.0, 408000.0)
    assert meta.sector_count_x == 8 and meta.sector_count_y == 8
    assert meta.sector_plane_size == 1024.0
    assert meta.pixel_width == 8192.0
    assert meta.pixel_height == 8192.0
from aion2.tools.maps.transform import Orientation, ALL_ORIENTATIONS, WorldMapTransform
from aion2.tools.maps.worldmap import WorldMapMeta


def _square_meta():
    # world [0,100]^2 -> pixel [0,100]^2 for easy arithmetic
    return WorldMapMeta("T", 0.0, 0.0, 100.0, 100.0, 1, 1, 100.0)


def test_eight_orientations_exist():
    assert len(ALL_ORIENTATIONS) == 8
    assert len(set(ALL_ORIENTATIONS)) == 8


def test_identity_orientation_maps_directly():
    t = WorldMapTransform(_square_meta(), Orientation(px_from="X", flip_x=False, flip_y=False))
    assert t.world_to_pixel(50.0, 25.0) == (50.0, 25.0)
    assert t.world_to_pixel(0.0, 0.0) == (0.0, 0.0)


def test_flips_and_axis_swap():
    m = _square_meta()
    # flip_y inverts the y axis
    t = WorldMapTransform(m, Orientation("X", False, True))
    assert t.world_to_pixel(50.0, 25.0) == (50.0, 75.0)
    # px_from='Y' swaps which world axis drives pixel-x
    t2 = WorldMapTransform(m, Orientation("Y", False, False))
    assert t2.world_to_pixel(50.0, 25.0) == (25.0, 50.0)
