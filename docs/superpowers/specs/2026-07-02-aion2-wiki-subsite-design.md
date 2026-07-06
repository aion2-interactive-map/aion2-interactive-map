# AION2 Wiki Subsite — Design (v2)

**Date:** 2026-07-02 (v2 — redesigned same day after direct inspection of the quest tables;
v1 was based on a survey that missed `QuestStep`/`QuestReward`/`QuestString`)
**Status:** Implemented 2026-07-02 — phases 1–3 done (quest/NPC/item pages, region highlights,
resolver upgrades, site-wide design + i18n pass across en/zh-CN/zh-TW); phase 4 (SEO prerender) deferred.
Plan: `docs/superpowers/plans/2026-07-02-wiki-phase23-npc-item.md`
**Repos touched:** `frontend/` (routes, embedded map, wiki pages), `tools/` (new wiki emitter), `data/` (new generated output)

## 1. Goal

Add a wiki to the AION2 site whose pages are **fully auto-generated** from the parsed
game data, and which is **deeply integrated with the interactive map** in both directions:

- A wiki page (e.g. a quest) renders an inline map showing **only that entity's POIs** —
  no default markers, no sidebar.
- Markers on the main map can **deep-link to their wiki page**.

The wiki is not a human-authoring CMS. All content is derived from the game export by
`tools/` and served as JSON, exactly like markers are today.

## 2. Decisions (locked during brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Delivery | **Same app, new `/wiki/*` routes** | Deep map integration wants one component tree; reuses router, i18n, theme, markdown. |
| Content source | **Fully auto-generated** from game data | No hand-authoring; regenerates cleanly on game patches. |
| Rendering foundation | **Dynamic site with JSON** (SPA fetches per-entity JSON) | Preserves the existing `data/`↔`frontend/` decoupling: a game patch regenerates `data/` only, frontend never rebuilds. SSG would couple the frontend build to data and force a full rebuild+redeploy on every patch. |
| SEO | **Prerender snapshots layered on top** (deferred phase) | Buys back the one thing SSG wins (crawlability/first paint) without giving up decoupling. |
| Embedded map | **Extract a shared presentational `<EmbeddedMap>`** | Avoids duplicating projection/tile/marker logic (which would drift); improves the current map code. |
| v1 entity scope | **Quests, NPCs/Monsters, Items** | Quests are the flagship; NPCs/monsters have coords; items link to sources. |

## 3. Ground truth: what the quest tables actually contain (verified by direct inspection)

All tables are columnar UE exports (`{Version, Ids, Properties.Data[]}`) under
`E:\Exports\AION2\Content\Data\Table\`.

**`Quest.json` — 1,429 quests.** Rich per-quest fields:
`ID`, `Name` (string key, e.g. `HQ1100010`), `Race`, `UnlockLevel`, `RecommendedLevel`,
`QuestText` (L10N key), `Type` (Hero/District/Duty…), `Part`, `Grade`,
`AcquireMapId`, `AcquireBeforeNpcTalk` / `AcquireAfterNpcTalk` / `AcquireNotiNpcTalk`
(note: **not** a single `AcquireNpcTalk` as v1 assumed), `AcquireItemList`,
`CompleteType`/`CompleteMapId`/`CompleteNpcTalk`, `NextQuestName` (**quest chains**),
`RepeatType`, `bEnableGiveup`.

**`QuestStep.json` — 2,553 steps.** Keyed by `QuestName` + `Order`. Each step has a
`GoalList[]` of objectives, and **each objective carries its own map + target**:
- `Type` — distribution: `KillNpc` 1132, `AskNpc` 587, `ClearMapEvent` 524, `UseEnvObj` 350,
  `EnterVolumePC` 148, `CompleteCelviceTalk` 92, `EnterSubZone` 14, `CollectItem` 16, others small.
- `Value[]` — target refs (e.g. NPC string name `N_L1_Q_Xiaolinlin_01`, talk id).
- `MapId` — per-objective map.
- `bMarker` — **the game's own "show a map marker for this objective" flag.**
- `QuestMovePointName` (43 uses), `TeleportName`, `ArrivalAction`, `bOptional`.

**`QuestReward.json` — 1,321 reward groups** keyed by `Group` (≈ quest id):
`ExpReward`, `ItemRewards` (Gold etc.), `ItemNormalRewards` (item name + count +
enchant level), `ItemSelectRewards`, `RandomReward`.

**Also present, for later phases:** `QuestString.json`, `QuestPart.json`, `QuestType.json`,
`DistrictQuestGroup.json`, `DutyQuestGroup.json`.

**Supporting tables:** `NpcData.json` (NPC by string name: `Desc.Key` L10N, `Level`,
`bNamed`, `NpcType`), per-map `MapData.json` `SpawnInfo` (NPC → world X,Y,Z),
`Item.json`, `NpcLoot.json`. Subzone polygons already exist in `data/regions/<Map>.json`.

## 4. Architecture

```
Raw export: Quest.json + QuestStep.json + QuestReward.json + QuestString.json
            NpcData.json, Item.json, NpcLoot.json, per-map MapData.json SpawnInfo
   │
   ▼  tools/  (new emit_wiki.py — objective resolvers + joins + L10N + backlink indexes)
