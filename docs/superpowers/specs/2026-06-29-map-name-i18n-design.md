# Map-name i18n — design

**Date:** 2026-06-29
**Status:** Approved (pending spec review)
**Scope:** `tools/` (data emission) + regenerated `data/`. No frontend code changes.

## Problem

Map titles in the map selector are not internationalized. For every language,
`data/locales/<lng>/maps.json` contains the **same English** strings, so the
zh-CN / zh-TW UIs show English map names.

The frontend wiring is already correct: `SelectMap.tsx` renders
`t(\`maps:${m.name}.name\`)`, and `maps` is a Category-1 "game-data" namespace
(`frontend/src/i18n.ts:20-27`) served as JSON from `data/locales/<lng>/maps.json` —
exactly like `regions`, `markers`, and `types`, which **are** localized. Map names
are the one game-data namespace whose emitter never localized them.

Root cause: `tools/aion2/tools/maps/emit_frontend.py` hardcodes English titles in
`_MAP_DISPLAY_EN`, and `_map_display_zh()` returns that same English string (it
explicitly ignores the game L10N data). So all three locale files get English.

## Decision summary

- **Source of truth:** the game L10N export (same mechanism region/subzone names
  already use), not a hand-maintained dictionary.
- **No hardcoded titles.** Every map resolves a localized name from L10N.
- **Disambiguation:** game L10N base name + a faction suffix derived from the
  machine name. Abyss/Reshanta maps get no suffix.
- **Visibility:** show `World_L_B` / `World_D_B`; hide the deprecated
  `Abyss_Reshanta_B`.

## How localized names resolve

Each map's localized title comes from `Map.json`'s `Desc.Key`, resolved through the
existing `L10N` loader (`tools/aion2/tools/maps/l10n.py`), which looks up
`String_<key>_body` in `en-US/L10NString.json` and `zh-TW/L10NString.json`
(zh-CN is OpenCC `t2s` of the zh-TW body — identical to how region names already work).

Some maps are **absent from `Map.json`** (`World_L_B`, `World_D_B`, and the
deprecated `Abyss_Reshanta_B`) but still have L10N bodies under the conventional
key `STR_Map_<name>`. So resolution uses a fallback:

```
desc_key = Map.json[name].Desc.Key   if the map is in Map.json
         = f"STR_Map_{name}"         otherwise
base_en   = l10n.en(desc_key)
base_zhCN = l10n.zh_cn(desc_key)      # t2s of zh-TW body
```

Verified `Desc.Key` / body values from the export:

| Map | `Desc.Key` | en body | zh-TW body |
|---|---|---|---|
| World_L_A | `STR_Map_World_L_A` | Verteron | 斐爾特朗 |
| World_D_A | `STR_Map_World_D_A` | Altgard | 亞爾特蓋德 |
| World_L_B | *(absent)* → `STR_Map_World_L_B` | Eltnen | 耶爾特奈 |
| World_D_B | *(absent)* → `STR_Map_World_D_B` | Morheim | 莫爾海姆 |
| World_L_Starter | `STR_Map_Poeta` | Poeta | 波伊塔 |
| World_D_Starter | `STR_Map_World_D_Starter` | Ishalgen | 伊斯夏爾肯 |
| Abyss_Reshanta_A | `STR_Map_Abyss_Reshanta_A` | Chaotic Lower Reshanta | 渾沌艾雷修藍塔下層 |
| Abyss_Reshanta_B | *(absent / hidden)* | Chaotic Middle Reshanta | 渾沌艾雷修藍塔中層 |
| Abyss_Reshanta_C | `STR_Map_Abyss_Reshanta_C` | Chaotic Middle Reshanta | 渾沌艾雷修藍塔中層 |

## Faction suffix

Appended by the emitter, derived from the machine name. No per-map curation.

| Machine-name marker | en suffix | zh suffix |
|---|---|---|
| contains `_L_` | ` (Elyos)` | `（天）` |
| contains `_D_` | ` (Asmodian)` | `（魔）` |
| neither (Abyss) | *(none)* | *(none)* |

zh-TW suffix is produced by the existing `_to_tw()` OpenCC pass over the composed
zh-CN string (`（天）` / `（魔）` are unchanged by the conversion).

The suffix is kept on the Starter maps ("Poeta (Elyos)", "Ishalgen (Asmodian)") for
consistency with the other world maps.

## Resulting visible map list

