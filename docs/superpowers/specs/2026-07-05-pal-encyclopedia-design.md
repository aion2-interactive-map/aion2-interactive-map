# Pal Encyclopedia — Design

Date: 2026-07-05
Scope: Palworld app only (`frontend/apps/palworld`), tools (`tools/palworld`), data (`data-palworld`), resource (`resource-palworld`).

## Goal

Add a Pal Encyclopedia: a new group of pages plus the data behind them, covering
per-pal description, skills (partner / active / passive), work suitability, drops &
farm products, an embedded spawn map, base stats, and other useful data. Then use the
new data to enrich the map marker popup and the breeding page, and add a searchable
list of all pals.

## What the raw export gives us (verified 2026-07-05)

Raw root: `E:/SteamLibrary/steamapps/common/Palworld/Exports/Pal/Content/Pal`.
All tables are CUE4Parse exports read via `read_rows` (`[{"Rows": {...}}]`).

| Field group | Source table | Key / notes |
|---|---|---|
| Base stats, elements, size, genus, rarity, food, capture, price, speeds, male% | `DataTable/Character/DT_PalMonsterParameter` | keyed by CharacterID. `Hp, MeleeAttack, ShotAttack, Defense, CraftSpeed, Stamina, MaxFullStomach, FoodAmount, CaptureRateCorrect, Price, Rarity, ElementType1/2, Size, GenusCategory, Nocturnal, Predator, MaleProbability, *Speed`. |
| Work suitability (13 types + best) | same table | `WorkSuitability_<Type>` ints (0 = none); `BestWorkSuitability`. |
| Innate passives (up to 4) | same table | `PassiveSkill1..4` → ids into the passive list. |
| Description | `DataTable/Text/DT_PalLongDescriptionText` | key `PAL_LONG_DESC_<id>`; **localized** (present in every `L10N/<lang>/…`). |
| Active-skill learnset | `DataTable/Waza/DT_WazaMasterLevel` | rows `PalId, WazaID (EPalWazaID::X), Level`. |
| Active-skill stats | `DataTable/Waza/DT_WazaDataTable` | keyed `NewRow_*`; `WazaType, Element, Category (Shot/Melee), Power, CoolTime, MinRange, MaxRange`, plus status effects. |
| Partner skill | `DataTable/PassiveSkill/DT_PartnerSkillParameter` | keyed by CharacterID; `ActiveSkill.WazaID`, `ActiveSkill.ActiveSkill_MainValueByRank` (5 values = partner-skill levels, unlocked via Pal **condensation** rank 0–4). |
| Passive skill list (global) | `DataTable/PassiveSkill/DT_PassiveSkill_Main` | 1905 rows; keep the **115** with `Category = EPalPassiveCategory::SortDisplayable`; each has `Rank`, `EffectType1..4/EffectValue*/TargetType*`. |
| Kill drops | `DataTable/Character/DT_PalDropItem` | keyed `<CharacterID><level:03d>`; `ItemId1..10, Rate*, min*, Max*`. |
| Skill names/desc | `DataTable/Text/DT_SkillNameText_Common`, `DT_SkillDescText_Common` | active: `ACTION_SKILL_<Waza>`; passive: `PASSIVE_<id>`; partner: `PARTNERSKILL_<id>`. **localized**. |
| Item names | `DataTable/Text/DT_ItemNameText_Common` | `ITEM_NAME_<ItemId>`. **localized**. |
| Element / work labels | `DataTable/Text/DT_UI_Common_Text` | `COMMON_ELEMENT_NAME_<E>`, work-suitability label keys; **localized**. |
| Element icons | `Texture/UI/Main_Menu/T_Icon_element_00..08` | 9 elements by index. |
| Work icons | `Texture/UI/InGame/SkillIcon/T_icon_skill_pal_WorkRank_<Type>` | one per suitability. |
| Pal icons | `Texture/PalIcon/Normal/T_<id>_icon_normal` | already converted by breeding stage. |

