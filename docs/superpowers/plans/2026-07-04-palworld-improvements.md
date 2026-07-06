# Palworld Map Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Palworld interactive map to feature parity with aion2 (backed popups, search, light/dark, circular pal icons) and rebuild its dataset with the full pre-1.0 taxonomy (all collectibles, locations, bosses, and every pal ordered by ZukanIndex, clustered per-pal).

**Architecture:** Two independent tracks. **Track A (frontend/shell)** extracts reusable UI into `packages/map-shell` + `packages/map-engine` and wires them into `apps/palworld` — no data dependency. **Track B (data pipeline)** extends the palworld extractor/emitter in the `tools` worktree (`tools/.claude/worktrees/palworld-extractor/palworld/`) to emit `data-palworld/` + `resource-palworld/`. Track A is landable and testable without Track B; Track B regenerates data the app already consumes data-drivenly.

**Tech Stack:** React 19 / Vite / Tailwind v4 / shadcn / Leaflet / react-leaflet / MiniSearch / i18next (16 langs). Data pipeline: Node ESM, `yaml`, `sharp`.

**Delegation:** Per CLAUDE.md — Claude designs/reviews/does git+docs; Codex (MCP) writes code in small per-step pieces; Claude verifies each diff (typecheck/build/behaviour) before dispatching the next.

---

## Confirmed raw-data sources (verified 2026-07-04 against `E:/SteamLibrary/steamapps/common/Palworld/Exports/Pal/Content/Pal`)

Persistent level: `Maps/MainWorld_5/PL_MainWorld5.json`. World Partition cells: `Maps/MainWorld_5/PL_MainWorld5/_Generated_/*.json` (9977 files).

| Marker | Class(es) | Location |
|---|---|---|
| fastTravel | `BP_LevelObject_TowerFastTravelPoint_C` (152) | persistent |
| eagleStatue | `BP_LevelObject_UnlockMapPoint_C` (22) | persistent |
| **tower** | `BP_PalBossTower_C` (8), `_MiddleBoss_C` (3), `_KingWhale_C` (1), `_LastBoss_C` (1) | persistent |
| dungeon | `BP_DungeonPortalMarker_*_C` (all region variants) | persistent + cells |
| note | `BP_LevelObject_Note_C` (15) | persistent |
| **lifmunkEffigy** | `BP_LevelObject_Relic_C` (155) | cells |
| **skillFruit** | `BP_PalMapObjectSpawner_SkillFruits_*_C` (~54 spawners) | cells |
| **egg** | `bp_palmapobjectspawner_palegg_*_C` (many grade/region variants) | cells |
| **chest** | `BP_PalMapObjectSpawner_Treasure_*_C` (spawner family) | cells |
| alphaPal | `DT_BossSpawnerLoactionData` rows w/ `CharacterID` matching `/^BOSS_/i` (90) | DataTable |
| pals | `DT_PalWildSpawner` + `DT_PalSpawnerPlacement` (existing); order via `DT_PalMonsterParameter.ZukanIndex` | DataTable |

**Not found in this export (report in conclusion, point 11):**
- **sealedRealm** — no `Sealed*` actor class or table exists.
- **predatorPal** — exists only as character blueprints (`BP_*_BOSS_Predator`, `BP_Action_Predator*`); no fixed map-spawn table (roaming incident mechanic).

**Candidate NEW / post-pre-1.0 types found (report in conclusion):** `BP_OilrigTreasureBoxSpawner_C` (45) + `_Goal_C` (6) (Oil Rig raid); `BP_NPCCampSpawner_DLC2_*` / `DLC3_*` camps; Sakurajima-region eggs/treasure/skillfruit; WorldTree-region collectibles.

---

## TRACK A — Frontend / Shell (points 2, 3, 4, 5)

### Task A1: Circular pal marker icon (point 4)

**Files:**
- Modify: `packages/map-engine/src/components/GameMarker.tsx:79`

- [ ] **Step 1: Generalize the circular-icon branch**

In `GameMarker.tsx`, change the creature test to also match the palworld pal category:

```tsx
  if (category === "creature" || category === "pal") {
    icon = createPinIcon(innerIcon, 0.9, renderCompleted, {
      variant: "circular",
      selected,
      theme,
    });
  } else if (!rawIcon) {
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @gamemap/map-engine build` (or repo typecheck). Expected: PASS. Pal markers now render with the circular badge like aion2 creature/pet/vehicle markers.

