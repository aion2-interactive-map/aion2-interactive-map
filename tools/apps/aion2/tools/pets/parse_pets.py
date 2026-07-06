from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

# ----------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------

# Change this if your csv is elsewhere
CSV_PATH = Path(__file__).with_name("table.csv")

TYPE_MAP: dict[str, str] = {
    "知性": "creatureIntellect",
    "野性": "creatureFeral",
    "自然": "creatureNature",
    "变形": "creatureTrans",
    "特殊": "creatureSpecial",
}

# ----------------------------------------------------------------------
# Load CSV
# ----------------------------------------------------------------------

df = pd.read_csv(CSV_PATH, header=None)
n_rows, n_cols = df.shape

if n_rows < 3:
    raise RuntimeError("CSV needs at least 3 rows: [category row, header row, data rows].")

# ----------------------------------------------------------------------
# Build column -> (type_key, field_name) mapping
# ----------------------------------------------------------------------
# row 0: category names (知性 / 野性 / 自然 / 变形 / 特殊)
# row 1: column header (英文 / 简体中文 / 繁体中文 / 图标 / etc)
# For each column, we track which type it belongs to, and whether it is
# en / zh-CN / zh-TW / icon

col_info: list[tuple[str, str] | None] = [None] * n_cols
current_type: str | None = None

for col in range(n_cols):
    cat_cell = df.iat[0, col]

    # If this cell has a category name, update current_type
    if isinstance(cat_cell, str):
        cat_name = cat_cell.strip()
        if cat_name in TYPE_MAP:
            current_type = TYPE_MAP[cat_name]

    # If we still don't have a current type, skip this column
    if not current_type:
        continue

    header_cell = df.iat[1, col]
    if not isinstance(header_cell, str):
        continue

    header = header_cell.strip()

    if header == "英文":
        col_info[col] = (current_type, "en")
    elif header in ("简体中文", "简体字"):
        col_info[col] = (current_type, "zh-CN")
    elif header in ("繁体中文", "繁體中文", "繁體字"):
        col_info[col] = (current_type, "zh-TW")
    elif header == "图标":
        # New: map the icon column
        col_info[col] = (current_type, "icon")
    else:
        # e.g. "备注" or empty, ignore
        continue

# ----------------------------------------------------------------------
# Parse data rows
# ----------------------------------------------------------------------

output: list[dict[str, str]] = []

for row_idx in range(2, n_rows):  # data rows start from index 2
    row = df.iloc[row_idx]

    # For each row, collect entries per type:
    # type_key -> {"en": ..., "zh-CN": ..., "zh-TW": ..., "icon": ...}
    row_buckets: dict[str, dict[str, str]] = {}

    for col in range(n_cols):
        info = col_info[col]
        if info is None:
            continue

        type_key, field = info
        val = row.iloc[col]

        if not isinstance(val, str):
            continue

        val = val.strip()
        if not val:
            continue

        bucket = row_buckets.setdefault(type_key, {})
        bucket[field] = val

    # Now turn each complete bucket into an item
    for type_key, fields in row_buckets.items():
        # Require all three language fields
        if all(k in fields for k in ("en", "zh-CN", "zh-TW")):
            item: dict[str, str] = {
                "type": type_key,
                "en": fields["en"],
                "zh-CN": fields["zh-CN"],
                "zh-TW": fields["zh-TW"],
            }

            # Icon is optional; add it only if present and non-empty
            icon = fields.get("icon")
            if icon:
                item["icon"] = icon

            output.append(item)

# ----------------------------------------------------------------------
# Save JSON
# ----------------------------------------------------------------------

out_path = CSV_PATH.with_suffix(".pets.json")
out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"Done. Parsed {len(output)} entries -> {out_path}")
