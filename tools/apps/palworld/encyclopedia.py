"""Encyclopedia stage: emit per-Pal encyclopedia data + the global passive list.

Reuses the breeding stage's roster/name logic (a Pal is catalogued iff
``IsPal`` and ``CombiRank != 9999`` and ``ZukanIndex >= 1`` and it has a real
name and a normal icon). For each such Pal we gather base stats, elements, work
suitability, its partner skill, its active-skill learnset, innate passives and
kill drops from the raw CUE4Parse tables under ``DataTable``.

Localized text (Pal descriptions, skill/passive names & descriptions, item
names, element/work labels) is layered exactly as ``breeding.py`` layers names:
the mojibake JA ``_Common`` base overlaid per-language from ``L10N/<folder>/Pal``.

Outputs (mirrors the maps/breeding split):
  data-palworld/pals.json                     {pals: [PalEntry]}
  data-palworld/passives.json                 {passives: [Passive]}  (115 displayable)
  data-palworld/locales/<tag>/pals.json       {palId: {name, description, partnerSkill{name,desc?}}}
      (partnerSkill.desc = DT_PalFirstActivatedInfoText prose, tokens resolved)
  data-palworld/locales/<tag>/skills.json     {wazaId: {name, description?}}
  data-palworld/locales/<tag>/passives.json   {passiveId: {name, description?}}
  data-palworld/locales/<tag>/items.json      {itemId: name}
  data-palworld/locales/<tag>/enums.json      {elements: {Element: name}, work: {WorkType: name}}
  resource-palworld/icons/element_<Element>.webp   (9)
  resource-palworld/icons/work_<WorkType>.webp     (13, colored T_icon_palwork_NN)

Run: ``uv run python -m palworld.encyclopedia`` (from the ``tools`` dir).
"""

from __future__ import annotations

import os
import re
from pathlib import Path

import yaml
from PIL import Image

from .breeding import _has_real_name, _names_by_lang
from .maps.common import read_rows, round2, write_json
from .maps.extract import JA_TAG, L10N_LANG_TAGS

RAW = Path(os.environ.get("PALWORLD_RAW", "E:/SteamLibrary/steamapps/common/Palworld/Exports/Pal/Content/Pal"))
DATA_OUT = Path(os.environ.get("PALWORLD_DATA_OUT", "E:/aion2-map/data-palworld"))
RES_OUT = Path(os.environ.get("PALWORLD_RES_OUT", "E:/aion2-map/resource-palworld"))

# Enum prefixes stripped to bare names in the output.
_ELEM = "EPalElementType::"
_WAZA = "EPalWazaID::"
_SIZE = "EPalSizeType::"
_GENUS = "EPalGenusCategoryType::"
_WORK = "EPalWorkSuitability::"
_CAT = "EPalWazaCategory::"
_EFFT = "EPalPassiveSkillEffectType::"
_TGT = "EPalPassiveSkillEffectTargetType::"

# The 9 element types (EPalElementType names, enum order).
ELEMENTS = ["Normal", "Fire", "Water", "Leaf", "Electricity", "Ice", "Earth", "Dark", "Dragon"]
# Element name -> element-icon index (Texture/UI/Main_Menu/T_Icon_element_NN.png).
# The icon texture order is NOT the enum order (e.g. 03 is Electricity, 04 is
# Leaf) — verified by matching each icon's symbol. Using enum order mismatched
# icons (grass showing the lightning bolt, etc.).
ELEMENT_ICON_INDEX = {
    "Normal": 0, "Fire": 1, "Water": 2, "Electricity": 3, "Leaf": 4,
    "Dark": 5, "Dragon": 6, "Earth": 7, "Ice": 8,
}
# The 13 work-suitability types (order = display order).
WORK_TYPES = [
    "EmitFlame", "Watering", "Seeding", "GenerateElectricity", "Handcraft",
    "Collection", "Deforest", "Mining", "OilExtraction", "ProductMedicine",
    "Cool", "Transport", "MonsterFarm",
]
# WorkType -> colored icon index (Texture/UI/InGame/T_icon_palwork_NN.png). The
# texture index follows the EPalWorkSuitability enum EXCEPT OilExtraction (09)
# and ProductMedicine (08) are swapped relative to it — verified by matching each
# colored icon's silhouette against the named white WorkRank_<WorkType> icon.
WORK_ICON_INDEX = {
    "EmitFlame": 0, "Watering": 1, "Seeding": 2, "GenerateElectricity": 3,
    "Handcraft": 4, "Collection": 5, "Deforest": 6, "Mining": 7,
    "ProductMedicine": 8, "OilExtraction": 9, "Cool": 10, "Transport": 11,
    "MonsterFarm": 12,
}

