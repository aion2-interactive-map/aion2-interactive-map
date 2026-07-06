from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Callable

import pandas as pd
import yaml
from opencc import OpenCC

# =============================================================================
# Config
# =============================================================================
CSV_PATH = Path("craft.csv")
LOCALES_PATH = Path("locales/zh-CN/items/items.yaml")

OUT_JSON = Path("craft.parsed.json")
OUT_YAML = Path("crafting.yaml")
OUT_MISSING = Path("crafting.missing.yaml")

KEEP_COLS = ["名称", "閃耀名称", "类型", "生产职业", "等级"]

COLUMN_MAP = {
    "名称": "name",
    "閃耀名称": "splendent_name",
    "类型": "category",
    "生产职业": "class",
    "等级": "level",
    "材料": "materials",
}

LEVEL_NAME_MAP = {"入门": "Novice", "专业": "Professional"}
LEVEL_RE = re.compile(r"^(入门|专业)\s*(\d+)$")

cc = OpenCC("t2s")  # zh-TW -> zh-CN

# Only these base items trigger light/dark duplication
LIGHT_TRIGGER_KEYWORDS = ["真龙", "白龙", "鸣龙", "天龙", "应龙", "奥里哈康"]

# Replacement rules for dark variants (applied to id, splendent_id, and materials ids)
REPLACE_MAP = {
    "真龙": "乾龙",
    "白龙": "黑龙",
    "鸣龙": "暗龙",
    "天龙": "魔龙",
    "应龙": "夔龙",
    "世界树": "菩提",
    "奥里哈康": "奥里哈康",  # special: name unchanged, but id switches to the other one
}

# =============================================================================
# YAML dumper: render None as blank (key:) instead of "null"
# =============================================================================
class BlankNullDumper(yaml.SafeDumper):
    pass


def _represent_none(dumper: yaml.Dumper, _value: None) -> yaml.nodes.Node:
    return dumper.represent_scalar("tag:yaml.org,2002:null", "")


BlankNullDumper.add_representer(type(None), _represent_none)


# =============================================================================
# Basic helpers
# =============================================================================
def zh_tw_to_cn(obj: Any) -> Any:
    if isinstance(obj, str):
        return cc.convert(obj)
    if isinstance(obj, list):
        return [zh_tw_to_cn(x) for x in obj]
    if isinstance(obj, dict):
        return {k: zh_tw_to_cn(v) for k, v in obj.items()}
    return obj


def _to_int(x: Any) -> int | None:
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return None
    s = str(x).strip()
    if not s:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def parse_level(value: Any) -> list[Any] | None:
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    m = LEVEL_RE.match(s)
    if not m:
        return None
    tier_cn, num = m.groups()
    return [LEVEL_NAME_MAP[tier_cn], int(num)]


def normalize_id_value(x: Any) -> int | None:
    if x is None:
        return None
    if isinstance(x, float) and pd.isna(x):
        return None

    s = str(x).strip()
    if not s:
        return None
    if s.lower() in {"nan", ".nan", "none", "null"}:
        return None

    try:
        return int(float(s))
    except ValueError:
        return None


def _norm_spaces(s: str) -> str:
    return " ".join(s.split()).strip()


# =============================================================================
# Locales (name -> sorted list of ids)
# =============================================================================
def load_name_to_ids_map(path: Path) -> dict[str, list[int]]:
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    if not isinstance(data, dict):
        return {}

    out: dict[str, list[int]] = {}
    for k, v in data.items():
        if not isinstance(v, dict):
            continue

        name = v.get("name")
        if not isinstance(name, str):
            continue
        name = name.strip()
        if not name:
            continue

        try:
            item_id = int(str(k))
        except ValueError:
            continue

        out.setdefault(name, []).append(item_id)

    for name in list(out.keys()):
        out[name] = sorted(set(out[name]))

    return out