Base (`_Common`) strings are JA and mojibake in the export; correct text comes from
`L10N/<folder>/…` layered over the base, exactly as `breeding.py` already does for names
(`_names_by_lang`). Roster filter matches breeding: `IsPal`, `CombiRank != 9999`,
`ZukanIndex >= 1`, real name, icon present.

Farm/ranch products ("products in farm"): to be resolved during implementation
(search for a ranch/`MonsterFarm` drop table, e.g. `DT_PalDropItem` ranch variant or a
dedicated table). If none exists, show the MonsterFarm suitability level only and omit
the farm-products section. Kill drops are guaranteed from `DT_PalDropItem`.

## Data outputs (`data-palworld`)

New generated files (1-space indent, same `write_json` as the rest of the pipeline):

- `pals.json` — `{ pals: [PalEntry] }`, sorted by `(zukanIndex, suffix)`, only catalogued pals.
  ```
  PalEntry = {
    id, zukanIndex, zukanIndexSuffix, icon,
    elements: [Element, Element?], genus, size, rarity, nocturnal,
    stats: { hp, meleeAttack, shotAttack, defense, craftSpeed, stamina,
             foodAmount, maxFullStomach, captureRate, price, maleProbability,
             walkSpeed, runSpeed, rideSprintSpeed, transportSpeed },
    work: { <WorkType>: level, … },        // only levels > 0
    bestWork: WorkType,
    partnerSkill: { name-key implicit=id, wazaId?, element?, rankValues: number[] },
    activeSkills: [ { wazaId, level, element, category, power, coolTime } ],  // sorted by level
    passives: [ passiveId, … ],            // innate, into passives.json
    drops: [ { item, rate, min, max } ]    // kill loot; deduped, rate desc
  }
  ```
- `passives.json` — `{ passives: [ { id, rank, effects: [ { type, value, target } ] } ] }` (the 115 displayable).
- Locales `locales/<lng>/`:
  - `pals.json` → `{ palId: { name, description } }`
  - `skills.json` → `{ wazaId: { name, description } }` (all active + partner waza)
  - `passives.json` → `{ passiveId: { name, description } }`
  - `items.json` → `{ itemId: name }` (drop items)
  - `enums.json` → `{ elements: { Element: name }, work: { WorkType: { name, description? } } }`

Element/work descriptions: use game text where a key exists; otherwise element/work
`name` only (icons carry the meaning). No hand-authored 17-language tables unless a
label has no game key.

## Resource outputs (`resource-palworld/icons`)

Convert PNG→WebP (same as breeding stage) with stable frontend-friendly names:
- `element_<Element>.webp` (9)
- `work_<WorkType>.webp` (13)
- drop-item icons `item_<ItemId>.webp` — **optional**; only if `DT_ItemIconDataTable`
  mapping is trivial. Otherwise the UI shows item names without icons.

## Tools implementation

New module `tools/palworld/encyclopedia.py` (Python, run `uv run python -m palworld.encyclopedia`),
reusing `maps.common.read_rows/write_json` and `maps.extract.{JA_TAG, L10N_LANG_TAGS}`.
It shares the roster/name logic with `breeding.py` (extract the shared name-by-lang and
roster helpers into a small shared helper if that avoids duplication; otherwise import
from `breeding`). Enum mappings (element index↔name, work-type list) live as constants
in this module. Adds a test under `tools/tests/` covering: roster count, one known pal's
stats/work/drops, active-skill learnset non-empty, passive list length (115).

## Frontend

### Routing (code-based TanStack Router, `main.tsx`)
Add `/pals` (list) and `/pals/$id` (detail) routes alongside `/` and `/breeding`.
Add a "Pals" link to the top bar nav (map / pals / breeding).

### Data layer (`lib/data.ts`, new `lib/pals.ts`)
- Types: `PalEntry`, `ActiveSkill`, `PartnerSkill`, `Passive`, `Drop`, `Element`, `WorkType`.
- Loaders (parallel, cached per lng): `loadPals(lng)` → `{ pals, byId, names, descriptions }`,
  `loadPassives(lng)`, `loadEnums(lng)`, `loadSkillNames(lng)`, `loadItemNames(lng)`.
