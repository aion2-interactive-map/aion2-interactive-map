from palworld.maps.cluster import cluster_points


def test_merges_points_within_radius():
    pts = [{"x": 100, "y": 100, "z": 0, "key": "a"}, {"x": 150, "y": 100, "z": 0, "key": "b"}]
    out = cluster_points(pts, 200)
    assert len(out) == 1
    assert out[0]["x"] == 125
    assert out[0]["y"] == 100
    assert [p["key"] for p in out[0]["items"]] == ["a", "b"]


def test_keeps_far_apart_points_separate():
    out = cluster_points([{"x": 0, "y": 0, "z": 0}, {"x": 1000, "y": 1000, "z": 0}], 200)
    assert len(out) == 2


def test_deterministic_under_shuffling():
    pts = [{"x": (i * 137) % 900, "y": (i * 251) % 900, "z": 0, "key": str(i)} for i in range(50)]
    a = [[c["x"], c["y"], len(c["items"])] for c in cluster_points(pts, 200)]
    b = [[c["x"], c["y"], len(c["items"])] for c in cluster_points(list(reversed(pts)), 200)]
    assert a == b


def test_rounds_centroid_to_2_decimals():
    out = cluster_points([{"x": 0.111, "y": 0.111, "z": 0}, {"x": 0.115, "y": 0.115, "z": 0}], 200)
    assert out[0]["x"] == 0.11