_NONE = {None, "None", ""}
# DT_WazaMasterLevel PalIds occasionally differ from the CharacterID only by
# casing (…Fish vs …fish) or a boss/gym prefix; strip those to match the roster.
_WAZA_PREFIX = re.compile(r"^(boss_|gym_)", re.I)


_DATA_SRC = Path(__file__).parent / "data_src"


def _strip(v: str | None, prefix: str) -> str:
    return (v or "").replace(prefix, "")


def _load_partner_labels() -> tuple[dict, dict, dict]:
    """Hand-authored partner-skill labels from partner_effects.yaml:
    ({EffectType: {tag: label}}, {TargetType: {tag: label}}, {connectorKey: {tag: template}}).
    Connectors are per-language templates with a {name} slot; family effect types
    (elements/ailments/work) are composed from localized game terms + a connector."""
    path = _DATA_SRC / "partner_effects.yaml"
    if not path.exists():
        return {}, {}, {}
    doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return doc.get("effects") or {}, doc.get("targets") or {}, doc.get("connectors") or {}


# Partner-effect families composed at emit time from localized game terms
# (elements/work from enums, status ailments from ADDITIONAL_EFFECT_*) + a connector
# template. Anything not matched here falls back to a hand-authored label in the yaml.
_EFFECT_ELEM_FAMILIES = {  # prefix -> connector key; base term = element name
    "ElementResist_": "resist",
    "ElementAddItemDrop_": "elementDropUp",
    "ElementBoostWeakness_": "elementWeakDamage",
    "ElementBoost_": "elementAttackUp",
}
_EFFECT_AILMENT_FAMILIES = {  # prefix -> connector key; base term = ailment name
    "AdditionalEffect_": "inflict",
    "ResistAdditionalEffect_": "resist",
    "DamageRateIfDefender_": "damageVs",
    "CaptureLevelUpIfTarget_": "captureVs",
}
_ELEMENT_ATTACK_RE = re.compile(r"^Element(" + "|".join(ELEMENTS) + r")$")
# Regional variants that fall back to a sibling locale before en-US.
_LANG_BASE = {"es-MX": "es-ES"}


def _pick(d: dict, tag: str) -> str | None:
    """Label from a {tag: str} map: tag -> regional sibling -> en-US."""
    return d.get(tag) or d.get(_LANG_BASE.get(tag, "\0")) or d.get("en-US")


def _effect_is_family(t: str) -> bool:
    return (
        any(t.startswith(p) for p in _EFFECT_ELEM_FAMILIES)
        or any(t.startswith(p) for p in _EFFECT_AILMENT_FAMILIES)
        or t.startswith("WorkSuitabilityAddRank_")
        or bool(_ELEMENT_ATTACK_RE.match(t))
    )


def _compose_effect(t: str, tag: str, tui: dict, connectors: dict) -> str | None:
    """Compose a localized family label from a connector template + a localized
    game base term, or None if `t` is not a composable family."""
    def fill(key: str, name: str) -> str | None:
        tmpl = _pick(connectors.get(key, {}), tag)
        return tmpl.replace("{name}", name) if tmpl else None

    for pre, key in _EFFECT_ELEM_FAMILIES.items():
        if t.startswith(pre):
            e = t[len(pre):]
            return fill(key, tui.get(f"COMMON_ELEMENT_NAME_{e}", e))
    for pre, key in _EFFECT_AILMENT_FAMILIES.items():
        if t.startswith(pre):
            s = t[len(pre):]
            return fill(key, tui.get(f"ADDITIONAL_EFFECT_{s}", s))
    if t.startswith("WorkSuitabilityAddRank_"):
        w = t[len("WorkSuitabilityAddRank_"):]
        return fill("workAptitude", tui.get(f"COMMON_WORK_SUITABILITY_{w}", w))
    m = _ELEMENT_ATTACK_RE.match(t)
    if m:
        e = m.group(1)
        return fill("elementAttack", tui.get(f"COMMON_ELEMENT_NAME_{e}", e))
    return None


def _read_text(path: Path, prefix: str) -> dict:
    """{idAfterPrefix: string} from a DT_*Text table (localized or source)."""
    if not path.exists():
        return {}
    out = {}
    for key, r in read_rows(path).items():
        if not key.startswith(prefix):
            continue
        td = r.get("TextData") or {}
        s = td.get("LocalizedString") or td.get("SourceString")
        if s:
            out[key[len(prefix):]] = s
    return out


def _text_by_lang(raw: Path, rel: str, prefix: str) -> dict[str, dict]:
    """{tag: {id: string}}; each L10N folder layered over the ja base for one table."""
    ja = _read_text(raw / rel, prefix)
    by_lang = {JA_TAG: ja}
    for folder, tag in L10N_LANG_TAGS.items():
        loc = _read_text(raw.parent / "L10N" / folder / "Pal" / rel, prefix)
        by_lang[tag] = {**ja, **loc}
    return by_lang


