"""
Pure Voronoi region map with dual-colored shared borders and "high seas".

- No curve smoothing
- Shared borders: TWO very close parallel lines, one per region color.
  The line that is geometrically closer to a region uses that region's color.
- Outer borders: single line in region color
- Areas farther than MAX_SEA_DISTANCE from any point are "high seas"
  (no region borders drawn there).
- Points: radius=10, numbered per region
- Region labels inside polygons

Input:
    World_L_A.png
    World_L_A.yaml  (UTF-8, markers[*].subtype == "monolithMaterial")

Output:
    World_L_A_voronoi_dualcolor_highseas.png
"""

import json
from collections import defaultdict
import yaml
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.spatial import Voronoi
from shapely.geometry import (
    Polygon,
    MultiPolygon,
    LineString,
    MultiLineString,
    box,
    Point,
)
from shapely.ops import unary_union

MAP_NAME = "World_L_A"
IMAGE_PATH = f"{MAP_NAME}.png"
YAML_PATH = f"{MAP_NAME}.yaml"
JSON_PATH = f"{MAP_NAME}_regions.json"
OUTPUT_PATH = f"{MAP_NAME}_voronoi_dualcolor_highseas.png"

# distance cutoff for "high seas"
MAX_SEA_DISTANCE = 400.0  # tune as needed


# ---------------------------------------------------------------------
# Voronoi finite polygon conversion (NumPy 2.0 safe)
# ---------------------------------------------------------------------
def voronoi_finite_polygons_2d(vor: Voronoi, radius: float | None = None):
    if vor.points.shape[1] != 2:
        raise ValueError("Requires 2D input")

    new_vertices = vor.vertices.tolist()
    center = vor.points.mean(axis=0)

    if radius is None:
        radius = np.ptp(vor.points, axis=0).max() * 10.0

    all_ridges: dict[int, list[tuple[int, int, int]]] = {}
    for (p1, p2), (v1, v2) in zip(vor.ridge_points, vor.ridge_vertices):
        all_ridges.setdefault(p1, []).append((p2, v1, v2))
        all_ridges.setdefault(p2, []).append((p1, v1, v2))

    new_regions: list[list[int]] = []

    for p_idx, region_idx in enumerate(vor.point_region):
        region = vor.regions[region_idx]

        if -1 not in region:
            new_regions.append(region)
            continue

        ridges = all_ridges[p_idx]
        new_region = [v for v in region if v != -1]

        for p2, v1, v2 in ridges:
            if v2 < 0:
                v1, v2 = v2, v1
            if v1 != -1:
                continue

            v = vor.vertices[v2]
            d = vor.points[p2] - vor.points[p_idx]
            d = np.array([-d[1], d[0]])
            d /= np.linalg.norm(d)

            direction = np.sign(np.dot(v - center, d)) * d
            far_point = v + direction * radius
            new_vertices.append(far_point.tolist())
            new_region.append(len(new_vertices) - 1)

        vs = np.asarray(new_vertices)[new_region]
        c = vs.mean(axis=0)
        ang = np.arctan2(vs[:, 1] - c[1], vs[:, 0] - c[0])
        new_region = [v for _, v in sorted(zip(ang, new_region))]
        new_regions.append(new_region)

    return new_regions, np.asarray(new_vertices)


# ---------------------------------------------------------------------
# World (0,0 bottom-left) -> image (0,0 top-left)
# ---------------------------------------------------------------------
def world_to_image(points, img_h):
    return [(x, img_h - y) for x, y in points]


# ---------------------------------------------------------------------
# 4-coloring for region colors
# ---------------------------------------------------------------------
def build_adjacency(region_shape: dict[str, Polygon | MultiPolygon]):
    regions = list(region_shape.keys())
    adj: dict[str, set[str]] = {r: set() for r in regions}

    for i, r1 in enumerate(regions):
        g1 = region_shape[r1]
        for j in range(i + 1, len(regions)):
            r2 = regions[j]
            g2 = region_shape[r2]
            if not box(*g1.bounds).intersects(box(*g2.bounds)):
                continue
            if g1.touches(g2):
                adj[r1].add(r2)
                adj[r2].add(r1)

    return adj


def four_color(adj: dict[str, set[str]]) -> dict[str, int]:
    regions = sorted(adj.keys(), key=lambda r: -len(adj[r]))
    colors = [0, 1, 2, 3]
    assign: dict[str, int] = {}

    def backtrack(i: int) -> bool:
        if i == len(regions):
            return True
        r = regions[i]
        used = {assign[n] for n in adj[r] if n in assign}
        for c in colors:
            if c in used:
                continue
            assign[r] = c
            if backtrack(i + 1):
                return True
            del assign[r]
        return False

    backtrack(0)
    return assign