| Map | visible | en | zh-CN* | zh-TW |
|---|---|---|---|---|
| World_L_A | yes | Verteron (Elyos) | 斐尔特朗（天） | 斐爾特朗（天） |
| World_D_A | yes | Altgard (Asmodian) | 亚尔特盖德（魔） | 亞爾特蓋德（魔） |
| World_L_B | **yes (changed)** | Eltnen (Elyos) | 耶尔特奈（天） | 耶爾特奈（天） |
| World_D_B | **yes (changed)** | Morheim (Asmodian) | 莫尔海姆（魔） | 莫爾海姆（魔） |
| World_L_Starter | yes | Poeta (Elyos) | 波伊塔（天） | 波伊塔（天） |
| World_D_Starter | yes | Ishalgen (Asmodian) | 伊斯夏尔肯（魔） | 伊斯夏爾肯（魔） |
| Abyss_Reshanta_A | yes | Chaotic Lower Reshanta | 混沌艾雷修蓝塔下层 | 渾沌艾雷修藍塔下層 |
| Abyss_Reshanta_B | **no (changed)** | — | — | — |
| Abyss_Reshanta_C | yes | Chaotic Middle Reshanta | 混沌艾雷修蓝塔中层 | 渾沌艾雷修藍塔中層 |

\* zh-CN values are illustrative; the emitted string is exactly OpenCC `t2s` of the
zh-TW body. The implementation must use the generated output, not these renderings.

## Implementation

1. **`tools/aion2/tools/maps/extract.py`** — add a small resolver that owns the
   `Map.json` + L10N lookup (this module already loads both: `_maps_index()` at
   `extract.py:64`, `L10N` at `extract.py:311/674`):

   ```python
   def map_title(name: str, l10n: L10N) -> dict[str, str]:
       entry = _maps_index().get(name) or {}
       desc_key = (entry.get("Desc") or {}).get("Key") or f"STR_Map_{name}"
       return {"en": l10n.en(desc_key), "zhCN": l10n.zh_cn(desc_key)}
   ```

2. **`tools/aion2/tools/maps/emit_frontend.py`**
   - Import `L10N` and `map_title` (resolution stays in `extract.py`; the emitter
     only composes the display string).
   - Replace `_MAP_DISPLAY_EN` / `_map_display_en` / `_map_display_zh` with:
     base = `map_title(name, l10n)` (fallback chain `base → name.replace("_"," ")`),
     then append the faction suffix derived from the machine name.
   - Build the `maps` locale block for every `MAP_META` name from this (works for
     maps not present in the parse, e.g. `World_L_B` / `World_D_B`). zh-TW continues
     to come from the existing `_to_tw()` step in `_locale_block()`.
   - Flip `MAP_META` flags: `World_L_B` → `isVisible: True`,
     `World_D_B` → `isVisible: True`, `Abyss_Reshanta_B` → `isVisible: False`.

3. **Regenerate `data/`** with the emitter and verify (see below).

4. **(Optional) cleanup** — delete the dead `frontend/public/locales/<lng>/maps.yaml`
   files. They are never loaded (the `maps` namespace resolves to `data/`), so this
   is pure dead-code removal and may be skipped without affecting behavior.

## Verification

- `data/locales/en/maps.json`, `zh-CN/maps.json`, `zh-TW/maps.json` contain the
  names above, and the three files **differ** (no longer all-English).
- `data/maps.json`: `World_L_B` / `World_D_B` have `isVisible: true`;
  `Abyss_Reshanta_B` has `isVisible: false`.
- Frontend selector (run the app, switch language): map names localize correctly,
  Reshanta B is absent from the list, World L_B / D_B appear.

## Non-goals

- No new languages (Korean stays out; supported set remains en / zh-CN / zh-TW).
- No frontend code changes (`SelectMap.tsx` / `i18n.ts` already consume `maps`).
- No localization of region/marker/type names — those already work.
- `Abyss_Reshanta_B` data recovery remains deferred (separate, pre-existing item);
  this change only hides it from the selector.

## Risks / caveats

- zh-CN is round-tripped (game zh-TW → `t2s` → zh-CN, then `_to_tw()` back to
  zh-TW for the zh-TW file). This matches the existing region pipeline; any
  conversion imperfection is consistent with how regions already behave.
- If a future map is absent from `Map.json` **and** has no `STR_Map_<name>` body,
  it falls back to `name.replace("_"," ")` (machine-ish name). Acceptable; surfaced
  by the verification step.