def _all_tags() -> list[str]:
    return [JA_TAG, *L10N_LANG_TAGS.values()]


def _is_roster(cid: str, r: dict, names_by_lang: dict, raw_icons: set) -> bool:
    return (
        r.get("IsPal") is True
        and r.get("CombiRank") != 9999
        and (r.get("ZukanIndex", -1) or -1) >= 1
        and _has_real_name(names_by_lang, cid)
        and f"T_{cid}_icon_normal" in raw_icons
    )


def _stats(r: dict) -> dict:
    return {
        "hp": r.get("Hp", 0),
        "meleeAttack": r.get("MeleeAttack", 0),
        "shotAttack": r.get("ShotAttack", 0),
        "defense": r.get("Defense", 0),
        "craftSpeed": r.get("CraftSpeed", 0),
        "stamina": r.get("Stamina", 0),
        "foodAmount": r.get("FoodAmount", 0),
        "maxFullStomach": r.get("MaxFullStomach", 0),
        "captureRate": round2(r.get("CaptureRateCorrect", 1.0)),
        "price": int(r.get("Price", 0)),
        "maleProbability": r.get("MaleProbability", 0),
        "walkSpeed": r.get("WalkSpeed", 0),
        "runSpeed": r.get("RunSpeed", 0),
        "rideSprintSpeed": r.get("RideSprintSpeed", 0),
        "transportSpeed": r.get("TransportSpeed", 0),
    }


def _work(r: dict) -> dict:
    out = {}
    for wt in WORK_TYPES:
        lvl = r.get(f"WorkSuitability_{wt}", 0) or 0
        if lvl > 0:
            out[wt] = lvl
    return out


def _passives_of(r: dict) -> list[str]:
    out = []
    for i in (1, 2, 3, 4):
        p = r.get(f"PassiveSkill{i}")
        if p not in _NONE:
            out.append(p)
    return out


def _waza_lookup(waza_data: dict) -> dict:
    """{bare WazaID: row} from DT_WazaDataTable (keyed WazaType)."""
    out = {}
    for r in waza_data.values():
        wid = _strip(r.get("WazaType"), _WAZA)
        if wid and wid != "None":
            out[wid] = r
    return out


def _learnset_for(cid: str, grouped: dict[str, list]) -> list:
    """Rows from DT_WazaMasterLevel for a Pal, tolerating casing / boss-gym prefixes."""
    target = cid.lower()
    exact = next((rows for pid, rows in grouped.items() if pid.lower() == target), None)
    if exact:
        return exact
    best = None
    for pid, rows in grouped.items():
        if _WAZA_PREFIX.sub("", pid.lower()) == target and (best is None or len(pid) < len(best[0])):
            best = (pid, rows)
    return best[1] if best else []


def _active_skills(cid: str, learnset: list, waza_by_id: dict) -> list:
    out = []
    for row in learnset:
        wid = _strip(row.get("WazaID"), _WAZA)
        if not wid or wid == "None":
            continue
        w = waza_by_id.get(wid, {})
        out.append({
            "wazaId": wid,
            "level": row.get("Level", 1),
            "element": _strip(w.get("Element"), _ELEM),
            "category": _strip(w.get("Category"), _CAT),
            "power": w.get("DisplayPower", w.get("Power", 0)),
            "coolTime": round2(w.get("CoolTime", 0.0)),
        })
    out.sort(key=lambda s: (s["level"], s["wazaId"]))
    return out


# Buff-tier SkillName keys end in a rank suffix ``_1``…``_5``; the base key (rest
# of the string) identifies one buff line whose per-rank values scale with tier.
_RANK_SUFFIX = re.compile(r"_([1-9])$")


def _partner_effects(r: dict, passive_main: dict) -> list:
    """Buff-type partner effects. Each ``PassiveSkills[]`` entry is one rank tier
    whose ``SkillName.Key`` ends in ``_1``…``_5``; the key minus that suffix names
    the buff *line*. We group by (base line, effect type, target) so distinct lines
    that happen to share a type/target (e.g. a Pal's two ``WorkSpeedUp`` variants)
    stay separate, collect each line's values in rank order, then drop lines that
    are exact duplicates of one already emitted."""
    grouped: dict[tuple[str, str, str], dict[int, float]] = {}
    order: list[tuple[str, str, str]] = []
    for ps in r.get("PassiveSkills") or []:
        for s in ps.get("SkillAndParametersArray") or []:
            key = (s.get("SkillName") or {}).get("Key")
            if not key:
                continue
            row = passive_main.get(key)
            if not row:
                continue
            m = _RANK_SUFFIX.search(key)
            rank = int(m.group(1)) if m else 1
            base = key[: m.start()] if m else key
            for i in (1, 2, 3, 4):
                et = _strip(row.get(f"EffectType{i}"), _EFFT)
                if not et or et in ("no", "None"):
                    continue
                tgt = _strip(row.get(f"TargetType{i}"), _TGT)
                gk = (base, et, tgt)
                if gk not in grouped:
                    grouped[gk] = {}
                    order.append(gk)
                grouped[gk][rank] = round2(row.get(f"EffectValue{i}", 0.0))
    lines: list = []
    seen: set = set()
    for gk in order:
        _, et, tgt = gk
        values = [grouped[gk][k] for k in sorted(grouped[gk])]
        sig = (et, tgt, tuple(values))
        if sig in seen:
            continue
        seen.add(sig)
        lines.append({"type": et, "target": tgt, "values": values})
    return lines