# =============================================================================
# Resolver (materials support (刻印) fallback; logs misses with "tried")
# =============================================================================
def _material_candidates(name: str) -> list[str]:
    base = _norm_spaces(name)
    if not base:
        return []

    candidates: list[str] = [base]
    stamped_ascii = f"{base}(刻印)"
    stamped_full = f"{base}（刻印）"

    if base.endswith("(刻印)"):
        core = base[: -len("(刻印)")].rstrip()
        candidates.append(f"{core}（刻印）")
    elif base.endswith("（刻印）"):
        core = base[: -len("（刻印）")].rstrip()
        candidates.append(f"{core}(刻印)")
    else:
        candidates.append(stamped_ascii)
        candidates.append(stamped_full)

    seen: set[str] = set()
    uniq: list[str] = []
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            uniq.append(c)
    return uniq


def make_resolver(
    name_to_ids: dict[str, list[int]],
    missing_log: list[dict[str, Any]],
) -> Callable[[Any], int | None]:
    def resolve(value: Any, *, field: str, context: str | None) -> int | None:
        if value is None or (isinstance(value, float) and pd.isna(value)):
            missing_log.append({"field": field, "value": None, "context": context, "reason": "empty_value"})
            return None

        if not isinstance(value, str):
            missing_log.append({"field": field, "value": value, "context": context, "reason": "not_str"})
            return None

        s = _norm_spaces(value)
        if not s:
            missing_log.append({"field": field, "value": value, "context": context, "reason": "blank"})
            return None

        tried = _material_candidates(s) if field == "material" else [s]
        for cand in tried:
            ids = name_to_ids.get(cand)
            if ids:
                return ids[0]  # smallest id

        missing_log.append({"field": field, "value": s, "context": context, "reason": "not_found", "tried": tried})
        return None

    return resolve


# =============================================================================
# Materials parsing
# =============================================================================
def discover_material_cols(columns: list[str]) -> list[str]:
    cols = [c for c in columns if c.startswith("材料") and not c.endswith("数量")]

    def key(c: str) -> int:
        suffix = c.replace("材料", "").strip()
        return int(suffix) if suffix.isdigit() else 999999

    return sorted(cols, key=key)


def row_to_materials_map(
    row: pd.Series,
    *,
    material_cols: list[str],
    resolve: Callable[[Any], int | None],
    context: str,
) -> dict[int, int]:
    out: dict[int, int] = {}
    for mcol in material_cols:
        qcol = f"{mcol}数量"
        mat_name = str(row.get(mcol, "")).strip()
        if not mat_name:
            continue

        qty = _to_int(row.get(qcol))
        if qty is None:
            continue

        mat_id = resolve(mat_name, field="material", context=context)
        if mat_id is None:
            continue

        out[mat_id] = out.get(mat_id, 0) + qty

    return out


def materials_map_to_array(materials: dict[int, int]) -> list[dict[str, int]]:
    return [{"id": int(k), "count": int(v)} for k, v in sorted(materials.items(), key=lambda kv: kv[0])]


# =============================================================================
# Post-generation: light/dark variants (id + splendent_id + materials ids)
# =============================================================================
def _contains_any(name: str, keywords: list[str]) -> bool:
    return any(k in name for k in keywords)


def _should_transform_name(name: str) -> bool:
    return any(src in name for src in REPLACE_MAP.keys())


def _replace_keywords(name: str) -> str:
    out = name
    for src, dst in REPLACE_MAP.items():
        out = out.replace(src, dst)
    return out


def _pick_other_id_for_same_name(ids: list[int], current: int) -> int | None:
    # ids is sorted asc
    if not ids:
        return None

    # If there is only one matched id, use that id (your requested behavior)
    if len(ids) == 1:
        return ids[0]

    # Otherwise choose the "other" (prefer the larger one).
    if ids[-1] != current:
        return ids[-1]
    if ids[0] != current:
        return ids[0]
    return ids[0]


