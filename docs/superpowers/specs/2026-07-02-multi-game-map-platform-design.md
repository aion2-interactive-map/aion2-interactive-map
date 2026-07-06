# Multi-Game Map Platform — Architecture & Map-Engine Extraction Design

**Date:** 2026-07-02
**Status:** Draft for review
**Scope:** Sub-project 1 of the multi-game platform effort (see "Decomposition" below)

## 1. Motivation

The AION2 interactive map should become the first consumer of a reusable map
platform so that future game sites (Palworld first) can be built without
forking the map engine. Each game's frontend will diverge heavily in features
(wiki structure, panels, theme, game systems), so the design is **shared map
library + fully independent per-game apps**, not one platform app with
feature flags.

## 2. Decomposition into sub-projects

The platform effort is too large for one spec. It splits into three
independently deliverable sub-projects:

| # | Sub-project | Spec |
|---|---|---|
| 1 | **Frontend monorepo conversion + map-engine extraction + data-contract formalization** | this document |
| 2 | Backend multi-tenancy (`game_id` dimension, shared auth, per-game S3 namespaces) | future spec, when a second game needs user data |
| 3 | Palworld pipeline (UE5 extractor in `tools`, `data-palworld`/`resource-palworld` artifacts, `apps/palworld`) | future spec |

Sub-project 1 has a hard success criterion: **the AION2 app behaves
identically after the restructure** (all Playwright e2e suites pass), while
the map engine and data contract become game-agnostic packages with no AION2
imports.

## 3. Decisions and assumptions (auto-resolved)

Recorded here because this design was produced in auto mode; each is
overridable at review:

1. **In-place restructure.** The existing `frontend` repo becomes the pnpm
   workspace monorepo (keeps history, remote, deploy config). No new repo.
2. **Two packages only:** `map-engine` and `data-contract`. No `api-client`
   package yet — the live app does not call the backend at all
   (`VITE_API_BASE_URL` is used only by `_legacy`); it is deferred to
   sub-project 2 (YAGNI).
3. **Package scope name:** `@gamemap/*` (game-neutral; not `@aion2/*`).
4. **pnpm only.** Delete `yarn.lock`; update `playwright.config.ts`
   `webServer.command` from `yarn dev` to `pnpm dev`.
5. **No build step for packages.** Private workspace packages ship TypeScript
   source (`"main": "./src/index.ts"`); the app's Vite/tsc resolve it
   directly. Publishing is explicitly a non-goal.
6. **Delete `src/_legacy`** (~135 files, already excluded from
   `tsconfig.app.json`) during the move, plus the unused legacy
   item/crafting/board/skill types in `src/types/game.ts`. History preserves
   them.
7. **Contract v1 covers map data only** (maps, marker types, markers,
   regions, locale layout). Wiki file formats (`taxonomy.json`, index docs,
   quest docs) stay typed app-side until a second game grows a wiki.
8. **Engine styling is Tailwind-free.** The engine uses inline styles plus a
   small static CSS file; colors come from a theme config object. Apps keep
   Tailwind/shadcn.

## 4. Target architecture

```
frontend/                        (existing repo, restructured in place)
├─ pnpm-workspace.yaml           packages: ["packages/*", "apps/*"]
├─ package.json                  root: private, scripts delegate to apps,
│                                pnpm.overrides: vite → rolldown-vite
├─ packages/
│  ├─ data-contract/             @gamemap/data-contract
│  │  └─ src/                    types + zod schemas + validate helpers
│  └─ map-engine/                @gamemap/map-engine
│     └─ src/                    Leaflet engine components, coords, icons
└─ apps/
   └─ aion2/                     current app (routes, wiki, sidebar, search,
                                 contexts, i18n, theme, e2e/, vite.config.ts)
```

Sibling repos (`backend/`, `tools/`, `data/`, `resource/`) are unchanged;
the workspace convention "independent repos" still holds at that level — the
monorepo exists only inside `frontend/`.

A future `apps/palworld` is a fully separate Vite app: own routes, own UI,
own domain/deployment, depending only on the two packages. Apps deploy
independently (separate `vite build` outputs); the monorepo shares source and
one lockfile, nothing at runtime.

### Dependency rules (enforced by package.json deps)

- `data-contract` depends on: `zod` only. No React, no Leaflet.
- `map-engine` depends on: `data-contract`; peer-deps `react`, `react-dom`,
  `leaflet`, `react-leaflet`. **Forbidden inside the engine:** app contexts,
  `react-i18next`, `@tanstack/react-router`, Tailwind classes, `import.meta.env`,
  hardcoded `UI/…` paths, `aion2` localStorage keys.
- `apps/*` depend on both packages plus whatever they like.

## 5. Package: `@gamemap/data-contract`

Formalizes the de-facto format that `tools` already emits and the app already
consumes. **Coordinates are image-pixel space** — the world→pixel affine
transform is applied at tools time and is *not* part of the frontend
contract. The only frontend-side coordinate concern is the Leaflet
`CRS.Simple` Y-flip, which is `map-engine`'s job (`coords.ts`).