- [ ] **Step 3: Commit** (frontend repo)

```bash
git add packages/map-engine/src/components/GameMarker.tsx
git commit -m "feat(map-engine): circular icon variant for pal category markers"
```

---

### Task A2: Shared marker popup card in shell (point 2)

**Goal:** A generic, context-free popup card in `map-shell` that carries the `gm-popup-card` class + `bg-card`/`text-card-foreground` so palworld popups get a real background. aion2's `MarkerPopupContent` remains (it has app-specific completion/wiki concerns); the shell card is the reusable presentational shell.

**Files:**
- Create: `packages/map-shell/src/MarkerPopupCard.tsx`
- Modify: `packages/map-shell/src/index.ts`
- Modify: `apps/palworld/src/App.tsx:149-156` (use it in `renderPopupContent`)

- [ ] **Step 1: Create `MarkerPopupCard.tsx`**

```tsx
import type { ReactNode } from "react"
import { Card, CardContent, cn } from "@gamemap/ui"

export type MarkerPopupCardProps = {
  name: string
  /** e.g. "Location / Fast Travel (4708, 3924)" */
  metaLine?: string
  description?: string
  /** placeholder text shown italic when description is empty */
  noDescriptionLabel?: string
  images?: string[]
  /** optional extra content rendered below (e.g. footer actions) */
  children?: ReactNode
  className?: string
}

export function MarkerPopupCard({
  name, metaLine, description, noDescriptionLabel, images, children, className,
}: MarkerPopupCardProps) {
  return (
    <Card
      data-testid="marker-popup-card"
      className={cn(
        "gm-popup-card w-[320px] gap-0 py-0 rounded-[10px] border-border bg-card text-card-foreground shadow-lg",
        className,
      )}
    >
      <CardContent className="flex flex-col px-4 py-4">
        <div className="text-[18px] font-bold leading-snug text-[#3D3D3D] dark:text-white">
          {name}
        </div>
        {metaLine ? (
          <div className="mt-2 text-[14px] leading-tight text-[rgba(0,0,0,0.6)] dark:text-[rgba(255,255,255,0.6)]">
            {metaLine}
          </div>
        ) : null}
        <hr className="my-3 border-0 border-t border-border" />
        {description ? (
          <div className="text-[14px] leading-relaxed whitespace-pre-line text-[#3D3D3D] dark:text-white">
            {description}
          </div>
        ) : (
          <div className="text-[14px] leading-relaxed text-[rgba(0,0,0,0.35)] italic dark:text-[rgba(255,255,255,0.35)]">
            {noDescriptionLabel ?? ""}
          </div>
        )}
        {images?.length ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {images.map((src, i) => (
              <img key={`${src}-${i}`} src={src} alt="" loading="lazy"
                className="aspect-square w-full rounded-md object-cover" />
            ))}
          </div>
        ) : null}
        {children}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Export from shell index**

Add to `packages/map-shell/src/index.ts`:

```ts
export { MarkerPopupCard, type MarkerPopupCardProps } from "./MarkerPopupCard"
```

- [ ] **Step 3: Use in palworld App.tsx**

Replace the `renderPopupContent` callback (lines 149-156) with a build of the meta line (Category / Subtype (x, y)) + `MarkerPopupCard`. Add `MarkerPopupCard` to the `@gamemap/map-shell` import, and thread the subtype/category labels the app already has (`subtypeLabel`, `typesL10n.categories`). Example:

```tsx
  const renderPopupContent = useCallback((marker: EngineMarker) => {
    const catId = marker.subtypeMeta?.category ?? marker.category
    const catLabel = catId ? (staticData?.typesL10n.categories[catId]?.name ?? catId) : ''
    const subLabel = marker.subtypeLabel ?? marker.subtype
    const metaLine = [ [catLabel, subLabel].filter(Boolean).join(' / '),
      `(${Math.round(marker.x)}, ${Math.round(marker.y)})` ].filter(Boolean).join(' ')
    return (
      <MarkerPopupCard
        name={marker.localizedName || t('unnamed', 'Unnamed')}
        metaLine={metaLine}
        description={marker.localizedDescription}
        noDescriptionLabel={t('noDescription', 'No description')}
      />
    )
  }, [staticData, t])
