from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
import yaml

from aion2_interactive_map_backend_client.api import languages

# df = df_cn.merge(df_en, on="id", how="left", suffixes=("", "_en"))

df = pd.read_json('items.en-US.json')
df = df.rename(columns={"categoryName": "category", "image": "icon"})

cols = [
    "id",
    "grade",
    "icon",
    "subtype",
]

FOLDERS = ["Item/Accessory", "Item/Armor", "Item/BMShop", "Item/ETC", "Item/Weapon", "Item/Wing", "Icon_Arcana", "Portrait/Portrait_Vehicle"]
UI_PREFIX = "UI/Resource/Texture"
GAME_SRC = Path("G:\\NCSoft\\Export")

filename_folder_map = {}
for folder in FOLDERS:
    folder_path = GAME_SRC / UI_PREFIX / folder
    for filename in folder_path.glob("*.png"):
        filename_folder_map[filename.name] = folder

def _filename_from_icon(icon: str | None) -> str | None:
    if icon is None:
        return None
    if not isinstance(icon, str):
        return None
    icon = icon.strip()
    if not icon:
        return None

    # URL -> take path basename
    p = urlparse(icon)
    if p.scheme in ("http", "https"):
        return Path(p.path).name or None

    # Local path / already-basename
    return Path(icon).name or None


def rewrite_icon_path(icon: str | None) -> str | None:
    """
    Convert an icon URL/path like:
      https://.../Icon_WP_GS_0110_T05.png
    to:
      UI/Resource/Texture/Item/{folder}/Icon_WP_GS_0110_T05.webp
    based on which folder contains the .png locally.
    """
    filename = _filename_from_icon(icon)
    if filename is None:
        return None

    folder = filename_folder_map.get(filename)
    if not folder:
        # Not found: keep original value (or return None if you prefer)
        print(icon)
        return icon

    stem = Path(filename).stem
    return f"{UI_PREFIX}/{folder}/{stem}.webp"

types = yaml.load(open("locales/en/items/types.yaml"), Loader=yaml.SafeLoader)
category_subtype_map = {v["name"]:k for k, v in types["subtypes"].items()}



def get_subtype(category: str) -> str:
    if category in category_subtype_map:
        return category_subtype_map[category]
    else:
        print(category)
        return "Other"

df["icon"] = df["icon"].apply(rewrite_icon_path)
df["subtype"] = df["category"].apply(get_subtype)

# df.to_excel('items.xlsx', index=False)
data = df[cols].to_dict(orient="records")

with open("items.yaml", "w", encoding="utf-8") as f:
    yaml.safe_dump(
        {"items": data},
        f,
        allow_unicode=True,
        sort_keys=False,
    )

language_map = {
    "en-US": "en",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
}

cols = [
    "id",
    "name",
    "description",
]


for language in language_map.keys():
    language_code = language_map[language]
    df = pd.read_json(f"items.{language}.json")
    df = df.rename(columns={"categoryName": "category"})

    data = {
        int(row["id"]): {
            "name": row["name"],
            "description": row["description"],
        }
        for row in df[cols].to_dict(orient="records")
    }



    filename = Path(__file__).parent / "locales" /  language_code / "items" /  "items.yaml"
    filename.parent.mkdir(parents=True, exist_ok=True)

    with filename.open("w", encoding="utf-8") as f:
        yaml.safe_dump(
            data,
            f,
            allow_unicode=True,
            sort_keys=False,
        )



