from __future__ import annotations

import json
from pathlib import Path

import yaml
from opencc import OpenCC

language_map = {
    "en-US": "en",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
}

extra_category_and_subtypes = {
    "Equip_Armor": ["Belt"],
    "Equip_Accessory": ["Amulet", "Rune"],
    "Equip_Weapon": ["Weapon"],
    "Equip": ["Equipment"],
}

# Base extra translations are provided in zh-CN
extra_translation = {
    "zh-CN": {
        "Belt": "腰带",
        "Amulet": "护身符",
        "Rune": "古文石",
        "Weapon": "武器",
        "Equipment": "装备",
        "Equip": "装备",
    },
    "en": {
        "Equip": "Equipment",
    }
}

cc_s2t = OpenCC("s2t")  # Simplified -> Traditional (for zh-TW)


def load_json(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def dump_yaml(obj: object, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        yaml.dump(obj, f, allow_unicode=True, sort_keys=False)


def get_extra_name(key: str, *, language: str) -> str | None:
    """
    - en-US: use key directly (e.g., "Belt")
    - zh-CN: use extra_translation["zh-CN"][key] if exists
    - zh-TW: convert zh-CN translation via OpenCC s2t if exists
    If not found, return None (skip translation).
    """
    default = extra_translation.get(language, {}).get(key)
    if default:
        return default

    if language == "en":
        return key

    zh_cn = extra_translation.get("zh-CN", {}).get(key)
    if not isinstance(zh_cn, str) or not zh_cn:
        return None

    if language == "zh-CN":
        return zh_cn

    if language == "zh-TW":
        return cc_s2t.convert(zh_cn)

    return None


def ensure_extra_categories(categories: list[dict], *, language_code: str) -> list[dict]:
    """
    If cat_id exists: append missing subtype ids into category["child"]
    Else: add a new category with those subtype ids in child

    Translation rules:
    - en: use id directly for newly added category/subtype "name"
    - zh-CN: use extra_translation["zh-CN"] if present
    - zh-TW: convert zh-CN extra translation via OpenCC; if missing, skip
    """
    cat_by_id: dict[str, dict] = {
        c.get("id"): c for c in categories if isinstance(c, dict) and isinstance(c.get("id"), str)
    }

    for cat_id, extra_subtype_ids in extra_category_and_subtypes.items():
        cat = cat_by_id.get(cat_id)

        if cat is None:
            cat = {"id": cat_id, "child": []}
            cat_name = get_extra_name(cat_id, language=language_code)
            if cat_name is not None:
                cat["name"] = cat_name
            categories.append(cat)
            cat_by_id[cat_id] = cat

        child = cat.get("child")
        if not isinstance(child, list):
            child = []
            cat["child"] = child

        existing_subtype_ids = {
            x.get("id") for x in child if isinstance(x, dict) and isinstance(x.get("id"), str)
        }

        for sid in extra_subtype_ids:
            if sid in existing_subtype_ids:
                continue

            new_sub = {"id": sid}
            sub_name = get_extra_name(sid, language=language_code)
            if sub_name is not None:
                new_sub["name"] = sub_name

            child.append(new_sub)
            existing_subtype_ids.add(sid)

    return categories


# ----------------------------------------------------------------------
# Generate base (en-US) structural YAMLs
# ----------------------------------------------------------------------
categories_en = load_json(Path("categories.en-US.json"))
result = {
    "categories": [
        {
            "name": category["id"],
            "subtypes": [{"name": subtype["id"]} for subtype in category.get("child", [])],
        }
        for category in categories_en
    ],
}
dump_yaml(result, Path("types.yaml"))

classes_en = load_json(Path("classes.en-US.json"))
dump_yaml({"classes": [{"name": c["id"]} for c in classes_en]}, Path("classes.yaml"))

grades_en = load_json(Path("grades.en-US.json"))
dump_yaml({"grades": [{"name": g["id"]} for g in grades_en]}, Path("grades.yaml"))

servers_en = load_json(Path("servers.en-US.json"))
dump_yaml({"servers": servers_en["serverList"]}, Path("servers.yaml"))


# ----------------------------------------------------------------------
# Locales
# ----------------------------------------------------------------------
for language, language_code in language_map.items():
    categories = load_json(Path(f"categories.{language}.json"))
    categories = ensure_extra_categories(categories, language_code=language_code)

    # Build subtypes map from categories children
    subtypes: dict[str, dict] = {}
    for category in categories:
        for subtype in category.get("child", []):
            sid = subtype.get("id")
            if not isinstance(sid, str) or not sid:
                continue

            entry: dict[str, str] = {}
            sname = subtype.get("name")
            if isinstance(sname, str) and sname:
                entry["name"] = sname
            subtypes[sid] = entry  # if no name, keep empty dict

    result = {
        "categories": {
            category["id"]: (
                {"name": category["name"]} if isinstance(category.get("name"), str) and category.get("name") else {}
            )
            for category in categories
            if isinstance(category, dict) and isinstance(category.get("id"), str)
        },
        "subtypes": subtypes,
    }
    dump_yaml(result, Path(__file__).parent / "locales" / language_code / "items" / "types.yaml")

    classes = load_json(Path(f"classes.{language}.json"))
    result = {c["id"]: {"name": c.get("name", "")} for c in classes if isinstance(c.get("id"), str)}
    dump_yaml(result, Path(__file__).parent / "locales" / language_code / "classes.yaml")

    grades = load_json(Path(f"grades.{language}.json"))
    result = {g["id"]: {"name": g.get("name", "")} for g in grades if isinstance(g.get("id"), str)}
    dump_yaml(result, Path(__file__).parent / "locales" / language_code / "items" / "grades.yaml")