```

Add `unnamed` and `noDescription` keys to palworld i18n (all 16 langs) — reuse aion2's translations as reference.

- [ ] **Step 4: Verify** — `pnpm --filter palworld build`; dev server: click a marker, confirm a card background + downward pointer triangle render. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(map-shell): shared MarkerPopupCard; back palworld popups`

---

### Task A3: Shared search panel in shell (point 3)

**Goal:** A context-free `SearchPanel` in `map-shell` (MiniSearch, CJK char tokenizer, prefix+fuzzy). aion2's version stays (coupled to its contexts); shell version takes plain props.

**Files:**
- Create: `packages/map-shell/src/SearchPanel.tsx`
- Modify: `packages/map-shell/src/index.ts`
- Modify: `apps/palworld/src/App.tsx` (render `<SearchPanel>` in `<main>`, wire flyTo + select)
- Modify: `apps/palworld/package.json` (add `minisearch` dep if not already present in workspace)

- [ ] **Step 1: Confirm minisearch availability**

Run: `node -e "require.resolve('minisearch')"` from `apps/palworld`. If it fails, add `minisearch` to `apps/palworld/package.json` deps and `pnpm install`.

- [ ] **Step 2: Create shell `SearchPanel.tsx`**

Props-driven port of `apps/aion2/src/features/map/search/SearchPanel.tsx`. Signature:

```tsx
export type SearchItem = {
  id: string
  name: string
  description?: string
  subtypeLabel?: string
  categoryLabel?: string
  iconUrl?: string
  x: number
  y: number
}
export type SearchPanelProps = {
  items: SearchItem[]
  onSelect: (id: string) => void
  onFlyTo: (pos: { x: number; y: number }) => void
  labels: { search: string; resultsCount: (n: number) => string; unnamed: string; noDescription: string; scopeName: string; scopeAll: string }
  debounceMs?: number
  classNames?: { root?: string }
}
```

Internals identical to aion2: debounce, `MiniSearch({ fields:['name','description'], storeFields:['id'], searchOptions:{prefix:true,fuzzy:0.2}, tokenize:(s)=>[...s] })`, `addAll(items)`, `search(q,{fields: scope==='name'?['name']:undefined}).slice(0,50)`. Render the same overlay markup (absolute top/right/bottom, 290px) but reading from `SearchItem` fields and `labels`. Keep `data-testid="search-panel"`, `marker-search`, `search-results`.

- [ ] **Step 3: Export from shell index**

```ts
export { SearchPanel, type SearchPanelProps, type SearchItem } from "./SearchPanel"
```

- [ ] **Step 4: Wire into palworld App.tsx**

Build `searchItems` from `engineMarkers` (map to `SearchItem`, resolve `iconUrl` via `palworldAssets.markerIconUrl(m.icon, map)` when present). Render inside `<main>` after `<GameMapView>`:

```tsx
<SearchPanel
  items={searchItems}
  onSelect={(id) => setSelectedMarkerId(id)}
  onFlyTo={(pos) => mapRef.current?.flyTo(pos)}
  labels={{ search: t('search'), resultsCount: (n) => t('resultsCount', { count: n }), unnamed: t('unnamed'), noDescription: t('noDescription'), scopeName: t('scopeName'), scopeAll: t('scopeAll') }}
/>
```

Confirm `MapRef` exposes a `flyTo({x,y})` (check `packages/map-engine` `MapRef` type; if the method differs, use the exposed one). Add the new i18n keys (16 langs).

- [ ] **Step 5: Verify** — build + dev server: type a query (incl. a CJK term), confirm results list, click flies to marker and selects it. Expected: PASS.

- [ ] **Step 6: Commit** — `feat(map-shell): shared SearchPanel; add search to palworld`

---

### Task A4: Shared light/dark theme; palworld default = system (point 5)

**Goal:** A reusable theme mechanism in `map-shell` (provider + toggle) and a proper light+dark palette for palworld. Palworld default = system (`auto`), storage key `palworld.theme`, **no map-type hint** (unlike aion2).

