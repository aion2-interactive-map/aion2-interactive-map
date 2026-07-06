# Shared Map Shell (@gamemap/ui + @gamemap/map-shell) — Design

**Date:** 2026-07-03
**Status:** Approved (auto-mode implementation; decisions locked with user 2026-07-03)
**Scope:** Extract the AION2 map sidebar and topbar into shared, customizable
workspace packages so `apps/palworld` uses the same UI components as
`apps/aion2`. Builds on the monorepo platform (sub-project 1) and the Palworld
app (sub-project 3), both complete on branch `worktree-multi-game-map-platform`
(tip `bc9ecc29`, includes the BCP 47 / endonym language work).

## 1. Goal

Two new packages in the frontend monorepo:

1. **`packages/ui` → `@gamemap/ui`** — the shadcn/ui primitive layer shared by
   all apps: aion2's 16 primitives moved verbatim, plus `cn()`.
2. **`packages/map-shell` → `@gamemap/map-shell`** — the shared map chrome:
   `ShellTopBar`, `ShellSidebar`, and `FilterPanel`, built with the same purity
   rules as `@gamemap/map-engine` (props-injection; no i18n, router, env, or
   localStorage inside), skinnable via Tailwind `classNames` overrides.

Both apps consume them: aion2 through thin wrappers that preserve its exact
current look and behavior; palworld by replacing its bespoke `TopBar`/`Sidebar`
outright.

Success criteria:

- aion2 is visually unchanged (before/after screenshot comparison) and its e2e
  suite still passes (23 passing + the known external wiki-data-drift failure).
- palworld renders the shared chrome; its e2e suite passes (5 tests, updated
  where selectors change).
- `pnpm check:shell` (new grep gate, mirroring `check:engine`) proves the shell
  contains no i18n/router/env/localStorage usage; `check:engine` stays clean.
- No component code is duplicated between apps for topbar/sidebar/filter UI.

Decisions locked with the user:

- **Structural sharing only** — shared components own structure and behavior;
  each app keeps its own visual identity via overrides.
- **Generic core + slots** — built-in language/theme/map switchers and filter
  core; app-specific content injected through slots and render props.
- **Tailwind + classNames overrides** — a `classNames` object per component,
  merged over neutral defaults with `cn()`; no CSS-variable theming layer.
- **New `packages/ui` with all primitives** — all 16 aion2 shadcn primitives
  move (not just the ones map-shell needs).
- Name: **map-shell** (user-chosen over "map-chrome").

## 2. Current state (inventory, verified 2026-07-03 at `bc9ecc29`)

**aion2 chrome (the donor):**

- `apps/aion2/src/components/TopNavbar.tsx` (151 lines): router `Link` logo +
  `/wiki` link, hardcoded archive-notice text, language dropdown
  (`SUPPORTED_LANGUAGES` ×4 incl. `ko-KR`, endonym `LANGUAGE_LABELS`, testids
  `lang-menu`/`lang-<code>`), theme dropdown (`auto|light|dark`, testids
  `theme-menu`/`theme-<value>`, via `ThemeContext`), contact popover with
  `react-markdown`.
- `apps/aion2/src/features/map/sidebar/Sidebar.tsx` (95 lines): 346px fixed
  width, collapse-to-0 with edge button (testid `sidebar-toggle`), theme-aware
  background image overlay, `ScrollArea`, composes `Logo` + `SelectMap` +
  section header + `MarkerTypes`.
- `apps/aion2/src/features/map/sidebar/MarkerTypes.tsx` (317 lines): 2-column
  control-button grid (show/hide all, show names, clear completed w/
  `AlertDialog`, borders, LOD), category `Accordion` (default all expanded,
  async-safe expansion sync) with per-category tri-state eye toggle + tooltip,
  2-column subtype toggle-button grid (icon w/ `iconScale`, label,
  `completed/total` badge, testid `subtype-toggle-<name>`). Consumes
  `GameMapContext`/`GameDataContext`/`MarkersContext`.
- `apps/aion2/src/components/ui/` — 16 shadcn primitives; `cn()` in
  `apps/aion2/src/lib/utils.ts`.

**palworld chrome (the consumer to converge):**