# --- partner-skill description resolver -------------------------------------
# DT_PalFirstActivatedInfoText prose embeds two placeholder families:
#   * angle tokens  <tag id=|X| .../>  — characterName (kept for the client to
#     resolve), itemName / mapObjectName / uiCommon / activeSkillName (looked up
#     in the matching locale table), img (dropped); plus styling wrappers
#     (<Status_Up>, <Elem_*>, </> …) which are stripped.
#   * curly values  {Passive<N>_EffectValue<M>}, {ReferencePassive<N>_…},
#     {ActiveSkillMainValueByRank}, {ActiveSkillOverWriteEffectTime},
#     {ReferenceMsgId_<X>} — each is per-rank, rendered as the 5 rank values
#     joined by "/" (e.g. "5/7/9/11/14"); ReferenceMsgId resolves to the
#     DT_PartnerSkillAppendText phrase with its per-rank <Status_Up> tokens
#     likewise slash-joined. Rank 1 of an append phrase is blank in-game (no
#     bonus) — we render it as the localized "none" word so all five tiers show
#     (e.g. "(Damage Up: None/S/M/L/XL)").

# Localized "none" word for the (blank in-game) rank-1 tier of a ReferenceMsgId
# append phrase, keyed by locale tag (JA base + the 16 L10N tags).
_NONE_WORD = "-"  # placeholder for a blank/no-bonus rank tier (locale-independent)
_TOKEN_RE = re.compile(
    r"<(characterName|itemName|mapObjectName|uiCommon|activeSkillName|img)\b[^>]*?id=\|([^|]+)\|[^>]*?/>"
)
_CURLY_RE = re.compile(r"\{([^}]+)\}")
_STATUS_RE = re.compile(r"<Status_Up>(.*?)</>")
_PASSIVE_TOK = re.compile(r"Passive(\d+)_EffectValue(\d+)")
_REFPASSIVE_TOK = re.compile(r"ReferencePassive(\d+)_EffectValue(\d+)")
_REFMSG_TOK = re.compile(r"ReferenceMsgId_(.+)")


def _fmt_num(v) -> str:
    f = round2(float(v))
    return str(int(f)) if f == int(f) else str(f)


def _join_ranks(parts: list) -> str:
    """Slash-join per-rank parts, but collapse to a single value when every rank is
    identical (e.g. ``+1/1/1/1/1`` → ``+1``)."""
    if not parts:
        return ""
    return parts[0] if len(set(parts)) == 1 else "/".join(parts)


def _fmt_seq(seq) -> str:
    return _join_ranks([_fmt_num(v) for v in seq]) if seq else ""


def _passive_seq(param_row: dict, n: int, m: int, passive_main: dict) -> list | None:
    """Per-rank ``EffectValue<m>`` of the ``n``-th passive in each PassiveSkills tier."""
    vals = []
    for tier in param_row.get("PassiveSkills") or []:
        arr = tier.get("SkillAndParametersArray") or []
        if len(arr) < n:
            return None
        row = passive_main.get((arr[n - 1].get("SkillName") or {}).get("Key"))
        if not row:
            return None
        vals.append(row.get(f"EffectValue{m}", 0))
    return vals or None


def _refpassive_seq(param_row: dict, n: int, m: int, passive_main: dict) -> list | None:
    """Per-rank ``EffectValue<m>`` of the ``n``-th id in each TextReferencePassiveSkills tier."""
    vals = []
    for tier in param_row.get("TextReferencePassiveSkills") or []:
        ids = tier.get("PassiveSkillIds") or []
        if len(ids) < n:
            return None
        row = passive_main.get(ids[n - 1].get("Key"))
        if not row:
            return None
        vals.append(row.get(f"EffectValue{m}", 0))
    return vals or None


