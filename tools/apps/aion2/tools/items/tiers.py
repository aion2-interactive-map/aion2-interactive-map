from __future__ import annotations

import yaml
from pathlib import Path

# ------------------------------------------------------------
# Config
# ------------------------------------------------------------
INPUT_PATH = Path("locales/zh-CN/items/items.yaml")
OUTPUT_PATH = Path("tiers.yaml")

TIERS = {
    "whiteDragon": "白龙王",
    "trueDragon": "真龙王",
    "wiseDragon": "鸣龙王",
    "celestialDragon": "天龙王",
    "nobleDragon": "应龙王",
    "nobleDragonEmperor": "应龙霸王",

    "starDragon": "乾龙王",
    "darkDragon": "黑龙王",
    "ebonyDragon": "暗龙王",
    "demonicDragon": "魔龙王",
    "hornedDragon": "夔龙王",
    "hornedDragonEmperor": "夔龙霸王",
}

# ------------------------------------------------------------
# Load items (id -> {name, description, ...})
# ------------------------------------------------------------
with INPUT_PATH.open("r", encoding="utf-8") as f:
    items: dict[str, dict] = yaml.safe_load(f)

if not isinstance(items, dict):
    raise RuntimeError("items.yaml must be a mapping: id -> item")

# ------------------------------------------------------------
# Collect tiers
# ------------------------------------------------------------
tiers_out: list[dict] = []

for tier_name, prefix in TIERS.items():
    ids: list[int] = []

    for item_id, item in items.items():
        name = item.get("name")
        if not name:
            continue

        if str(name).startswith(prefix):
            ids.append(int(item_id))

    if ids:
        tiers_out.append(
            {
                "name": tier_name,
                "items": sorted(ids),
            }
        )

# ------------------------------------------------------------
# Write tiers.yaml
# ------------------------------------------------------------
output = {"tiers": tiers_out}

with OUTPUT_PATH.open("w", encoding="utf-8") as f:
    yaml.safe_dump(
        output,
        f,
        allow_unicode=True,
        sort_keys=False,
    )