- `apps/palworld/src/components/TopBar.tsx` (37 lines): title, map tab buttons
  (testid `map-tab-<MapId>`), native `<select aria-label="language">` over 16
  BCP 47 languages with endonym labels.
- `apps/palworld/src/components/Sidebar.tsx` (43 lines): flat checkbox list
  (testid `subtype-toggle-<subtypeId>` on the `<input>`), show/hide-all.
- Fully props-injected already (no contexts) — an easy consumer.

**Language reality (BCP 47 drift, landed 2026-07-03):** both apps use full BCP
47 tags and static endonym `LANGUAGE_LABELS` maps (palworld ×16, aion2 ×4).
The shell's language switcher takes `{ code, label }[]` — labels are endonyms
supplied by the app, never translated.

## 3. Architecture

```
packages/ui          (@gamemap/ui)         shadcn primitives + cn()
        ▲                    ▲
        │                    │
packages/map-shell   (@gamemap/map-shell)  ShellTopBar · ShellSidebar · FilterPanel
        ▲                    ▲
        │                    │
apps/aion2 (thin wrappers    apps/palworld (direct consumption,
 mapping contexts → props)    bespoke TopBar/Sidebar deleted)
```

Dependency rule: `map-shell` depends only on `ui` + React (+ lucide-react for
built-in glyphs). It must NOT depend on `map-engine`, `data-contract`, i18next,
routers, or app code. `ui` depends on its radix/cva/tailwind-merge stack only.

### 3.1 `packages/ui` (@gamemap/ui)

- All 16 files from `apps/aion2/src/components/ui/` moved **verbatim** (only
  the `@/lib/utils` import path changes), plus `cn()`.
- Single barrel export (`@gamemap/ui`) re-exporting every primitive and `cn`.
- Ships raw `.tsx` source like `map-engine`/`data-contract` (no build step);
  apps compile it via their own Vite/tsc. Each consuming app adds a Tailwind v4
  `@source` directive for the package so classes in package sources are
  scanned.
- Dependencies (radix-ui packages, class-variance-authority, clsx,
  tailwind-merge, lucide-react) move from `apps/aion2/package.json` to
  `packages/ui/package.json`; aion2 keeps only what it still uses directly.
- aion2 imports rewritten: `@/components/ui/*` → `@gamemap/ui`; `cn` from
  `@/lib/utils` → `@gamemap/ui` (the aion2 `lib/utils.ts` keeps its other
  helpers, re-export of `cn` removed).

### 3.2 `packages/map-shell` (@gamemap/map-shell)

**Purity rules (same as map-engine, enforced by a new `check:shell` grep
gate):** no `i18next`/`useTranslation`, no router imports, no
`import.meta.env`, no `localStorage`, no `fetch`. All strings arrive as label
props; all state is controlled or has controlled/uncontrolled prop pairs; all
icons/images arrive as `ReactNode` or pre-resolved URL strings.

Every component takes an optional `classNames` object (per-part keys) merged
over neutral Tailwind defaults with `cn()`; apps skin by overriding parts.
Every interactive part keeps a stable `data-testid` (see §5).

**`ShellTopBar`** — `flex h-12 items-center` bar:

```ts
interface ShellTopBarProps {
  leftSlot?: ReactNode            // logo, nav links, notices (app-owned)
  rightExtras?: ReactNode         // e.g. aion2's contact popover
  languageSwitcher?: {
    languages: { code: string; label: string }[]   // endonym labels
    current: string
    onChange: (code: string) => void
    menuLabel: string             // aria-label/title for the trigger
  }
  themeSwitcher?: {               // omit → hidden (palworld)
    options: { value: string; label: string }[]
    current: string
    onChange: (value: string) => void
    menuLabel: string
  }
  classNames?: { root?: string; left?: string; right?: string; trigger?: string; menu?: string }
}
```

Both switchers render as `@gamemap/ui` `DropdownMenu` + ghost icon `Button`
(lucide `Languages`/`Settings` glyphs, check mark on the current entry) —
exactly aion2's current markup. Testids: `lang-menu`, `lang-<code>`,
`theme-menu`, `theme-<value>`.

**`ShellSidebar`** — collapsible left rail:

```ts
interface ShellSidebarProps {
  width?: number                  // default 346
  defaultCollapsed?: boolean      // uncontrolled; or:
  collapsed?: boolean; onCollapsedChange?: (c: boolean) => void
  collapseLabel: string; expandLabel: string
  backgroundSlot?: ReactNode      // aion2's theme-aware bg-image overlay
  headerSlot?: ReactNode          // logo etc.
  mapSelector?: {
    maps: { id: string; label: string; icon?: ReactNode }[]
    activeMapId: string
    onSelectMap: (id: string) => void
  }                               // hidden when omitted or maps.length < 2
  mapSelectorSlot?: ReactNode     // full override (aion2's SelectMap in v1)
  children?: ReactNode            // section header + FilterPanel, footer, …
  classNames?: { root?: string; scrollArea?: string; collapseButton?: string; content?: string }
}
```

Structure mirrors aion2's `Sidebar.tsx`: absolute background layer,
`ScrollArea` content, edge collapse button (testid `sidebar-toggle`,
chevron + label, collapse-to-width-0 animation). aion2 keeps `SelectMap` via
`mapSelectorSlot` (it renders map cards from `GameMapContext`); palworld uses
the built-in `mapSelector` with its two maps (its topbar map tabs move here —
one shared structure; testid `map-tab-<MapId>` preserved on built-in entries).

**`FilterPanel`** — the category/subtype filter core (extracted from
`MarkerTypes.tsx` structure):

```ts
interface FilterSubtype {
  id: string; label: string
  active: boolean
  icon?: ReactNode                // app renders its own <img> incl. iconScale
  badge?: string                  // aion2: "3/12" or "12"; palworld: omit
}
interface FilterCategory {
  id: string; label: string
  icon?: ReactNode
  subtypes: FilterSubtype[]       // app pre-filters zero-count subtypes
}
interface FilterPanelProps {
  categories: FilterCategory[]
  onToggleSubtype: (id: string) => void
  onSetCategory?: (categoryId: string, visible: boolean) => void
    // enables the per-category tri-state eye toggle; omit → eye hidden
  categoryToggleLabels?: { show: string; hide: string }   // tooltip/aria text
  controls?: {                    // 2-column button grid above the accordion
    id: string; label: string; onClick: () => void
    active?: boolean; testId?: string
  }[]
  classNames?: { root?: string; controls?: string; controlButton?: string
    category?: string; categoryHeader?: string; subtypeGrid?: string
    subtypeButton?: string; subtypeButtonActive?: string }
}
```

Behavior owned by the shell: multi-expand `Accordion` defaulting to
all-expanded with the async-safe "new categories auto-expand, user collapses
preserved" sync; tri-state eye derived from `subtypes[].active`
(none → faded eye, some → solid eye, all → `EyeOff`), tooltip via
`categoryToggleLabels`; button visual states (active/inactive) with the
`aria-pressed` + testid `subtype-toggle-<id>` contract; badge right-aligned in
the subtype button.

Stays in the apps: aion2's `AlertDialog` confirm for "clear completed" (its
control's `onClick` opens the app-owned dialog), localStorage persistence,
count/completed computation, icon URL resolution, i18n of every label;
palworld's show/hide-all handlers.

### 3.3 App migrations

**aion2 (highest risk — must be pixel-faithful):**

- `TopNavbar.tsx` → thin wrapper around `ShellTopBar`: `leftSlot` = logo Link +
  wiki Link + archive notice; `languageSwitcher`/`themeSwitcher` mapped from
  `i18n` + `ThemeContext`; `rightExtras` = contact popover (stays app-side —
  react-markdown must not enter the shell).
- `Sidebar.tsx` → wrapper around `ShellSidebar`: `backgroundSlot` = bg-image
  overlay div, `headerSlot` = `Logo`, `mapSelectorSlot` = `SelectMap`,
  children = section header + `MarkerTypes` wrapper.
- `MarkerTypes.tsx` → wrapper around `FilterPanel`: builds `categories` from
  `types` + `subtypeCounts`/`completedCounts`/`visibleSubtypes`, `controls`
  from its six buttons, keeps the `AlertDialog`, passes its exact button
  colors via `classNames` (incl. the `var(--color-sidebar-button)` inactive
  background as a Tailwind arbitrary-value class).