def _ref_msg(x: str, append_tbl: dict, none_word: str) -> str:
    """Resolve ``{ReferenceMsgId_<x>}`` to its DT_PartnerSkillAppendText phrase with
    each ``<Status_Up>`` token's per-rank values slash-joined across all existing
    tiers. A tier that is blank in-game (rank 1, "no bonus") contributes ``none_word``
    at every token position; the richest phrase supplies the template structure.

    Ranks are walked 1..maxRank where maxRank is the highest tier with real content,
    so a leading blank tier (rank 1) counts even when the text table dropped its empty
    row on load (e.g. the ja-JP base has no rank-1 string)."""

    def content(p) -> bool:
        return bool(p and p.strip() and p.strip() != "-")

    rows = {i: append_tbl.get(f"{x}_Rank_{i}") for i in (1, 2, 3, 4, 5)}
    maxr = max((i for i, p in rows.items() if content(p)), default=0)
    if maxr == 0:
        return ""
    per, template = [], ""
    for i in range(1, maxr + 1):
        p = rows[i]
        toks = _STATUS_RE.findall(p) if content(p) else []
        per.append(toks)
        if toks:
            template = p
    if not template:
        return ""
    ntok = len(_STATUS_RE.findall(template))
    joined = [
        _join_ranks([toks[i] if len(toks) > i else none_word for toks in per])
        for i in range(ntok)
    ]
    counter = {"i": 0}

    def repl(mm: re.Match) -> str:
        i = counter["i"]
        counter["i"] += 1
        return joined[i] if i < len(joined) else mm.group(1)

    return _STATUS_RE.sub(repl, template)


def _resolve_desc(
    text: str, param_row: dict, passive_main: dict, append_tbl: dict,
    titem: dict, tmap: dict, tui: dict, tname: dict, none_word: str,
) -> str:
    """Resolve one first-activated description to display prose (see notes above).
    ``<characterName>`` tokens are preserved verbatim for the client to substitute."""
    if not text:
        return ""

    def curly(mm: re.Match) -> str:
        tok = mm.group(1)
        if tok == "ActiveSkillMainValueByRank":
            return _fmt_seq((param_row.get("ActiveSkill") or {}).get("ActiveSkill_MainValueByRank"))
        if tok == "ActiveSkillOverWriteEffectTime":
            return _fmt_seq((param_row.get("ActiveSkill") or {}).get("ActiveSkill_OverWriteEffectTimeByRank"))
        p = _PASSIVE_TOK.fullmatch(tok)
        if p:
            return _fmt_seq(_passive_seq(param_row, int(p.group(1)), int(p.group(2)), passive_main))
        rp = _REFPASSIVE_TOK.fullmatch(tok)
        if rp:
            return _fmt_seq(_refpassive_seq(param_row, int(rp.group(1)), int(rp.group(2)), passive_main))
        rm = _REFMSG_TOK.fullmatch(tok)
        if rm:
            return _ref_msg(rm.group(1), append_tbl, none_word)
        return ""

    s = _CURLY_RE.sub(curly, text)

    holds: list[str] = []

    def token(mm: re.Match) -> str:
        tag, tid = mm.group(1), mm.group(2)
        if tag == "characterName":
            holds.append(tid)
            return f"\x00{len(holds) - 1}\x00"
        if tag == "itemName":
            return titem.get(tid, tid)
        if tag == "mapObjectName":
            return tmap.get(tid, tid)
        if tag == "uiCommon":
            return tui.get(tid, tid)
        if tag == "activeSkillName":
            return tname.get(f"ACTION_SKILL_{tid}", tid)
        return ""  # img

    s = _TOKEN_RE.sub(token, s)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    for i, cid in enumerate(holds):
        s = s.replace(f"\x00{i}\x00", f"<characterName id=|{cid}|/>")
    return s


def _action_meta(d: dict) -> dict:
    """Partner *action* metadata from ``DT_PartnerSkill`` (fixed, not per-rank)."""
    m = {
        "effectTime": round2(d.get("EffectTime", 0.0)),
        "coolTime": round2(d.get("CoolDownTime", 0.0)),
        "execCost": round2(d.get("ExecCost", 0.0)),
        "idleCost": round2(d.get("IdleCost", 0.0)),
        "toggle": bool(d.get("IsToggleKey")),
    }
    if d.get("CanChangeWeapon"):
        m["canChangeWeapon"] = True
    if d.get("CanThrowPal"):
        m["canThrowPal"] = True
    return m


