import math
import yaml
import base64
import svgwrite
from io import BytesIO
from PIL import Image
import subprocess, shutil


# ===========================================================
# Load YAML
# ===========================================================
def load_markers(file):
    with open(file, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


# ===========================================================
# RENDER REGION MAP (VECTOR OUTPUT)
# ===========================================================
def plot_map(map_name, map_image, markers_data, trans_data, region, mono_icon_path, tele_icon_path):

    img = Image.open(map_image).convert("RGBA")
    W, H = img.size

    BASE_ICON = 32
    SCALE = 1

    mono_icon = Image.open(mono_icon_path).convert("RGBA")
    tele_icon = Image.open(tele_icon_path).convert("RGBA")
    ICON = BASE_ICON * SCALE

    mono_icon = mono_icon.resize((ICON, ICON), Image.LANCZOS)
    tele_icon = tele_icon.resize((ICON, ICON), Image.LANCZOS)

    # virtual radius so arrows start slightly away from icons
    R = int(ICON * 0.3)
    MIN_ARROW_LEN = 20

    # --------------------------------------------------------
    # find monoliths
    # --------------------------------------------------------
    mono = [
        m for m in markers_data["markers"]
        if m.get("region") == region and m.get("subtype") == "monolithMaterial"
    ]

    mono = sorted(mono, key=lambda m: int(m["name"]) if m.get("name", "").isdigit() else 9999)

    if len(mono) == 0:
        print("⚠ No monolith found for", region)
        return

    xs = [m["x"] for m in mono]
    ys = [m["y"] for m in mono]
    margin = 150

    # raw bbox
    raw_x1 = min(xs) - margin
    raw_x2 = max(xs) + margin
    raw_y1 = min(ys) - margin
    raw_y2 = max(ys) + margin

    raw_x1 = max(0, raw_x1)
    raw_x2 = min(W, raw_x2)
    raw_y1 = max(0, raw_y1)
    raw_y2 = min(H, raw_y2)

    center_x = (raw_x1 + raw_x2) / 2
    center_y = (raw_y1 + raw_y2) / 2
    base_w = raw_x2 - raw_x1
    base_h = raw_y2 - raw_y1

    target_ratio = 4 / 3

    if base_w / base_h > target_ratio:
        final_w = base_w
        final_h = base_w / target_ratio
    else:
        final_h = base_h
        final_w = base_h * target_ratio

    half_w = final_w / 2
    half_h = final_h / 2

    ux1 = center_x - half_w
    ux2 = center_x + half_w
    uy1 = center_y - half_h
    uy2 = center_y + half_h

    if ux1 < 0:
        ux2 -= ux1
        ux1 = 0
    if ux2 > W:
        shift = ux2 - W
        ux1 -= shift
        ux2 = W
    if uy1 < 0:
        uy2 -= uy1
        uy1 = 0
    if uy2 > H:
        shift = uy2 - H
        uy1 -= shift
        uy2 = H

    crop_l, crop_r = int(ux1), int(ux2)
    crop_t, crop_b = int(H - uy2), int(H - uy1)

    crop = img.crop((crop_l, crop_t, crop_r, crop_b))
    crop = crop.resize((crop.width * SCALE, crop.height * SCALE), Image.LANCZOS)
    w, h = crop.size

    buf = BytesIO()
    crop.save(buf, format="PNG")
    bg_png = buf.getvalue()
    bg_b64 = base64.b64encode(bg_png).decode("ascii")

    # ===========================================================
    # BEGIN SVG
    # ===========================================================
    filename_part = region

    region_marker = next(
        (m for m in markers_data["markers"]
         if m.get("subtype") in ("battlefield", "village") and m.get("name") == region),
        None
    )
    cn_name = None
    if region_marker and region_marker.get("id") in trans_data:
        cn_name = trans_data[region_marker["id"]].get("name") or None
        if cn_name:
            filename_part = cn_name
    if region == "TolbasForest":
        cn_name = "托尔巴斯森林"

    out_svg = f"{map_name}.{filename_part}.svg"
    dwg = svgwrite.Drawing(out_svg, size=(w, h))

    dwg.add(
        dwg.image(
            href="data:image/png;base64," + bg_b64,
            insert=(0, 0),
            size=(w, h)
        )
    )

    # transform
    def P(m):
        x = (m["x"] - crop_l) * SCALE
        y = ((H - m["y"]) - crop_t) * SCALE
        return x, y

    tele = [
        m for m in markers_data["markers"]
        if m.get("subtype") == "teleport"
           and ux1 <= m["x"] <= ux2
           and uy1 <= m["y"] <= uy2
    ]

    # ===========================================================
    # RECORD ARROW SEGMENTS FOR LABEL COLLISION AVOIDANCE
    # ===========================================================
    arrow_segments = []   # list of (sx, sy, ex, ey)

    # ===========================================================
    # ARROW DRAWER (with recording)
    # ===========================================================
    def add_arrow_svg(p0, p1, color):
        x0, y0 = p0
        x1, y1 = p1
        dx = x1 - x0
        dy = y1 - y0
        L = math.hypot(dx, dy)
        if L == 0:
            return
        ux, uy = dx / L, dy / L

        sx = x0 + ux * R
        sy = y0 + uy * R
        ex = x1 - ux * R
        ey = y1 - uy * R

        # record full offset line (Option C)
        arrow_segments.append((sx, sy, ex, ey))

        dx2 = ex - sx
        dy2 = ey - sy
        L2 = math.hypot(dx2, dy2)
        if L2 < MIN_ARROW_LEN:
            inner_w = 4
            outer_w = inner_w + 3

            dwg.add(dwg.line(
                start=(sx, sy), end=(ex, ey),
                stroke="#FFFFFF", stroke_width=outer_w,
                stroke_linecap="round"))
            dwg.add(dwg.line(
                start=(sx, sy), end=(ex, ey),
                stroke=color, stroke_width=inner_w,
                stroke_linecap="round"))
            return

        ux, uy = dx2 / L2, dy2 / L2
        px, py = -uy, ux

        inner_w = 4
        outer_w = inner_w + 3

        head_len = 20
        head_w = 11
        head_len_b = head_len + 2
        head_w_b = head_w + 4
        forward_b = 4

        bx = ex - ux * head_len
        by = ey - uy * head_len

        bx_b = ex - ux * head_len_b
        by_b = ey - uy * head_len_b

        tip_inner = (ex, ey)
        tip_outer = (ex + ux * forward_b, ey + uy * forward_b)

        left_inner = (bx + px * head_w / 2, by + py * head_w / 2)
        right_inner = (bx - px * head_w / 2, by - py * head_w / 2)

        left_outer = (bx_b + px * head_w_b / 2, by_b + py * head_w_b / 2)
        right_outer = (bx_b - px * head_w_b / 2, by_b - py * head_w_b / 2)

        dwg.add(dwg.line(
            start=(sx, sy), end=(bx_b, by_b),
            stroke="#FFFFFF", stroke_width=outer_w,
            stroke_linecap="round"))
        dwg.add(dwg.polygon(
            points=[tip_outer, left_outer, right_outer], fill="#FFFFFF"))

        dwg.add(dwg.line(
            start=(sx, sy), end=(bx, by),
            stroke=color, stroke_width=inner_w,
            stroke_linecap="round"))
        dwg.add(dwg.polygon(
            points=[tip_inner, left_inner, right_inner],
            fill=color, stroke="none"))

    # ===========================================================
    # DRAW ARROW GROUPS
    # ===========================================================
    if region == "DawnLegionBase":
        groups = [(1, 7), (8, 12), (13, 20)]
    elif region == "TolbasForest":
        groups = [(1, 3), (4,7)]
    else:
        groups = [(1, len(mono))]
    colors = ["#ff5d5d", "#3da9fc", "#00d787"]
    for (lo, hi), col in zip(groups, colors):
        g = [m for m in mono if m["name"].isdigit() and lo <= int(m["name"]) <= hi]
        if len(g) >= 2:
            pts = [P(m) for m in g]
            for A, B in zip(pts[:-1], pts[1:]):
                add_arrow_svg(A, B, col)


    # ===========================================================
    # ICONS
    # ===========================================================
    def embed_icon(icon_image, cx, cy):
        buf2 = BytesIO()
        icon_image.save(buf2, format="PNG")
        icon_bytes = buf2.getvalue()
        icon_b64 = base64.b64encode(icon_bytes).decode("ascii")
        dwg.add(dwg.image(
            href="data:image/png;base64," + icon_b64,
            insert=(cx - ICON // 2, cy - ICON // 2),
            size=(ICON, ICON)
        ))

    for m in mono:
        x, y = P(m)
        embed_icon(mono_icon, x, y)

    for m in tele:
        x, y = P(m)
        embed_icon(tele_icon, x, y)

    # ===========================================================
    # LABELS — avoid collisions with arrows + other labels
    # ===========================================================
    font_size = 32
    label_centers = []

    def segment_point_distance(x0, y0, x1, y1, px, py):
        vx, vy = x1 - x0, y1 - y0
        dx, dy = px - x0, py - y0
        L2 = vx * vx + vy * vy
        if L2 == 0:
            return math.hypot(px - x0, py - y0)
        t = (dx * vx + dy * vy) / L2
        t = max(0, min(1, t))
        projx = x0 + t * vx
        projy = y0 + t * vy
        return math.hypot(px - projx, py - projy)

    def find_label_pos(x, y_base):
        # candidate offsets
        offsets = [
            (0, 0),
            (-0.5 * font_size, 0),
            (0.5 * font_size, 0),
            (0, 1.75 * font_size),
            (0, 0.5 * font_size),
            (0, font_size),
            (-0.5 * font_size, 0.5 * font_size),
            (0.5 * font_size, 0.5 * font_size),
            (-0.5 * font_size, 1.75 * font_size),
            (0.5 * font_size, 1.75 * font_size),
        ]

        min_dist2 = (0.9 * font_size) ** 2

        for ox, oy in offsets:
            cx = x + ox
            cy = y_base + oy

            # check label-label
            ok = True
            for px, py in label_centers:
                if (cx - px)**2 + (cy - py)**2 < min_dist2:
                    ok = False
                    break
            if not ok:
                continue

            # check label-arrow collisions
            collides_arrow = False
            for ax0, ay0, ax1, ay1 in arrow_segments:
                if segment_point_distance(ax0, ay0, ax1, ay1, cx, cy) < font_size * 0.6:
                    collides_arrow = True
                    break
            if collides_arrow:
                continue

            label_centers.append((cx, cy))
            return cx, cy

        # fallback
        label_centers.append((x, y_base))
        return x, y_base

    for m in mono:
        x, y = P(m)
        label = m["name"]
        base_y = y - ICON // 2 - 2
        tx, ty = find_label_pos(x, base_y)

        dwg.add(dwg.text(
            label,
            insert=(tx, ty),
            fill="#FFFFFF",
            stroke="#000000",
            stroke_width=1.8,
            font_size=font_size,
            font_family="Arial",
            font_weight="bold",
            text_anchor="middle"
        ))

    # ===========================================================
    # TITLE
    # ===========================================================
    if cn_name:
        TARGET_SCREEN_WIDTH = 1440
        TARGET_SCREEN_HEIGHT = 1080

        REFERENCE_FONT = 96
        reference_x = 20
        reference_y = 100

        sx = w / TARGET_SCREEN_WIDTH
        sy = h / TARGET_SCREEN_HEIGHT
        title_font_size = int(REFERENCE_FONT * sy)

        base_x = int(reference_x * sx)
        base_y = int(reference_y * sy)

        shadow_style = (
            "fill:#FFFFFF;"
            "stroke:#FFFFFF;"
            "stroke-width:7;"
            "stroke-linejoin:round;"
        )
        dwg.add(dwg.text(
            cn_name,
            insert=(base_x + 1, base_y + 1),
            style=shadow_style,
            font_size=title_font_size,
            font_family="Source Han Sans",
            font_weight="bold"
        ))

        title_style = (
            "fill:#1A7D45;"
            "stroke:none;"
        )
        dwg.add(dwg.text(
            cn_name,
            insert=(base_x, base_y),
            style=title_style,
            font_size=title_font_size,
            font_family="Source Han Sans",
            font_weight="bold"
        ))

    # save SVG
    dwg.saveas(out_svg)
    print("Saved:", out_svg)

    # export PNG (if Inkscape installed)
    inkscape = shutil.which("inkscape")
    if inkscape:
        out_png = out_svg.replace(".svg", ".png")
        subprocess.run([
            inkscape,
            out_svg,
            "--export-type=png",
            f"--export-filename={out_png}",
            "--export-width=3200",
            "--export-height=2400"
        ])
        print("Saved PNG:", out_png)
    else:
        print("⚠ Inkscape not found. PNG export skipped.")


# ===========================================================
# RUN ALL REGIONS
# ===========================================================
map_name = "World_L_A"

markers = load_markers("World_L_A.yaml")
trans = load_markers("World_L_A_trans.yaml")

regions = sorted(set(
    m["name"] for m in markers["markers"]
    if m.get("subtype") in ("battlefield", "village") and m.get("name")
))
if map_name == "World_L_A":
    regions = []
    regions.append("TolbasForest")

print("Generating:", len(regions), "regions\n")

for region in regions:
    print(" →", region)
    plot_map(
        map_name,
        "World_L_A.png",
        markers,
        trans,
        region,
        mono_icon_path="Monolith_Material_Light.webp",
        tele_icon_path="UT_Marker_TeleportArtifact_Light_Engraved.webp"
    )
