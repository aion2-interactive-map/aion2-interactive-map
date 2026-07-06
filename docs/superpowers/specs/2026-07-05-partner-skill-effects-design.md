# Partner-Skill Effect Extraction — Design

**Date:** 2026-07-05
**Status:** Approved, implementing in auto mode.

## Problem

The Pal Encyclopedia's partner-skill section only shows the localized **name** plus, for
attack-type skills, a per-rank multiplier array. The raw game data holds far more: the
mechanical effect (type + per-rank numeric values + target) for buff-type partner skills,
and the item that unlocks the skill. None of this is currently extracted, so buff-type
partner skills (479 of the roster) display only a name.

## Raw-data findings

`DataTable/PassiveSkill/DT_PartnerSkillParameter.json` (keyed by CharacterID) has four
fields per row:

- **`ActiveSkill`** — attack-type partner skills. `WazaID` + `ActiveSkill_MainValueByRank`
  (per-rank multiplier, already extracted as `rankValues`). Description is the waza's own
  localized text (already emitted in the `skills` locale).
- **`PassiveSkills`** — buff-type partner skills. Each `SkillAndParametersArray[].SkillName.Key`
  is a passive-skill id resolvable in `DT_PassiveSkill_Main`, where `EffectType1..4` /
  `EffectValue1..4` / `TargetType1..4` give the concrete effect. The `_1`…`_5` key suffixes
  are the five rank tiers (values scale, e.g. PinkCat carry-weight 100→200).
- **`RestrictionItems`** — the unlock item (e.g. `SkillUnlock_KingBahamut_Dragon`), on ~290 pals.
- `TextReferencePassiveSkills` — not needed.

**No prose description exists** for buff-type partner skills: `OverridePartnerSkillDescTextID`
is unused (2 dummy rows). The game composes the in-game text at runtime from 36 localized
"append" fragments (`DT_PartnerSkillAppendText`, rank-decorated, e.g. "（ダメージ増加：中）").
Roster pals use ~156 distinct effect-type enums, most of which have no clean 1:1 localized
label. So labels are handled by a hand-authorable taxonomy, seeded from the game where a clean
mapping exists and raw enum otherwise (for later review).

## Design

### 1. Extraction — `tools/palworld/encyclopedia.py`

`_partner_skill(cid, partner_rows, waza_by_id, passive_main)` gains:

- `unlockItem`: `RestrictionItems[0].Key` stripped (omitted when absent).
- `effects`: for each `PassiveSkills[].SkillAndParametersArray[].SkillName.Key`, resolve in
  `passive_main`; read non-`no` `EffectType{i}`/`EffectValue{i}`/`TargetType{i}`. Group by
  `(type, target)` across the five rank entries, collecting numbers into `values: [r1..r5]`.
  Shape: `{"type": "MaxInventoryWeight", "target": "ToTrainer", "values": [100,120,140,170,200]}`.

`rankValues`, `wazaId`, `element` unchanged.

### 2. Effect-type labels — `tools/palworld/data_src/partner_effects.yaml`

New taxonomy file (same shape family as `types.yaml`): `effects: { <EffectType>: { <tag>: label } }`.
The emitter writes `data-palworld/locales/<tag>/partnerEffects.json = {effectType: label}` with
fallback `lang → en-US → raw enum`. The YAML is seeded with hand-authored localized labels for
the effect types actually used by roster pals; types left unauthored fall back to the raw enum,
and the build prints the unauthored set for review. Only roster-used effect types are emitted.

### 3. Frontend — `apps/palworld/src/lib/pals.ts`, `features/pals/PalDetailPage.tsx`

- `PartnerSkill` gains `unlockItem?: string` and `effects?: {type; target; values:number[]}[]`.
- `PalsBundle` loads `partnerEffects: Record<string,string>` from the new locale file.
- Partner-skill section renders: unlock item (icon + name) when present; attack-type keeps the
  waza description; buff-type renders an effect list — localized label + per-rank values +
  target ("to you" / "to Pal").
- New i18n strings (`palStrings.ts`): section labels for unlock, and the two target phrasings.

### Scope guard

Attack vs buff is derived (WazaID present → attack). No change to map/breeding popups. All 17
languages. Verify `pnpm --filter palworld run build` + browser (ja-JP and en-US).