def _partner_skill(r: dict, waza_by_id: dict, passive_main: dict, partner_def: dict) -> dict:
    """A Pal's partner skill in one of three shapes:
    * **attack** — ``ActiveSkill.WazaID`` set → waza id, element, per-rank power.
    * **buff**   — ``PassiveSkills[]`` set → per-rank effect lines.
    * **action** — else a named ``ActiveSkill.SkillName`` resolving in
      ``DT_PartnerSkill`` → fixed action metadata plus any per-rank value/cooldown/
      effect-time arrays.
    ``unlockItem`` (condensation gate) is added for any shape."""
    if not r:
        return {}
    act = r.get("ActiveSkill") or {}
    out: dict = {}
    wid = _strip(act.get("WazaID"), _WAZA)
    if wid and wid != "None":
        out["wazaId"] = wid
        el = _strip(waza_by_id.get(wid, {}).get("Element"), _ELEM)
        if el and el != "None":
            out["element"] = el
        ranks = [round2(v) for v in (act.get("ActiveSkill_MainValueByRank") or [])]
        if ranks:
            out["rankValues"] = ranks
    elif r.get("PassiveSkills"):
        effects = _partner_effects(r, passive_main)
        if effects:
            out["effects"] = effects
    else:
        sk = act.get("SkillName")
        d = partner_def.get(sk) if sk and sk not in _NONE else None
        if d:
            ranks = [round2(v) for v in (act.get("ActiveSkill_MainValueByRank") or [])]
            cools = [round2(v) for v in (act.get("ActiveSkill_OverWriteCoolTimeByRank") or [])]
            efftimes = [round2(v) for v in (act.get("ActiveSkill_OverWriteEffectTimeByRank") or [])]
            meta = _action_meta(d)
            # Skip empty "Unknown"-style actions with no timings, cost, toggle or scaling.
            has_meta = meta["toggle"] or any(
                meta[k] for k in ("effectTime", "coolTime", "execCost", "idleCost")
            )
            if has_meta:
                out["action"] = meta
            if ranks:
                out["rankValues"] = ranks
            if cools:
                out["coolTimeByRank"] = cools
            if efftimes:
                out["effectTimeByRank"] = efftimes
    unlock = next(
        (it.get("Key") for it in (r.get("RestrictionItems") or []) if it.get("Key")),
        None,
    )
    if unlock:
        out["unlockItem"] = unlock
    return out


def _drops(cid: str, drop_rows: dict) -> list:
    best: dict[str, dict] = {}
    for r in drop_rows.values():
        if r.get("CharacterID") != cid:
            continue
        for i in range(1, 11):
            item = r.get(f"ItemId{i}")
            if item in _NONE:
                continue
            rate = round2(r.get(f"Rate{i}", 0.0))
            entry = {"item": item, "rate": rate, "min": r.get(f"min{i}", 0), "max": r.get(f"Max{i}", 0)}
            prev = best.get(item)
            if prev is None or rate > prev["rate"]:
                best[item] = entry
    out = list(best.values())
    out.sort(key=lambda d: (-d["rate"], d["item"]))
    return out


def _displayable_passives(passive_main: dict) -> dict:
    return {
        k: v for k, v in passive_main.items()
        if v.get("Category") == "EPalPassiveCategory::SortDisplayable"
    }


def _passive_effects(r: dict) -> list:
    out = []
    for i in (1, 2, 3, 4):
        et = _strip(r.get(f"EffectType{i}"), _EFFT)
        if not et or et in ("no", "None"):
            continue
        out.append({
            "type": et,
            "value": round2(r.get(f"EffectValue{i}", 0.0)),
            "target": _strip(r.get(f"TargetType{i}"), _TGT),
        })
    return out