- No behavioral change: contexts, persistence, testids, i18n keys all
  unchanged.

**palworld:**

- Delete `components/TopBar.tsx` and `components/Sidebar.tsx`.
- `App.tsx` composes `ShellTopBar` (title in `leftSlot`, 16-language
  `languageSwitcher` from `LANGUAGES`/`LANGUAGE_LABELS`, no theme switcher) and
  `ShellSidebar` (built-in `mapSelector` for the two maps, `FilterPanel` with
  show/hide-all controls, no eye toggle needed — but wiring `onSetCategory` is
  free, include it).
- UI change (accepted): language `<select>` → shared dropdown; subtype
  checkboxes → toggle buttons; map tabs move from topbar into the sidebar map
  selector. e2e updated accordingly (§5).

## 4. Package plumbing

- `pnpm-workspace.yaml` already globs `packages/*` — no change.
- New `package.json` in each package following `map-engine`'s conventions
  (name, `"type": "module"`, source-only exports, peer `react`).
- Root `tsconfig` project references + each app's `tsconfig.json` paths follow
  the existing `@gamemap/map-engine` pattern.
- Both apps' global CSS gain `@source "../../../packages/ui"` and
  `@source "../../../packages/map-shell"` (exact relative paths per app).
- Root scripts: new `check:shell` (grep gate over `packages/map-shell/src`
  banning `i18next|useTranslation|react-router|@tanstack/react-router|import\.meta\.env|localStorage|fetch\(`),
  wired next to `check:engine` in the composite check script if one exists.

## 5. Testing

- **Gates:** `pnpm check:shell` + `pnpm check:engine` clean; `tsc -b` clean;
  full `pnpm build`.
- **Unit (vitest, workspace):** FilterPanel logic — tri-state eye derivation,
  auto-expand sync preserving user collapses, `onToggleSubtype`/`onSetCategory`
  dispatch, classNames merging on the subtype button.
- **e2e aion2 (port 5199):** unchanged suite must stay at 23 passing (+ the
  known external wiki-drift failure, see memory `aion2-e2e-wiki-drift`) —
  testids `lang-menu`/`lang-<code>`, `theme-menu`/`theme-<value>`,
  `sidebar-toggle`, `subtype-toggle-<name>`, `show-names-toggle`, `lod-toggle`
  are all preserved by design.
- **e2e palworld (port 5188):** 5 tests; two need updates: language test
  switches from `getByLabel('language').selectOption('ko-KR')` to the dropdown
  (`lang-menu` → `lang-ko-KR`); subtype test switches from `.uncheck()` to
  `.click()` on `subtype-toggle-fastTravel` (now `aria-pressed` button);
  map-switch test keeps `map-tab-WorldTree` (testid preserved on the sidebar
  map selector).
- **Visual parity (aion2):** before/after screenshots of the map screen
  (sidebar expanded + collapsed, topbar menus open) compared manually in the
  browser before declaring done.

## 6. Workflow

- Branch `worktree-shared-shell` created off `bc9ecc29` in the existing
  frontend worktree
  (`E:/aion2-map/frontend/.claude/worktrees/multi-game-map-platform`,
  currently detached at `52a63e68` — sync to the new branch first).
- The user's main checkout (`E:/aion2-map/frontend` on
  `worktree-multi-game-map-platform`) is being live-tested — do not touch it.
- No push; no merges; rebase-integration later per workspace convention.
- Ports: 5173 forbidden (user's live server); use the established 5177/5188/5199.

## 7. Risks

- **aion2 visual regressions** — the wrapper refactor is behavior-preserving
  by construction, but subtle class-merge ordering can shift styles; mitigated
  by screenshot comparison + full e2e.
- **Tailwind class scanning** — missing `@source` entries silently drop
  styles; caught by the screenshot check.
- **Parallel-session drift** — the branch is shared with the user's live
  testing; new commits may land. Rebase `worktree-shared-shell` onto the tip
  before finishing.

## 8. Out of scope

- Moving aion2's `SelectMap`, contact popover, wiki chrome, or admin UI into
  the shell.
- A CSS-variable theming system (classNames overrides chosen instead).
- Any `map-engine` or `data-contract` changes.