**Files:**
- Create: `packages/map-shell/src/theme/ThemeProvider.tsx` (provider + `useTheme` + `applyTheme`)
- Create: `packages/map-shell/src/theme/ThemeToggle.tsx` (auto/light/dark cycle button)
- Modify: `packages/map-shell/src/index.ts`
- Modify: `apps/palworld/src/main.tsx` (wrap `<App/>` in `<ThemeProvider defaultTheme="auto" storageKey="palworld.theme">`)
- Modify: `apps/palworld/src/App.tsx` (add `<ThemeToggle>` to `ShellTopBar` right area; stop hard-coding `bg-[#0E2A3C]` where it should follow the theme token)
- Modify: `apps/palworld/src/index.css` (define light `:root` + `.dark` overrides; today only one palette exists)

- [ ] **Step 1: Create `ThemeProvider.tsx`** — generic version of aion2 `ThemeContext` WITHOUT the `themeHint`/map-type coupling and WITHOUT `abyss`:

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
export type Theme = "auto" | "light" | "dark"
type Ctx = { theme: Theme; realTheme: "light" | "dark"; setTheme: (t: Theme) => void }
const ThemeContext = createContext<Ctx | undefined>(undefined)
const systemTheme = () => (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
function apply(t: "light" | "dark") { if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", t === "dark") }
export function ThemeProvider({ children, defaultTheme = "auto", storageKey }: { children: ReactNode; defaultTheme?: Theme; storageKey: string }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    const s = localStorage.getItem(storageKey)
    return s === "light" || s === "dark" || s === "auto" ? (s as Theme) : defaultTheme
  })
  const realTheme = useMemo<"light" | "dark">(() => (theme === "auto" ? systemTheme() : theme), [theme])
  useEffect(() => { localStorage.setItem(storageKey, theme) }, [theme, storageKey])
  useEffect(() => { apply(realTheme) }, [realTheme])
  useEffect(() => {
    if (theme !== "auto" || typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const h = () => apply(systemTheme())
    mq.addEventListener("change", h)
    return () => mq.removeEventListener("change", h)
  }, [theme])
  return <ThemeContext.Provider value={{ theme, realTheme, setTheme }}>{children}</ThemeContext.Provider>
}
export function useTheme() { const c = useContext(ThemeContext); if (!c) throw new Error("useTheme requires <ThemeProvider>"); return c }
```

- [ ] **Step 2: Create `ThemeToggle.tsx`** — a small button cycling auto→light→dark, with sun/moon/auto icons (lucide `Sun`,`Moon`,`SunMoon`), accepting `labels` for tooltips and an optional `className`.

- [ ] **Step 3: Export from shell index** — `export { ThemeProvider, useTheme, type Theme } from "./theme/ThemeProvider"` and `export { ThemeToggle } from "./theme/ThemeToggle"`.

- [ ] **Step 4: palworld `index.css` light + dark palettes** — move current Twilight values into a `.dark` block, author a light palette in `:root`. Keep the `@custom-variant dark` line. Ensure `--card`/`--popover`/`--border` read well in both (so `MarkerPopupCard` looks right in light + dark).

- [ ] **Step 5: Wrap app + add toggle** — `main.tsx`: `<ThemeProvider defaultTheme="auto" storageKey="palworld.theme"><App/></ThemeProvider>`. `App.tsx`: pass a `rightSlot`/append to `ShellTopBar` containing `<ThemeToggle>` next to the language switcher; replace hard-coded top-level `bg-[#0E2A3C]` with `bg-background text-foreground` so the shell follows the theme.

- [ ] **Step 6: Verify** — build + dev server: default follows OS setting; toggle cycles auto/light/dark and persists across reload; popup + sidebar + map chrome all legible in both. Expected: PASS.

- [ ] **Step 7: Commit** — `feat(map-shell): shared ThemeProvider + ThemeToggle; palworld light/dark defaulting to system`

---

## TRACK B — Data pipeline (points 1, 6, 7, 8, 9, 10, 11)

All edits in the tools worktree: `tools/.claude/worktrees/palworld-extractor/palworld/`. Regen writes to `data-palworld/` + `resource-palworld/`. Pipeline: `node src/cli.mjs <extract|calibrate|emit|tiles>` with env `PALWORLD_RAW`, `PALWORLD_DATA_OUT`, `PALWORLD_RES_OUT`.

### Task B1: Extract World-Partition collectibles + camps + towers (points 6, 7)

**Files:**
- Modify: `tools/.claude/worktrees/palworld-extractor/palworld/src/extract.mjs`

- [ ] **Step 1: Add cell-scan + new POI classes**

- Extend `POI_CLASSES` (persistent level) with: `tower` → `/^BP_PalBossTower(_.+)?_C$/`.
- Add a second pass over `Maps/MainWorld_5/PL_MainWorld5/_Generated_/*.json`. For each cell (array), match Types and read location via `actorLocation`. Classes:
  - `lifmunkEffigy` → `t === 'BP_LevelObject_Relic_C'`
  - `skillFruit` → `/^BP_PalMapObjectSpawner_SkillFruits_.+_C$/`
  - `egg` → `/^bp_palmapobjectspawner_palegg_.+_C$/i`
  - `chest` → `/^BP_PalMapObjectSpawner_Treasure_.+_C$/`
  - `camp` → `/^BP_NPCCampSpawner_.+_C$/`
  - `dungeon` → `/^BP_DungeonPortalMarker_.+_C$/` (also present in cells)
- **Dedup by rounded world location** per subtype (cells overlap/duplicate across LODs): key `${subtype}|${Math.round(X/100)}|${Math.round(Y/100)}`.
- Push results into the same `pois` array shape `{ subtype, sourceName, location }`.
- Record which cell classes were seen but NOT mapped, and collect Oilrig/DLC/Sakurajima Types into a `newTypeCandidates` tally returned from `runExtract` (for the point-11 report).

- [ ] **Step 2: Fast-travel names (point 1)**

Investigate `BP_LevelObject_TowerFastTravelPoint_C` actor properties for a name/ID field. If a `FastTravelPointID` / name-table linkage exists, resolve per-language names into `pois[].nameByLng`. If no clean name source exists, leave fast-travel unnamed (subtype label is used) and note it. (Bosses & pals already localize.)

- [ ] **Step 3: Read pal ZukanIndex + all-pal ordering (points 8, 9)**

- Read `DataTable/Character/DT_PalMonsterParameter.json` rows → `palMeta[id] = { zukanIndex: r.ZukanIndex, zukanIndexSuffix: r.ZukanIndexSuffix ?? '' }`. Include `palMeta` in parsed output.
- Keep alpha pals from `DT_BossSpawnerLoactionData` (existing `bosses`, `/^BOSS_/i`). Rename the emitted subtype to `alphaPal` (see B2). No predator source — record predator as absent for the report.

- [ ] **Step 4: Run + inspect** — `PALWORLD_RAW=... node src/cli.mjs extract`; verify `parsed.json` now contains deduped collectibles/camps/towers with plausible counts (effigy ≈ 155, etc.) and `palMeta`. Expected: PASS.

- [ ] **Step 5: Commit** (tools worktree) — `feat(palworld-extract): collectibles, camps, towers, pal ZukanIndex`

---

### Task B2: Taxonomy + 16-lang names in `types.yaml` (points 6, 7, 8)

**Files:**
- Modify: `tools/.claude/worktrees/palworld-extractor/palworld/data_src/types.yaml`

- [ ] **Step 1: Add subtypes with full 16-language `names` maps and icons**

Under `location`: add `tower` (icon `T_icon_compass_boss` or a tower icon), `camp`. Under `collectible`: add `skillFruit`, `egg`, `chest`, `lifmunkEffigy` (map each to a `T_icon_compass_*` icon that exists in `Texture/UI/InGame`, else a pal/relic icon; verify names against the tiles icon resolver). Rename boss subtype `fieldBoss` → `alphaPal` (update its 16-lang names to "Alpha Pal"/localized). Keep existing `note`, `treasureMap`, `dungeon`, `fastTravel`, `eagleStatue`, resources.

Author all 16 languages for each new subtype (reference aion2 `types.yaml` phrasing + the existing palworld entries for tone). No English-only placeholders.

- [ ] **Step 2: Verify icons resolve** — after emit+tiles, check the `icons missing sources` warning is empty for the new subtypes; swap any missing icon name for one that exists.

- [ ] **Step 3: Commit** — `feat(palworld-data): taxonomy for collectibles/tower/camp/alpha pal + 16-lang names`

---

### Task B3: Per-pal subtypes + same-pal clustering + emit (points 9, 10)

**Files:**
- Modify: `tools/.claude/worktrees/palworld-extractor/palworld/src/emit.mjs`

- [ ] **Step 1: Generate one subtype per distinct wild-spawn pal, ordered by ZukanIndex**

- Collect the set of distinct pal ids that actually appear in `parsed.palSpawns` (across Pal_1/2/3).
- For each, synthesize a subtype `{ id: pal<Id>, name: pal id, category: 'pal', icon: palIcon(id) }`. Display name per-language from `namesByLang`.
- **Order** these pal subtypes by `(palMeta[id].zukanIndex, zukanIndexSuffix)` ascending; ids missing/`-1` sort last by name.
- Keep the hand-authored non-pal subtypes from `types.yaml`; append the generated pal subtypes (replacing the single `palSpawn`).

- [ ] **Step 2: Explode spawns to per-pal, cluster per-pal only (point 10)**

- For each map, for each pal id, gather all spawn points where that pal appears (a spawner with 3 pals contributes its location to all 3 pal ids). Cluster **within a single pal id** using `clusterPoints(points, radius)` (radius from `types.yaml`, per-pal). This guarantees clusters never mix different pals.
- Each cluster → one marker of that pal's subtype, name = pal name, description = `Lv.min–max` merged across the cluster, icon = pal icon.

- [ ] **Step 3: Emit locales for generated pal subtypes**

- `locales[lng].types.subtypes[palId] = { name: palName(namesByLang[lng], id), description: '' }` for every generated pal subtype and every language.
- Ensure `types.json` categories.pal.subtypes lists all generated pal subtypes in ZukanIndex order (frontend renders them in array order).

- [ ] **Step 4: Run emit + sanity check** — `node src/cli.mjs emit`; verify `data-palworld/types.json` has the new location/collectible/boss subtypes + hundreds of pal subtypes in ZukanIndex order; markers files contain per-pal clustered markers; each pal's cluster contains only that pal. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(palworld-emit): per-pal subtypes ordered by ZukanIndex, same-pal clustering`

---

### Task B4: Tiles/icons regen, resource-palworld, verify, conclusion report (point 11)

**Files:**
- (No code change expected in `tiles.mjs` — `collectIconNames` already auto-collects from types.json + marker `icon` fields, and `iconSourcePath` resolves `T_icon_compass_*` and pal icons. Verify pal-per-subtype icons emit.)

- [ ] **Step 1: Regenerate icons/tiles** — `node src/cli.mjs tiles`. Confirm `icons: N converted` and `icons missing sources: []` (fix any missing by adjusting `types.yaml` icon names or extending `iconSourcePath` for new icon roots).

- [ ] **Step 2: Full data verification** — load palworld dev app against regenerated `data-palworld`: every category filter toggles; collectibles/locations/bosses render with icons + backed popups; pal category lists all pals in ZukanIndex order; clicking a pal shows only that pal clustered; search finds localized names; light/dark both legible.

- [ ] **Step 3: Write the point-11 conclusion** — summarize for the user: which pre-1.0 types were added; that **sealedRealm** and **predatorPal** have no fixed-location source in this export (with the evidence); and the NEW/post-1.0 candidates found (Oil Rig treasure, DLC2/DLC3 camps, Sakurajima/WorldTree region collectibles) — added or flagged per finding.

- [ ] **Step 4: Commit** (tools worktree) + regenerated data/resource repos as appropriate.

---

## Self-Review

- **Coverage:** pt1→B1.S2 + existing boss/pal L10N; pt2→A2; pt3→A3; pt4→A1; pt5→A4; pt6→B1.S1+B2; pt7→B1.S1+B2; pt8→B1.S3+B2 (predator reported absent); pt9→B1.S3+B3.S1; pt10→B3.S2; pt11→B4.S3. All 11 mapped.
- **Type consistency:** shell exports (`MarkerPopupCard`, `SearchPanel`/`SearchItem`, `ThemeProvider`/`useTheme`/`ThemeToggle`) referenced identically in index + app. `alphaPal` used consistently in extract/types.yaml/emit. Pal subtype id scheme `pal<Id>` consistent across emit subtypes + locales + marker `subtype`.
- **Open verifications flagged inline:** fast-travel name source (B1.S2), `MapRef.flyTo` method name (A3.S4), collectible icon availability (B2.S2) — each has a fallback documented.
- **Risk — chest double counting:** the `TreasureBox_VisibleContent_*Drop_C` family (visual meshes) is intentionally excluded; only the `_Treasure_` spawner family is used, then deduped by rounded location.