def run_encyclopedia(raw: Path, data_out: Path, res_out: Path) -> dict:
    raw, data_out, res_out = Path(raw), Path(data_out), Path(res_out)

    mon = read_rows(raw / "DataTable/Character/DT_PalMonsterParameter.json")
    waza_data = read_rows(raw / "DataTable/Waza/DT_WazaDataTable.json")
    waza_master = read_rows(raw / "DataTable/Waza/DT_WazaMasterLevel.json")
    partner_rows = read_rows(raw / "DataTable/PassiveSkill/DT_PartnerSkillParameter.json")
    partner_def = read_rows(raw / "DataTable/PartnerSkill/DT_PartnerSkill.json")
    passive_main = read_rows(raw / "DataTable/PassiveSkill/DT_PassiveSkill_Main.json")
    drop_rows = read_rows(raw / "DataTable/Character/DT_PalDropItem.json")
    names_by_lang = _names_by_lang(raw)
    raw_icons = {p.stem for p in (raw / "Texture/PalIcon/Normal").iterdir() if p.suffix == ".png"}

    waza_by_id = _waza_lookup(waza_data)

    # Learnset grouped by PalId (matched to CharacterID via _learnset_for).
    learnsets: dict[str, list] = {}
    for row in waza_master.values():
        learnsets.setdefault(row.get("PalId"), []).append(row)

    roster = {cid: r for cid, r in mon.items() if _is_roster(cid, r, names_by_lang, raw_icons)}

    pals = []
    for cid, r in roster.items():
        elements = [_strip(r.get("ElementType1"), _ELEM)]
        e2 = _strip(r.get("ElementType2"), _ELEM)
        if e2 and e2 != "None":
            elements.append(e2)
        pals.append({
            "id": cid,
            "zukanIndex": r["ZukanIndex"],
            "zukanIndexSuffix": r.get("ZukanIndexSuffix", "") or "",
            "icon": f"T_{cid}_icon_normal",
            "elements": elements,
            "genus": _strip(r.get("GenusCategory"), _GENUS),
            "size": _strip(r.get("Size"), _SIZE),
            "rarity": r.get("Rarity", 0),
            "nocturnal": bool(r.get("Nocturnal")),
            "reaction": r.get("AIResponse") or "None",
            "stats": _stats(r),
            "work": _work(r),
            "bestWork": _strip(r.get("BestWorkSuitability"), _WORK),
            "partnerSkill": _partner_skill(partner_rows.get(cid), waza_by_id, passive_main, partner_def),
            "activeSkills": _active_skills(cid, _learnset_for(cid, learnsets), waza_by_id),
            "passives": _passives_of(r),
            "drops": _drops(cid, drop_rows),
        })
    pals.sort(key=lambda p: (p["zukanIndex"], p["zukanIndexSuffix"], p["id"]))

    disp = _displayable_passives(passive_main)
    passives = [
        {"id": pid, "rank": v.get("Rank", 0), "effects": _passive_effects(v)}
        for pid, v in disp.items()
    ]

    write_json(data_out / "pals.json", {"pals": pals})
    write_json(data_out / "passives.json", {"passives": passives})

    # ---- Localized text ----------------------------------------------------
    desc_by_lang = _text_by_lang(raw, "DataTable/Text/DT_PalLongDescriptionText.json", "PAL_LONG_DESC_")
    skill_name_by_lang = _text_by_lang(raw, "DataTable/Text/DT_SkillNameText_Common.json", "")
    skill_desc_by_lang = _text_by_lang(raw, "DataTable/Text/DT_SkillDescText_Common.json", "")
    item_name_by_lang = _text_by_lang(raw, "DataTable/Text/DT_ItemNameText_Common.json", "ITEM_NAME_")
    ui_by_lang = _text_by_lang(raw, "DataTable/Text/DT_UI_Common_Text_Common.json", "")
    # Partner-skill description sources (DT_PalFirstActivatedInfoText) + the tables its
    # tokens reference: map-object names and the per-rank append phrases.
    first_by_lang = _text_by_lang(raw, "DataTable/Text/DT_PalFirstActivatedInfoText.json", "PAL_FIRST_SPAWN_DESC_")
    mapobj_by_lang = _text_by_lang(raw, "DataTable/Text/DT_MapObjectNameText_Common.json", "MAPOBJECT_NAME_")
    append_by_lang = _text_by_lang(raw, "DataTable/Text/DT_PartnerSkillAppendText.json", "")

    active_waza = {s["wazaId"] for p in pals for s in p["activeSkills"]}
    partner_waza = {p["partnerSkill"].get("wazaId") for p in pals if p["partnerSkill"].get("wazaId")}
    all_waza = sorted(active_waza | partner_waza)
    unlock_items = {p["partnerSkill"]["unlockItem"] for p in pals if p["partnerSkill"].get("unlockItem")}
    item_ids = sorted({d["item"] for p in pals for d in p["drops"]} | unlock_items)
    effect_types = sorted({e["type"] for p in pals for e in p["partnerSkill"].get("effects", [])})
    target_types = sorted({e["target"] for p in pals for e in p["partnerSkill"].get("effects", [])})
    pal_ids = [p["id"] for p in pals]
    passive_ids = [p["id"] for p in passives]

    # Partner-skill effect/target labels: hand-authored taxonomy
    # (data_src/partner_effects.yaml), per language, falling back lang -> en-US ->
    # raw enum. Types with no authored label are reported for review/localization.
    effect_labels, target_labels, connectors = _load_partner_labels()
    unauthored = [t for t in effect_types if not _effect_is_family(t) and t not in effect_labels]
    if unauthored:
        print(f"encyclopedia: {len(unauthored)} partner effect types unauthored (raw enum): {unauthored}")
    unauth_tgt = [t for t in target_types if t not in target_labels]
    if unauth_tgt:
        print(f"encyclopedia: {len(unauth_tgt)} partner target types unauthored (raw enum): {unauth_tgt}")

    def partner_name_desc(
        cid: str, table_name: dict, tfirst: dict, titem: dict, tui: dict,
        tmap: dict, tappend: dict, none_word: str,
    ) -> dict:
        r = mon[cid]
        name_key = _strip(r.get("OverridePartnerSkillNameTextID"), "")
        if name_key in _NONE:
            name_key = f"PARTNERSKILL_{cid}"
        out = {"name": table_name.get(name_key) or table_name.get(f"PARTNERSKILL_{cid}") or ""}
        d = _resolve_desc(
            tfirst.get(cid, ""), partner_rows.get(cid) or {}, passive_main, tappend,
            titem, tmap, tui, table_name, none_word,
        )
        if d:
            out["desc"] = d
        return out

    def passive_desc_key(pid: str) -> str:
        o = disp[pid].get("OverrideDescMsgID")
        return o if o and o != "None" else f"PASSIVE_{pid}"

    for tag in _all_tags():
        tname, tdesc = skill_name_by_lang[tag], skill_desc_by_lang[tag]
        tdescr, titem, tui = desc_by_lang[tag], item_name_by_lang[tag], ui_by_lang[tag]
        tfirst, tmap, tappend = first_by_lang[tag], mapobj_by_lang[tag], append_by_lang[tag]

        pals_loc = {}
        for cid in pal_ids:
            entry = {
                "name": names_by_lang[tag].get(cid) or names_by_lang["en-US"].get(cid) or cid,
                "description": tdescr.get(cid, ""),
            }
            ps = partner_name_desc(
                cid, tname, tfirst, titem, tui, tmap, tappend, _NONE_WORD,
            )
            if ps.get("name") or ps.get("desc"):
                entry["partnerSkill"] = ps
            pals_loc[cid] = entry
        write_json(data_out / "locales" / tag / "pals.json", pals_loc)

        skills_loc = {}
        for wid in all_waza:
            s = {"name": tname.get(f"ACTION_SKILL_{wid}", "")}
            d = tdesc.get(f"ACTION_SKILL_{wid}")
            if d:
                s["description"] = d
            skills_loc[wid] = s
        write_json(data_out / "locales" / tag / "skills.json", skills_loc)

        passives_loc = {}
        for pid in passive_ids:
            s = {"name": tname.get(f"PASSIVE_{pid}", "")}
            d = tdesc.get(passive_desc_key(pid))
            if d:
                s["description"] = d
            passives_loc[pid] = s
        write_json(data_out / "locales" / tag / "passives.json", passives_loc)

        items_loc = {item: titem.get(item, item) for item in item_ids}
        write_json(data_out / "locales" / tag / "items.json", items_loc)

        enums_loc = {
            "elements": {e: tui.get(f"COMMON_ELEMENT_NAME_{e}", e) for e in ELEMENTS},
            "work": {wt: tui.get(f"COMMON_WORK_SUITABILITY_{wt}", wt) for wt in WORK_TYPES},
        }
        write_json(data_out / "locales" / tag / "enums.json", enums_loc)

        effects_loc = {
            t: (_compose_effect(t, tag, tui, connectors) or _pick(effect_labels.get(t, {}), tag) or t)
            for t in effect_types
        }
        write_json(data_out / "locales" / tag / "partnerEffects.json", effects_loc)

        targets_loc = {
            t: (_pick(target_labels.get(t, {}), tag) or t)
            for t in target_types
        }
        write_json(data_out / "locales" / tag / "partnerTargets.json", targets_loc)

    # ---- Icons -------------------------------------------------------------
    icons_dir = res_out / "icons"
    icons_dir.mkdir(parents=True, exist_ok=True)
    converted = 0

    def convert(src: Path, dest: Path) -> int:
        if dest.exists() or not src.exists():
            return 0
        with Image.open(src) as img:
            img = img.convert("RGBA") if img.mode not in ("RGB", "RGBA") else img
            img.save(dest, "WEBP", quality=90, method=6)
        return 1

    for name in ELEMENTS:
        src = raw / "Texture/UI/Main_Menu" / f"T_Icon_element_{ELEMENT_ICON_INDEX[name]:02d}.png"
        converted += convert(src, icons_dir / f"element_{name}.webp")
    for wt in WORK_TYPES:
        # Colored work-suitability icons (white WorkRank_* silhouettes lack a
        # color and omit OilExtraction; the palwork_NN set is colored + complete).
        src = raw / "Texture/UI/InGame" / f"T_icon_palwork_{WORK_ICON_INDEX[wt]:02d}.png"
        converted += convert(src, icons_dir / f"work_{wt}.webp")

    langs = len(_all_tags())
    print(
        f"encyclopedia: {len(pals)} pals, {len(passives)} passives, "
        f"{len(all_waza)} waza, {len(item_ids)} items, "
        f"{langs} locales, {converted} icons converted"
    )
    return {"pals": pals, "passives": passives, "wazaIds": all_waza}


if __name__ == "__main__":
    run_encyclopedia(RAW, DATA_OUT, RES_OUT)