Contents (types moved from `apps/aion2/src/types/game.ts`, plus zod schemas):

- `GameMapMeta` — id, name, type, order, isVisible, tileWidth/Height,
  tilesCountX/Y. `type` becomes a free string (game-defined variant key; for
  AION2 it is `"light" | "dark" | "abyss"` and doubles as faction/theme key —
  that interpretation lives in the app, not the contract).
- `MarkerTypeCategory`, `MarkerTypeSubtype` — icon, iconScale, color,
  canComplete, iconComplete, hideTooltip.
- `MarkerInstance` — x, y (pixels), category, subtype, tier, fragmentType,
  `entity: MarkerEntityRef`, images, indexInSubtype.
- `RegionInstance` — name, type, `borders: number[][][]`.
- File wrappers: `MapsFile`, `TypesFile`, `RawMarkersFile`, `RawRegionsFile`.
- Locale layout contract (documented + helper): generated namespaces
  `maps`, `types`, `markers/<map>`, `regions/<map>` under
  `<dataBase>/locales/<lng>/<ns>.json`.
- `validateDataRepo(dir)` helper + a root script `pnpm validate-data`
  that validates the sibling `../data` repo against the schemas. This is the
  contract's enforcement point for `tools` output; a JSON-Schema export
  (generated from zod) can be added for tools-side CI later if needed.

Versioning: a `CONTRACT_VERSION` constant, bumped with a changelog section in
the package README when the format changes. Both the emitter (`tools`) and
consumers reference it; no runtime negotiation (all consumers live in this
workspace and update atomically).

## 6. Package: `@gamemap/map-engine`

### What moves in (from the exploration survey)

Near-pure modules move first, unchanged in substance:

- `lib/coords.ts` — data↔LatLng transforms (`mapHeightOf`, `dataToLatLng`,
  `latLngToData`).
- `lib/leaflet-smooth-wheel-zoom.ts` — Leaflet handler registration + module
  augmentation.
- `canvas/markerIcons.tsx` — cached `L.divIcon` builder (colors become theme
  config params instead of Lanhu literals).
- `canvas/cursorStore.ts` + `CursorTracker.tsx` — external-store cursor
  tracking.

Component layer, refactored to props-injection:

- `GameMapView.tsx` — map container, viewport culling, LOD tiers,
  progressive marker mounting, selection wiring, `TestMapHandle`.
- `GameMapTiles.tsx` — `GameTileLayer` (tile URL becomes an injected builder).
- `GameMarker.tsx` — marker + permanent tooltip (consumes pre-localized
  marker data).
- `GameMapBorders.tsx`, `MarkerFocusController.tsx`, `MapZoomControl.tsx`,
  `MapContextMenu.tsx`, `MapStatusBar.tsx`.
- `popup/SelectedMarkerPopup.tsx` — the React-owned popup lifecycle shell
  (content injected; see below).

### The engine interface (coupling inversion)

The survey identified the seams: engine components currently reach into three
app contexts, `lib/url.ts`, and `react-i18next`. The extraction inverts all
of these to props. Sketch (names final at implementation):

```tsx
// Asset resolution — app implements game conventions (e.g. AION2's
// Light→Dark icon swap, UI/ path layout, env-var base URLs).
interface MapAssets {
  tileUrl(map: GameMapMeta, x: number, y: number): string;
  markerIconUrl(icon: string, map: GameMapMeta): string;
  resolveImage(path: string): string;
  watermarkUrl?: string;
}

interface MapTheme { /* pin/tooltip/control colors, replacing literals */ }

// Markers arrive pre-localized (existing MarkerWithTranslations shape):
// the engine never touches i18n.
interface EngineMarker extends MarkerInstance {
  localizedName: string;
  localizedDescription?: string;
  subtypeMeta: MarkerTypeSubtype;   // resolved by the app from types.json
  completed?: boolean;
}

<GameMapView
  map={GameMapMeta}
  markers={EngineMarker[]}
  regions={RegionInstance[]}
  assets={MapAssets}
  theme={MapTheme}
  selectedMarkerId={string | null}
  onToggleMarker={(id, pos) => void}
  onMarkerComplete={(id, done) => void}
  renderPopupContent={(marker: EngineMarker) => ReactNode}
  labels={{ copyPosition: string, /* other UI strings */ }}
  statusBar={{ formatCoords?, subzoneLabel? }}   // or render slot
/>
```

Specific inversions, seam by seam:

1. **Contexts → props.** `useGameMap()/useMarkers()/useGameData()` calls are
   removed from all engine components; `apps/aion2` keeps the three providers
   as its adapter layer and passes their derived state in as props.
   Selection state is already prop-drilled from `MapRoute.tsx` — unchanged.
2. **`lib/url.ts` → `MapAssets`.** The engine never reads `import.meta.env`
   or hardcodes `UI/…` paths. `parseIconUrl` (with the Light→Dark swap) and
   `getStaticUrl` stay in the app and back its `MapAssets` implementation.