- Icon URL helpers in `lib/assets.ts`: `elementIconUrl`, `workIconUrl`, reuse `palIconUrl`.

### Pages (`features/pals/`)
- `PalsListPage.tsx` (`/pals`): responsive grid of pal cards (icon, `No.###`, name,
  element badges, best-work icon). Search box (name + Paldeck no.) using the existing
  cmdk/Command style; optional element filter chips. Cards link to detail.
- `PalDetailPage.tsx` (`/pals/$id`): two-column layout mirroring the aion2 wiki detail
  pages (content + sticky 280px sidebar). Sections:
  1. Header — icon, name, `No.###`, element badges, size / genus / rarity, nocturnal.
  2. Description.
  3. Base stats — hp, melee/shot attack, defense, craft speed, stamina, food amount &
     max stomach, capture rate, price, movement speeds (labelled, `StatRow`/bars).
  4. Work suitability — per active type: work icon + level (dots/number) + name +
     description tooltip; best-work highlighted.
  5. Partner skill — name, description, "unlocked via condensation (Lv.1–5)" note,
     rank-value scaling row.
  6. Active skills — table: level, name, element icon, category, power, cooldown, desc.
  7. Passive skills (innate) — name + effect description each.
  8. Drops (on kill) — item (icon?)+name, drop rate %, qty range. Farm products if available.
  9. Spawn map — embedded mini-map showing this pal's spawns **unclustered** (see below).
  10. Breeding — parents that produce this pal and what it breeds into, from `breeding.json`,
      linking into `/breeding`.
- Shared atoms (`features/pals/components/`): `ElementBadge`, `WorkSuitability`,
  `StatRow`, `ActiveSkillRow`, `PassiveRow`, `DropRow`, `PalSpawnMap`, `PalCard`.
- `WikiLoading` / `WikiNotFound` equivalents (mirror aion2).

### Embedded spawn map (`PalSpawnMap`)
Reuse the existing per-pal spawn markers already in `markers/<map>.json` (subtype = pal id).
Render a small `GameMapView` (from `@gamemap/map-engine`) limited to that pal's markers
with clustering disabled so every spawn location shows individually. If the engine cannot
disable clustering, fall back to a minimal Leaflet `MapContainer` + `GameMapTiles` +
plain markers. Show a map toggle when the pal spawns on both MainWorld and WorldTree, and
a "View on full map" link.

### Map popup enrichment (`App.tsx` `renderPopupContent`)
For pal markers, add: element badges, best-work icon, and a "View in Encyclopedia →"
link to `/pals/$id`. Keep the popup compact — full detail lives on the page.

### Breeding page (`BreedingPage.tsx`)
Make each `PalChip` link to `/pals/$id` (the "breeding popup" enrichment); optionally add
element badges to the chip. Preserve the in-progress breeding-power badge work already
present in the working tree.

### i18n (`i18n.ts` + new `palStrings.ts`)
Add encyclopedia UI strings (section titles, stat labels, "unlocked via condensation",
"drop rate", search placeholder, nav "Pals") across all 17 languages, following the
`breedingStrings.ts` pattern. Data-driven labels (element, work names/descriptions, skill
names, item names) come from the `enums`/`skills`/`items`/`pals` locale files, not i18n.

## Non-goals (YAGNI)
- No new backend endpoints; encyclopedia is fully static/derived data.
- No evolution chains (Palworld has no evolutions).
- No editing/admin UI for pals.
- No hand-authored 17-language enum tables unless a label lacks a game text key.
- Item drop icons optional; skip if the icon mapping isn't trivial.

## Verification
- Tools: `uv run python -m palworld.encyclopedia` regenerates data; run `tools/tests`.
- Frontend: `pnpm --filter palworld build` (typecheck) + dev server; in browser verify
  `/pals` search, a detail page's every section, the embedded spawn map, the enriched
  map popup link, and breeding chip links. Verify a second language (e.g. zh-CN, ja-JP).