def _map_id_to_dark(
    item_id: int | None,
    *,
    id_to_name: dict[int, str],
    name_to_ids: dict[str, list[int]],
    generation_log: list[dict[str, Any]],
    field: str,
    record_context: dict[str, Any],
    strict: bool,
) -> int | None:
    """
    strict=True  => must succeed (used for main id). Failure returns None.
    strict=False => best-effort (used for splendent/materials). Failure returns original id.
    """
    if item_id is None:
        return None

    name = id_to_name.get(item_id)
    if not isinstance(name, str) or not name:
        generation_log.append(
            {
                "reason": "id_name_not_found",
                "field": field,
                "id": item_id,
                "record": record_context,
            }
        )
        return None if strict else item_id

    # Only transform if the name contains any transform keywords (including 世界树)
    if not _should_transform_name(name):
        return item_id

    # Special: 奥里哈康 => name unchanged but must switch to "the other" id
    if "奥里哈康" in name:
        ids = name_to_ids.get(name) or []
        other_id = _pick_other_id_for_same_name(ids, item_id)
        if other_id is None:
            generation_log.append(
                {
                    "reason": "orichalcum_no_other_id",
                    "field": field,
                    "id": item_id,
                    "name": name,
                    "ids": ids,
                    "record": record_context,
                }
            )
            return None if strict else item_id
        return other_id

    new_name = _replace_keywords(name)
    ids = name_to_ids.get(new_name) or []
    if not ids:
        generation_log.append(
            {
                "reason": "dark_name_not_found",
                "field": field,
                "from_id": item_id,
                "from_name": name,
                "to_name": new_name,
                "record": record_context,
            }
        )
        return None if strict else item_id

    new_id = ids[0]
    if new_id == item_id and len(ids) > 1:
        new_id = ids[1]

    if new_id == item_id:
        generation_log.append(
            {
                "reason": "dark_id_same_as_light",
                "field": field,
                "from_id": item_id,
                "from_name": name,
                "to_name": new_name,
                "ids": ids,
                "record": record_context,
            }
        )
        return None if strict else item_id

    return new_id


def _transform_materials_for_dark(
    materials: list[dict[str, Any]] | None,
    *,
    id_to_name: dict[int, str],
    name_to_ids: dict[str, list[int]],
    generation_log: list[dict[str, Any]],
    record_context: dict[str, Any],
) -> list[dict[str, int]]:
    if not materials:
        return []

    out: dict[int, int] = {}
    for m in materials:
        mid = m.get("id")
        cnt = m.get("count")
        if not isinstance(mid, int) or not isinstance(cnt, int):
            continue

        new_mid = _map_id_to_dark(
            mid,
            id_to_name=id_to_name,
            name_to_ids=name_to_ids,
            generation_log=generation_log,
            field="material_id",
            record_context=record_context,
            strict=False,  # best-effort for materials
        )

        out[int(new_mid)] = out.get(int(new_mid), 0) + int(cnt)

    return [{"id": k, "count": v} for k, v in sorted(out.items(), key=lambda kv: kv[0])]