# ---------------------------------------------------------------------
# Draw helper
# ---------------------------------------------------------------------
def draw_lines(draw: ImageDraw.ImageDraw, geom, color, width, img_h):
    if geom.is_empty:
        return
    if isinstance(geom, LineString):
        coords = world_to_image(list(geom.coords), img_h)
        draw.line(coords, fill=color, width=width)
    elif isinstance(geom, MultiLineString):
        for line in geom.geoms:
            if isinstance(line, LineString):
                coords = world_to_image(list(line.coords), img_h)
                draw.line(coords, fill=color, width=width)


# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------
def main():
    # -------- load base image ----------
    img = Image.open(IMAGE_PATH).convert("RGBA")
    W, H = img.size
    draw = ImageDraw.Draw(img, "RGBA")

    # -------- load YAML ----------
    with open(YAML_PATH, "r", encoding="utf-8") as f:
        markers = yaml.safe_load(f)["markers"]

    pts = []
    regions = []
    local_ids = []
    counter: dict[str, int] = defaultdict(int)

    for m in markers:
        if m.get("subtype") != "monolithMaterial":
            continue
        if "region" in m:
            region = m["region"]
        else:
            region = "Unknown"
        x = float(m["x"])
        y = float(m["y"])
        counter[region] += 1
        pts.append((x, y))
        regions.append(region)
        local_ids.append(counter[region])

    if not pts:
        print("No monolithMaterial markers found.")
        return

    pts_np = np.asarray(pts, dtype=float)

    # -------- pure Voronoi ----------
    vor = Voronoi(pts_np)
    reg_idx, verts = voronoi_finite_polygons_2d(vor)

    bbox = box(0, 0, W, H)
    region_cells: dict[str, list[Polygon]] = defaultdict(list)

    for i, idx_list in enumerate(reg_idx):
        poly = Polygon(verts[idx_list])
        if poly.is_empty or not poly.is_valid:
            continue
        clipped = poly.intersection(bbox)
        if clipped.is_empty:
            continue

        rname = regions[i]
        if isinstance(clipped, MultiPolygon):
            for p in clipped.geoms:
                if not p.is_empty:
                    region_cells[rname].append(p)
        else:
            region_cells[rname].append(clipped)

    region_shape: dict[str, Polygon | MultiPolygon] = {
        r: unary_union(ps) for r, ps in region_cells.items()
    }

    # -----------------------------------------------------------------
    # HIGH SEAS: trim regions to be within MAX_SEA_DISTANCE of any point
    # -----------------------------------------------------------------
    print("Building high-seas mask with MAX_SEA_DISTANCE =", MAX_SEA_DISTANCE)
    buffers = [Point(x, y).buffer(MAX_SEA_DISTANCE) for (x, y) in pts_np]
    coverage = unary_union(buffers).intersection(bbox)

    for r in list(region_shape.keys()):
        clipped = region_shape[r].intersection(coverage)
        if clipped.is_empty:
            del region_shape[r]
        else:
            region_shape[r] = clipped

    # -------- region colors ----------
    adjacency = build_adjacency(region_shape)
    color_idx = four_color(adjacency)
    palette = [
        (255, 60, 60, 255),   # red
        (60, 210, 60, 255),   # green
        (60, 120, 255, 255),  # blue
        (255, 210, 0, 255),   # yellow
    ]

    # -----------------------------------------------------------------
    # Build shared borders & outer borders (after trimming)
    # -----------------------------------------------------------------
    regions_list = list(region_shape.keys())
    shared_pairs: list[tuple[LineString, str, str]] = []
    shared_segments: list[LineString] = []

    for i, r1 in enumerate(regions_list):
        g1 = region_shape[r1]
        for j in range(i + 1, len(regions_list)):
            r2 = regions_list[j]
            g2 = region_shape[r2]
            if not g1.touches(g2):
                continue
            inter = g1.boundary.intersection(g2.boundary)
            if isinstance(inter, LineString):
                if inter.length > 1e-6:
                    shared_pairs.append((inter, r1, r2))
                    shared_segments.append(inter)
            elif isinstance(inter, MultiLineString):
                for seg in inter.geoms:
                    if isinstance(seg, LineString) and seg.length > 1e-6:
                        shared_pairs.append((seg, r1, r2))
                        shared_segments.append(seg)

    shared_union = unary_union(shared_segments) if shared_segments else None

    BORDER_W = 5
    OFFSET = 2.0  # small offset in world units (~pixels)

    # --- draw shared borders: two parallel offsets, each closer to its region ---
    for seg, r1, r2 in shared_pairs:
        if seg.is_empty or seg.length <= 1e-6:
            continue

        # base offsets
        off_left = seg.parallel_offset(OFFSET, "left", join_style=2)
        off_right = seg.parallel_offset(OFFSET, "right", join_style=2)

        # Shapely may return MultiLineString for offsets when geometry is complex
        # We'll just take representative pieces where needed.
        def first_line(g):
            if g.is_empty:
                return None
            if isinstance(g, LineString):
                return g
            if isinstance(g, MultiLineString):
                for ln in g.geoms:
                    if isinstance(ln, LineString) and not ln.is_empty:
                        return ln
            return None

        left_line = first_line(off_left)
        right_line = first_line(off_right)
        if left_line is None or right_line is None:
            continue

        # Test which offset lies inside region r1
        test_pt_left = Point(list(left_line.coords)[0])
        # numeric robust contain: allow small boundary error with buffer
        in_r1_left = region_shape[r1].buffer(1e-6).contains(test_pt_left)

        if in_r1_left:
            geom_r1 = off_left
            geom_r2 = off_right
        else:
            geom_r1 = off_right
            geom_r2 = off_left

        c1 = palette[color_idx[r1]]
        c2 = palette[color_idx[r2]]

        draw_lines(draw, geom_r1, c1, BORDER_W, H)
        draw_lines(draw, geom_r2, c2, BORDER_W, H)

    # --- draw outer borders (against high seas) in region color ---
    for rname, geom in region_shape.items():
        boundary = geom.boundary
        if shared_union is not None:
            outer = boundary.difference(shared_union)
        else:
            outer = boundary
        color = palette[color_idx[rname]]
        draw_lines(draw, outer, color, BORDER_W, H)

    # -----------------------------------------------------------------
    # Draw points + indices
    # -----------------------------------------------------------------
    try:
        font_id = ImageFont.truetype("arial.ttf", 18)
    except OSError:
        font_id = ImageFont.load_default()

    POINT_R = 10
    outline_color = (0, 0, 0, 255)
    text_color = (255, 255, 255, 255)

    for (x, y), region, idx in zip(pts_np, regions, local_ids):
        if region not in region_shape:
            # whole region got clipped away as high seas
            continue
        cx, cy = world_to_image([(x, y)], H)[0]
        fill_color = palette[color_idx[region]]
        draw.ellipse(
            (cx - POINT_R, cy - POINT_R, cx + POINT_R, cy + POINT_R),
            fill=fill_color,
            outline=outline_color,
            width=3,
        )
        draw.text(
            (cx, cy - POINT_R - 4),
            str(idx),
            fill=text_color,
            font=font_id,
            anchor="mb",
        )

    # -----------------------------------------------------------------
    # Region labels
    # -----------------------------------------------------------------
    try:
        font_region = ImageFont.truetype("arial.ttf", 28)
    except OSError:
        font_region = ImageFont.load_default()

    for name, geom in region_shape.items():
        try:
            c = geom.representative_point().coords[0]
        except Exception:
            c = geom.centroid.coords[0]
        tx, ty = world_to_image([c], H)[0]
        draw.text(
            (tx, ty),
            name,
            fill=(255, 255, 255, 255),
            font=font_region,
            anchor="mm",
        )

    img.save(OUTPUT_PATH)
    print("Saved:", OUTPUT_PATH)

    # ===========================================================
    # Export region polygon data to JSON
    # ===========================================================
    export = []

    for region, geom in region_shape.items():
        entry = {"region": region, "polygons": []}

        def round_coords(coords):
            # Convert each (x,y) → [int,int]
            return [[int(round(x)), int(round(y))] for x, y in coords]

        if isinstance(geom, Polygon):
            entry["polygons"].append(round_coords(geom.exterior.coords))

            for hole in geom.interiors:
                entry["polygons"].append(round_coords(hole.coords))

        elif isinstance(geom, MultiPolygon):
            for poly in geom.geoms:
                entry["polygons"].append(round_coords(poly.exterior.coords))

                for hole in poly.interiors:
                    entry["polygons"].append(round_coords(hole.coords))

        export.append(entry)

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(export, f, indent=2)

    print("Region polygon JSON exported →", JSON_PATH)



if __name__ == "__main__":
    main()