3. **i18n → pre-localized data + `labels`.** Engine components drop
   `useTranslation`; marker/region names arrive localized; the few engine UI
   strings (context menu, status bar) come via `labels`.
4. **Popup content → render prop.** `SelectedMarkerPopup` (lifecycle shell,
   the hard-won anti-blink logic) moves into the engine;
   `MarkerPopupContent` (router `Link`, shadcn `Card`, wiki deep-links) stays
   in the app and is passed via `renderPopupContent`.
5. **Theme → `MapTheme`.** Hardcoded Lanhu palette in `markerIcons.tsx` /
   `MapZoomControl` becomes theme config; `ThemeMapBridge` (map.type →
   light/dark) stays in the app.

### What stays in `apps/aion2`

Routes + TanStack Router, wiki feature, sidebar/filter UI, search panel
(MiniSearch), i18n setup, theme system, the three context providers (now
"adapter" code), `categoryIcons.ts`, `lib/url.ts`, `lib/constants.ts`
(`STORAGE_PREFIX`), completion-state localStorage schema, AION2 default
filters and special cases (`hiddenCube`, `fragments`/`abyss`), e2e suite,
`vite.config.ts` (including the `/UI` and `/data` dev middlewares and the
`vendor-map` chunk config).

## 7. Testing & verification

- **Behavior lock:** all existing Playwright suites (`smoke`, `yflip`,
  `popup-blink`, `map-flicker`, `wiki`, `screenshots`) must pass unchanged
  after each migration phase. They are the regression net for the extraction
  (especially `yflip` for `coords.ts` and `popup-blink` for the popup shell).
- **New unit tests (vitest, first in the repo):**
  - `data-contract`: schema round-trips against fixture files; `pnpm
    validate-data` against the real sibling `../data` repo.
  - `map-engine`: `coords.ts` transform math (flip invariants,
    `latLngToData∘dataToLatLng = id`).
- **Bundle check:** `vendor-map` chunk still isolates `leaflet|react-leaflet`
  after the restructure.

## 8. Migration plan (phases; each ends green)

- **Phase A — workspace scaffolding.** Add `pnpm-workspace.yaml` + root
  `package.json`; move the app to `apps/aion2` (git mv); move the
  rolldown-vite override to root; delete `yarn.lock` and `src/_legacy`;
  fix `playwright.config.ts` (`pnpm dev`), paths, CI/deploy scripts.
  Exit: app runs and e2e passes from the new layout.
- **Phase B — data-contract.** Create the package; move the live subset of
  `types/game.ts` into it (delete the legacy type block); add zod schemas +
  `validate-data`; app imports types from `@gamemap/data-contract`.
  Exit: typecheck + e2e + `validate-data` green.
- **Phase C — map-engine.** Create the package; move pure modules first
  (coords, smooth-zoom, markerIcons, cursorStore); then refactor the canvas
  components onto the props interface, seam by seam (contexts, url.ts, i18n,
  popup render prop, theme), updating `apps/aion2` adapters in the same
  commits. Exit: engine has no forbidden imports (grep-enforced), e2e green.
- **Phase D — hardening.** Vitest for coords + contract; bundle check;
  README for each package documenting the interface and the contract version.

Rollback story: phases are ordinary commits on a feature branch of the
`frontend` repo; the sibling repos are untouched, so rolling back is a git
operation with no cross-repo coordination.

## 9. Alternatives considered

- **One platform frontend with per-game config/flags** — rejected: games
  diverge in whole features, not cosmetics; flag surface grows unboundedly.
- **N repos (library repo + per-game app repos) with `file:`/git deps** —
  rejected: without a registry there is no version pin (irreproducible
  builds, silent breakage of non-active games) or it degenerates into
  sha-pinning/submodules. The workspace gives atomic cross-package commits;
  an app can still be split out later (~a day of work) if a real need
  appears.
- **Headless hooks-only engine** — rejected for v1: the current code is
  component-shaped and battle-tested (popup lifecycle, LOD, progressive
  mounting); components-with-slots preserves that. Hooks can be exposed
  later without breaking the component API.

## 10. Risks

- **Props-inversion regressions** in perf-sensitive paths (icon cache keying,
  memoized `GameMarker`, progressive mounting): mitigated by moving code
  verbatim where possible, the e2e perf-flavored suites (`map-flicker`,
  `popup-blink`), and phase-by-phase green gates.
- **Contract too AION2-shaped** (e.g. `fragmentType`, `tier` on
  `MarkerInstance`): accepted for v1 — Palworld (sub-project 3) is the
  designated forcing function for contract revisions; fields that prove
  AION2-only move to a game-extension slot then. Designing that slot now
  without a second game would be speculation.
- **Deploy config drift** from the `apps/aion2` move (build output paths,
  `edgeone`/CDN settings): called out as an explicit Phase A checklist item.