def generate_light_dark_records(
    base_records: list[dict[str, Any]],
    *,
    id_to_name: dict[int, str],
    name_to_ids: dict[str, list[int]],
    generation_log: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []

    for rec in base_records:
        rid = rec.get("id")
        if not isinstance(rid, int):
            out.append(rec)
            continue

        base_name = id_to_name.get(rid)
        if not isinstance(base_name, str) or not base_name:
            out.append(rec)
            continue

        # Only consider duplication for trigger keywords
        if not _contains_any(base_name, LIGHT_TRIGGER_KEYWORDS):
            out.append(rec)
            continue

        ctx = {
            "id": rec.get("id"),
            "splendent_id": rec.get("splendent_id"),
        }

        # Compute dark id first
        dark_id = _map_id_to_dark(
            rec.get("id"),
            id_to_name=id_to_name,
            name_to_ids=name_to_ids,
            generation_log=generation_log,
            field="id",
            record_context=ctx,
            strict=True,
        )

        # If no dark id OR dark id equals original id:
        # - do not create dark variant
        # - do not add race: light to the original record
        if dark_id is None or dark_id == rid:
            out.append(rec)
            continue

        # light record
        light_rec = dict(rec)
        light_rec["race"] = "light"
        out.append(light_rec)

        # dark record (also transform splendent/materials)
        dark_spl = _map_id_to_dark(
            rec.get("splendent_id"),
            id_to_name=id_to_name,
            name_to_ids=name_to_ids,
            generation_log=generation_log,
            field="splendent_id",
            record_context=ctx,
            strict=False,
        )

        dark_mats = _transform_materials_for_dark(
            rec.get("materials"),
            id_to_name=id_to_name,
            name_to_ids=name_to_ids,
            generation_log=generation_log,
            record_context=ctx,
        )

        dark_rec = dict(rec)
        dark_rec["id"] = dark_id
        dark_rec["splendent_id"] = dark_spl
        dark_rec["materials"] = dark_mats
        dark_rec["race"] = "dark"
        out.append(dark_rec)

    return out



# =============================================================================
# Pipeline
# =============================================================================
def parse_craft_csv(name_to_ids: dict[str, list[int]]) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    missing_log: list[dict[str, Any]] = []
    resolve = make_resolver(name_to_ids, missing_log)

    df = pd.read_csv(CSV_PATH, dtype=str, keep_default_na=False)
    df = df.map(zh_tw_to_cn)

    missing_cols = [c for c in KEEP_COLS if c not in df.columns]
    if missing_cols:
        raise RuntimeError(f"Missing required columns in CSV header: {missing_cols}")

    df["等级"] = df["等级"].apply(parse_level)
    material_cols = discover_material_cols(df.columns.tolist())

    out = df[KEEP_COLS].copy()
    out["材料"] = df.apply(
        lambda r: row_to_materials_map(
            r,
            material_cols=material_cols,
            resolve=resolve,
            context=str(r.get("名称", "")).strip(),
        ),
        axis=1,
    )

    out = out.rename(columns=COLUMN_MAP)
    out["id"] = out["name"].apply(lambda v: resolve(v, field="name", context=None))
    out["splendent_id"] = out["splendent_name"].apply(lambda v: resolve(v, field="splendent_name", context=None))

    return out, missing_log


# =============================================================================
# Main
# =============================================================================
if __name__ == "__main__":
    name_to_ids = load_name_to_ids_map(LOCALES_PATH)

    # Build id -> name for generation phase
    id_to_name: dict[int, str] = {}
    for n, ids in name_to_ids.items():
        for i in ids:
            id_to_name[int(i)] = n

    parsed, missing = parse_craft_csv(name_to_ids)

    parsed.to_json(OUT_JSON, orient="records", force_ascii=False, indent=2)

    base_records: list[dict[str, Any]] = []
    for _, row in parsed.iterrows():
        rid = normalize_id_value(row.get("id"))
        spl = normalize_id_value(row.get("splendent_id"))

        mats_map = row.get("materials") or {}
        mats_arr = materials_map_to_array(mats_map)

        base_records.append(
            {
                "id": rid,
                "splendent_id": spl,
                "materials": mats_arr,
            }
        )

    generation_log: list[dict[str, Any]] = []
    final_records = generate_light_dark_records(
        base_records,
        id_to_name=id_to_name,
        name_to_ids=name_to_ids,
        generation_log=generation_log,
    )

    with OUT_YAML.open("w", encoding="utf-8") as f:
        yaml.dump({"crafting": final_records}, f, allow_unicode=True, sort_keys=False, Dumper=BlankNullDumper)

    all_missing = list(missing)
    if generation_log:
        for x in generation_log:
            x["phase"] = "generation"
        all_missing.extend(generation_log)

    if all_missing:
        with OUT_MISSING.open("w", encoding="utf-8") as f:
            yaml.dump(all_missing, f, allow_unicode=True, sort_keys=False, Dumper=BlankNullDumper)
