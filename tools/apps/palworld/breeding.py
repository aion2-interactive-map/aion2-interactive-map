"""Breeding stage: emit the unique breeding combos + breedable roster.

Palworld breeding is decided by two raw DataTables under ``DataTable/Character``:

* ``DT_PalCombiUnique`` — hand-authored "special" recipes ``A + B = C`` keyed by
  parent *Tribe* (and, for two rows, parent *gender*).
* ``DT_PalMonsterParameter`` — per-Pal metadata; the ``CombiRank`` field drives
  the average-rank fallback (deliberately *ignored* here — the calculator only
  surfaces the unique combos plus same-species breeding).

Tribe ↔ CharacterID is 1:1 (``Tribe = EPalTribeID::<CharacterID>``), so a combo
parent tribe resolves straight to the roster Pal of the same id.

Outputs (mirrors the maps stage's data/locale split):
  data-palworld/breeding.json                 structure: {pals[], combos[]}
  data-palworld/locales/<tag>/breeding.json    {palId: localizedName}
  resource-palworld/icons/<icon>.webp          any roster icon not already there

Run: ``uv run python -m palworld.breeding`` (from the ``tools`` dir).
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

from .maps.common import read_rows, write_json
from .maps.extract import JA_TAG, L10N_LANG_TAGS

RAW = Path(os.environ.get("PALWORLD_RAW", "E:/SteamLibrary/steamapps/common/Palworld/Exports/Pal/Content/Pal"))
DATA_OUT = Path(os.environ.get("PALWORLD_DATA_OUT", "E:/aion2-map/data-palworld"))
RES_OUT = Path(os.environ.get("PALWORLD_RES_OUT", "E:/aion2-map/resource-palworld"))

_TRIBE = "EPalTribeID::"
_GENDER = "EPalGenderType::"
# Short gender codes for the two gender-specific rows; None -> unmarked.
_GENDER_CODE = {"Male": "M", "Female": "F"}


def _read_pal_names(table_path: Path) -> dict:
    """{CharacterID: name} from a DT_PalNameText table (Source or Localized)."""
    if not table_path.exists():
        return {}
    out = {}
    for key, r in read_rows(table_path).items():
        if not key.startswith("PAL_NAME_"):
            continue
        td = r.get("TextData") or {}
        s = td.get("LocalizedString") or td.get("SourceString")
        if s:
            out[key[len("PAL_NAME_"):]] = s
    return out


def _names_by_lang(raw: Path) -> dict[str, dict]:
    """{tag: {CharacterID: name}}; each L10N folder layered over the ja base."""
    ja = _read_pal_names(raw / "DataTable/Text/DT_PalNameText_Common.json")
    by_lang = {JA_TAG: ja}
    for folder, tag in L10N_LANG_TAGS.items():
        loc = _read_pal_names(raw.parent / "L10N" / folder / "Pal/DataTable/Text/DT_PalNameText_Common.json")
        by_lang[tag] = {**ja, **loc}
    return by_lang


def _has_real_name(names_by_lang: dict, cid: str) -> bool:
    n = names_by_lang["en-US"].get(cid) or names_by_lang[JA_TAG].get(cid)
    return bool(n) and n != "-"


def run_breeding(raw: Path, data_out: Path, res_out: Path) -> None:
    raw, data_out, res_out = Path(raw), Path(data_out), Path(res_out)

    mon = read_rows(raw / "DataTable/Character/DT_PalMonsterParameter.json")
    combi = read_rows(raw / "DataTable/Character/DT_PalCombiUnique.json")
    names_by_lang = _names_by_lang(raw)
    raw_icons = {p.stem for p in (raw / "Texture/PalIcon/Normal").iterdir() if p.suffix == ".png"}

    # Roster: catalogued, breedable Pals with a real name and icon. Excludes
    # placeholders/unreleased content (CombiRank 9999, ZukanIndex < 1, name "-")
    # and internal quest/tower variants (no name / no icon).
    def is_roster(cid: str, r: dict) -> bool:
        return (
            r.get("IsPal") is True
            and r.get("CombiRank") != 9999
            and (r.get("ZukanIndex", -1) or -1) >= 1
            and _has_real_name(names_by_lang, cid)
            and f"T_{cid}_icon_normal" in raw_icons
        )

    roster = {cid: r for cid, r in mon.items() if is_roster(cid, r)}

    # Internal row index (order Pals appear in DT_PalMonsterParameter) — the
    # game's rank-average tie-break prefers the lower index. Only relative order
    # among the pool matters, so a plain enumeration over the table suffices.
    row_index = {cid: i for i, cid in enumerate(mon)}

    # Every child produced by *any* unique combo (full table, incl. the combos
    # dropped for unreleased parents). Such Pals can only come from their combo,
    # so they are excluded from the rank-average result pool.
    combo_children_all = {r["ChildCharacterID"] for r in combi.values()}

    # Tribe -> roster CharacterID. Prefer the id equal to the tribe name, then a
    # suffix-less (base-form) id, else any.
    tribe_to_id: dict[str, list[str]] = {}
    for cid, r in roster.items():
        tribe_to_id.setdefault((r.get("Tribe") or "").replace(_TRIBE, ""), []).append(cid)

    def resolve_tribe(tribe: str) -> str | None:
        t = tribe.replace(_TRIBE, "")
        ids = tribe_to_id.get(t)
        if not ids:
            return None
        if t in ids:
            return t
        base = [i for i in ids if not roster[i].get("ZukanIndexSuffix")]
        return base[0] if base else ids[0]

    pals = [
        {
            "id": cid,
            "zukanIndex": r["ZukanIndex"],
            "zukanIndexSuffix": r.get("ZukanIndexSuffix", "") or "",
            "icon": f"T_{cid}_icon_normal",
            # Breeding power + tie-break index for the rank-average fallback.
            "rank": r["CombiRank"],
            "idx": row_index[cid],
            # Eligible as a rank-average child? Combo-only children and Pals the
            # game flags IgnoreCombi (legendaries: self-bred only) are not.
            "breedChild": cid not in combo_children_all and not r.get("IgnoreCombi"),
            # Legendaries (IgnoreCombi) — self-bred only; flagged for the UI.
            **({"legendary": True} if r.get("IgnoreCombi") else {}),
        }
        for cid, r in roster.items()
    ]
    pals.sort(key=lambda p: (p["zukanIndex"], p["zukanIndexSuffix"], p["id"]))

    # Unique combos where both parents and the child resolve to the roster.
    combos = []
    seen = set()
    dropped = 0
    for r in combi.values():
        a = resolve_tribe(r["ParentTribeA"])
        b = resolve_tribe(r["ParentTribeB"])
        c = r["ChildCharacterID"]
        if not a or not b or c not in roster:
            dropped += 1
            continue
        ag = _GENDER_CODE.get(r["ParentGenderA"].replace(_GENDER, ""))
        bg = _GENDER_CODE.get(r["ParentGenderB"].replace(_GENDER, ""))
        key = (a, b, c, ag, bg)
        if key in seen:
            continue
        seen.add(key)
        combo: dict = {"a": a, "b": b, "c": c}
        if ag:
            combo["ag"] = ag
        if bg:
            combo["bg"] = bg
        combos.append(combo)

    zukan_of = {p["id"]: (p["zukanIndex"], p["zukanIndexSuffix"]) for p in pals}
    combos.sort(key=lambda k: (zukan_of[k["c"]], zukan_of[k["a"]], zukan_of[k["b"]]))

    write_json(data_out / "breeding.json", {"pals": pals, "combos": combos})

    # Per-language name maps (fall back en -> ja -> id).
    ids = [p["id"] for p in pals]
    for tag in [JA_TAG, *L10N_LANG_TAGS.values()]:
        table = names_by_lang[tag]
        loc = {
            cid: table.get(cid) or names_by_lang["en-US"].get(cid) or names_by_lang[JA_TAG].get(cid) or cid
            for cid in ids
        }
        write_json(data_out / "locales" / tag / "breeding.json", loc)

    # Convert any roster icon missing from resource-palworld/icons.
    icons_dir = res_out / "icons"
    icons_dir.mkdir(parents=True, exist_ok=True)
    converted = 0
    for p in pals:
        dest = icons_dir / f"{p['icon']}.webp"
        if dest.exists():
            continue
        src = raw / "Texture/PalIcon/Normal" / f"{p['icon']}.png"
        with Image.open(src) as img:
            img = img.convert("RGBA") if img.mode not in ("RGB", "RGBA") else img
            img.save(dest, "WEBP", quality=90, method=6)
        converted += 1

    langs = 1 + len(L10N_LANG_TAGS)
    print(
        f"breeding: {len(pals)} pals, {len(combos)} combos "
        f"({dropped} dropped), {langs} locales, {converted} icons converted"
    )


if __name__ == "__main__":
    run_breeding(RAW, DATA_OUT, RES_OUT)