data/wiki/<type>/<id>.json         (per-entity page data, steps[], pois[], rewards, chain)
data/wiki/index/<type>.json        (hub/list + minisearch index)
data/locales/<lang>/wiki/...       (localized text, mirrors marker-locale pattern)
data/markers/<Map>.json            (extended: optional entityType/entityId)
   │
   ▼  HTTP (same as markers today)
frontend/  /wiki/* routes  ──uses──▶  <EmbeddedMap> ◀──uses── main map route
```

No new framework, no second build. One shared map engine.

## 5. Data model & pipeline (`tools/`)

New module (e.g. `tools/aion2/tools/wiki/emit_wiki.py`), idempotent and re-runnable
(same contract as `emit_frontend.py`).

### 5.1 Objective → POI resolvers (the core of the emitter)

POIs are resolved **per quest-step objective** (not per quest, as v1 had it), honoring the
game's own `bMarker` flag. One resolver per objective type, tiered by confidence:

| Objective type | Resolver | Coverage |
|---|---|---|
| `AskNpc`, `KillNpc`, `CloseNpc` | `Value[0]` NPC name → `NpcData` → `SpawnInfo` coords (all spawns) | high — top 2 types = ~1.7k objectives |
| `UseEnvObj`, `CollectItem` (gather) | EnvObj name → env spawns (reuses the existing gather-node parsing) | high |
| `EnterSubZone` | subzone id → region polygon from `data/regions/` → **region highlight**, not a point | high |
| `EnterVolumePC`, `ClearMapEvent`, move-points | best-effort (volume/event/move-point positions in `MapData.json` where present) | partial — emit what resolves, log the rest |
| non-spatial (`PCLevel`, `ClearQuest`, …) | no POI; rendered as text-only objectives | n/a |

Unresolved objectives are never fatal: the step renders without a POI and the emitter's
**coverage report** (per-type resolve %) tells us where to invest next.

### 5.2 Emitted quest page shape

```json
{
  "id": 1100010, "type": "quest", "name": "HQ1100010",
  "race": "Light", "questType": "Hero", "unlockLevel": 1, "recommendedLevel": 1,
  "acquire": { "mapId": 1000, "npc": {"type": "npc", "id": "..."}, "pois": [ ... ] },
  "steps": [
    { "order": 1, "objectives": [
        { "type": "KillNpc", "label": "...", "target": {"type": "npc", "id": "..."},
          "mapId": "World_L_A", "pois": [{"x": 1, "y": 2}], "marker": true, "optional": false }
    ]}
  ],
  "rewards": { "exp": 1712, "items": [{"item": "...", "count": 20}], "select": [] },
  "chain": { "next": 1101010, "prev": [1099010] },
  "related": [{ "type": "npc", "id": "..." }, { "type": "item", "id": "..." }]
}
```

`chain.prev` is a **reverse index** built by the emitter from `NextQuestName` (the table
only stores forward links). Similarly the emitter builds **backlink indexes**: item →
"rewarded by quests [...]", npc → "involved in quests [...]" — these power the `related`
sections on NPC/item pages without runtime scans.

### 5.3 Other outputs

- `data/wiki/taxonomy.json` — the full TOC tree (types → groups → sections) with slugs,
  L10N label keys, counts, order (see §6 Taxonomy).
- `data/wiki/index/<type>.json` — hub list + compact search **documents**
  (`{id, type, name, level, mapId, group, section}`; localized names via the locale
  files). `group`/`section` drive the group list pages and chapter sections. The frontend
  builds the MiniSearch index at runtime (lazily, on first search) — NOT a serialized
  MiniSearch index: that would be larger than the documents, version-locked to the
  frontend's minisearch package, and would require a Node step in the Python pipeline.
  At this scale (1,429 quests) runtime indexing is tens of milliseconds.
- `data/locales/<lang>/wiki/...` — localized names/text via `QuestString.json` /
  `NpcData.Desc.Key`, mirroring the marker-locale pattern.
- **Marker emitter extension:** optional `entityType`/`entityId` on markers that correspond
  to wiki entities (Phase 1: quest-giver/boss-relevant markers), enabling map→wiki links.
- `sitemap.xml` for the wiki routes.

## 6. Frontend

### Taxonomy (table of contents, huijiwiki-category-style)

Every type has a **group tree** derived from real classification fields, with a
hand-authored enum→slug/label mapping in `tools` config (same pattern as `types.yaml`):

- **Quests:** group = `Quest.Type` (`Hero`→`main` 239, `District`→`side` 179,
  `DutyScroll`+`DutyMission`→`duty` 783, `Exploration`→`exploration` 204,
  `Ascension`→`ascension` 10, `GatherCraftMastery`→`mastery` 12, `Daevagauge` 2);
  sections within a group = **chapter/episode** from `Quest.Part` (29 values, e.g.
  `hero_poeta_00`…`hero_Eltnen_02` Elyos, `hero_ishalgen_00`…`hero_Morheim_02` Asmodian).
  `Race` (Light/Dark/All) is a **filter toggle**, not a tree level. Future game
  versions/episodes extend the chapter axis (new `Part` values) without redesign.
- **NPCs:** groups like `boss`/`named`/`normal` (from `bNamed`, `NpcType`), sections by map/zone.
- **Items:** groups from `Item.json` categories (phase 3).

The emitter writes `data/wiki/taxonomy.json` — the full tree (types → groups → sections)
with slugs, L10N label keys, counts, and order. All hub/TOC pages render from this one file.

### Routes (TanStack file-based, code-split — one convention for all types)
- `/wiki` — site TOC: every type's group tree with counts (rendered from `taxonomy.json`).
- `/wiki/$type` — type hub: category tree for that type (groups, chapter sections, counts)
  + search (uses `minisearch`, already a dependency).
- `/wiki/$type/$slug` — **one route file, two pages:** numeric slug → entity page (fetches
  the entity JSON); non-numeric slug → **group list page** (e.g. `/wiki/quest/main`):
  chapter-sectioned tables (name, level, zone, rewards summary) with a sticky TOC sidebar,
  chapters as `#anchors`, faction filter toggle. List pages filter the per-type index
  client-side (fine at 1,429 quests). Numeric id is canonical for entities (readable slugs
  are YAGNI for v1; names live in `<title>`/OG meta). Unknown slug → wiki 404.

### Templates
- **`QuestPage` = walkthrough layout:** header (name, type, race, levels, repeat), acquire
  section with embedded map of the giver, **steps in order** — each objective with its
  label, target link, and a per-step map (or one combined map with step-grouped POIs —
  implementation detail for the plan), rewards panel, prev/next **chain navigation**.
- `NpcPage`: stats, named/boss badge, spawn map (all spawns), "involved in quests" backlinks,
  drops (from `NpcLoot`, phase 2+).
- `ItemPage`: stats, "rewarded by quests" backlinks, sources (gather nodes / loot) — phase 3.
- Rich text via `react-markdown` + `remark-gfm`, sanitized with `dompurify`, styled with
  `@tailwindcss/typography` (all already dependencies).

### `<EmbeddedMap>` (extracted from `GameMapView`)
- Props: `mapId`, `markers`, `highlightRegions?` (for `EnterSubZone` objectives —
  `GameMapBorders` already renders region polygons), `interactive?` (default read-only),
  `initialView?` (auto-fit to supplied POIs), `onMarkerClick?`.
- Presentational: takes markers as props, **no context coupling**.
- *Phase-1 refinement:* `EmbeddedMap` is a thin parallel composition of the already-shared
  modules (`GameMapTiles`, `lib/coords`, `markerIcons`) rather than a refactor that makes
  `GameMapView` wrap it — the anti-drift goal holds because tiles/projection/icons are
  single shared modules, and `GameMapView`'s perf machinery (LOD, culling, chunked
  mounting) is main-map-specific and would gain nothing from the indirection.

## 7. Integration (both directions)

- **Map → wiki:** marker popup shows a "View in wiki" link when the marker carries
  `entityType`/`entityId` → `/wiki/$type/$id`.
- **Wiki → map:** POIs in the embedded map link to the full map focused there
  (`/?map=<mapId>&marker=<markerId>` or coord focus); entity references (`related`,
  objective targets, reward items, chain links) link to other wiki pages.

## 8. SEO / prerender

- **v1:** client-rendered + emitter-generated `sitemap.xml` + runtime `<title>`/OG meta.
- **Later phase:** post-build headless-Chrome snapshot of `/wiki/...` routes to static HTML.

## 9. Error handling

- Missing entity id → wiki 404 page.
- Unresolved objective POI → objective renders as text without a map pin; emitter logs it
  and counts it in the coverage report. A bad cross-ref never blocks a page.
- Missing localization → fall back to key/base language (existing marker-locale behavior).

## 10. Testing

- **`tools/`:** unit tests per objective resolver with fixtures (AskNpc/KillNpc → spawn,
  EnterSubZone → region, unresolvable → logged + omitted); emitted JSON shape; chain
  reverse-index; reward join.
- **Frontend (Playwright, already configured):**
  - Quest page renders steps, rewards, and chain nav from JSON.
  - Embedded map shows exactly the entity's POIs (and region highlight) — no default markers.
  - Marker → wiki link navigates to the correct page.
  - Wiki POI → map link focuses the correct marker.

## 11. Phasing

1. **Foundation + flagship:** extract `<EmbeddedMap>`; wiki scaffold; **taxonomy + TOC**
   (`taxonomy.json`, `/wiki` site TOC, quest hub, group list pages with chapter sections);
   **quest walkthrough pages** (steps + POIs via the NPC/EnvObj/SubZone resolvers +
   rewards + chain nav); `entityType`/`entityId` marker field; both link directions;
   sitemap (entity + group pages) + runtime meta. Reward items render as plain names
   (links activate in phase 3).
2. **NPCs/Monsters:** NPC/monster pages (spawn maps, quest backlinks); named-NPC/boss
   markers on the main map.
3. **Items:** item pages (quest-reward backlinks, gather/loot sources); reward links go live.
4. **SEO upgrade:** post-build prerender snapshots. Best-effort resolvers for
   `ClearMapEvent`/`EnterVolumePC` if coverage report shows they matter.

Each phase is independently shippable. Phase 1 alone delivers a walkthrough wiki with
per-step maps — the full loop that motivates the feature.

## 12. Open risks / assumptions

- **Resolver coverage (measured, phase-1 emit run 2026-07-02):** `AskNpc` 575/587 (98%),
  `CloseNpc` 14/14 (100%), `KillNpc` 426/1132 (38%), `UseEnvObj` 173/350 (49%),
  `CollectItem` 0/16 (0%). Interpretation: quest-giver/talk objectives resolve almost
  fully; kill/gather targets often live on maps not yet in `data/maps.json` (only 8 maps
  emitted) or spawn under different spawner names — expect KillNpc/UseEnvObj coverage to
  rise as more maps are added. `CollectItem` needs an item→source resolver (phase 3).
- **`ClearMapEvent` (524 objectives)** is the largest unresolved type; whether map events
  carry usable positions in `MapData.json` needs investigation (deferred to phase 4 unless
  phase 1 shows quest pages feel empty without it).
- **Marker↔entity mapping:** existing markers are synthetic; phase 1 scopes
  `entityType`/`entityId` to quest-relevant and boss markers, broadening later.
- **Locale volume:** modest (1,429 quests), but keep per-type locale files so growth stays
  bounded (mirrors per-map marker locales).
