# Multi-Game Map Platform (Sub-project 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the `frontend` repo in place into a pnpm workspace monorepo (`apps/aion2` + `@gamemap/data-contract` + `@gamemap/map-engine`) with the AION2 app behaving identically (e2e green), per spec `docs/superpowers/specs/2026-07-02-multi-game-map-platform-design.md`.

**Architecture:** Shared map library + fully independent per-game apps. `data-contract` = types + zod schemas + data-repo validator (zod only). `map-engine` = Leaflet components refactored to props-injection (no app contexts, no i18n, no env, no Tailwind). `apps/aion2` keeps routes/wiki/sidebar/search/i18n/theme and adapts its three contexts into engine props.

**Tech Stack:** pnpm workspaces, React 19, TypeScript 5.9, rolldown-vite 7.2.2, Leaflet 1.9 / react-leaflet 5, zod, vitest, Playwright 1.61.

---

## Execution environment (READ FIRST — applies to every task)

- **Working directory:** the git worktree `E:\aion2-map\frontend\.claude\worktrees\multi-game-map-platform`, branch `worktree-multi-game-map-platform` (based on `feature/wiki-npc-item` @ 74843edd + one prep commit `add50bd7` that already switched `playwright.config.ts` to `pnpm dev` with an `E2E_PORT` override). All commands run from this directory unless stated.
- **Shell:** bash on Windows. Node v26.2, pnpm 9.12.
- **e2e invocation (the worktree is nested, so sibling-repo defaults don't resolve):**
  ```bash
  E2E_PORT=5199 RESOURCE_UI_DIR="E:/aion2-map/resource/UI" DATA_DIR="E:/aion2-map/data" pnpm exec playwright test
  ```
  After Phase A the same command is run from `apps/aion2/`.
- **Known baseline exception:** `e2e/wiki.spec.ts:20 "quest page embedded map shows only POI pins"` FAILS at baseline (pre-existing, deterministic, fix lives in uncommitted user work elsewhere). **Green gate = 23 passed, and ONLY that one test failing.** If any other test fails, the task is not done.
- **Do not** touch the sibling repos (`E:/aion2-map/data`, `resource`, `backend`, `tools`) or the main checkout `E:\aion2-map\frontend` (paths outside the worktree are read-only context).
- **Port 5173 belongs to the user's dev server — never use it.** Always pass `E2E_PORT=5199`.
- Commit after each task (message given per task). Never use `--no-verify`.

---

### Task 1: Phase A — pnpm workspace scaffolding, move app to `apps/aion2`

**Files:**
- Create: `pnpm-workspace.yaml`, new root `package.json`, `apps/aion2/.gitignore`
- Move (git mv): `src`, `public`, `e2e`, `index.html`, `vite.config.ts`, `playwright.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`, `env.d.ts`, `.env.example`, `package.json` → `apps/aion2/`
- Delete: `yarn.lock`, `apps/aion2/src/_legacy` (after move)
- Modify: `apps/aion2/vite.config.ts`, `apps/aion2/package.json`, root `.gitignore`, `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: Move the app with git mv**

```bash
mkdir -p apps/aion2
git mv src public e2e index.html vite.config.ts playwright.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.ts postcss.config.js eslint.config.js env.d.ts package.json apps/aion2/
git mv .env.example apps/aion2/ 2>/dev/null || true
git rm -r --cached -q apps/aion2/src/_legacy 2>/dev/null; rm -rf apps/aion2/src/_legacy
git rm -q yarn.lock
```
Note: `LICENSE` and `README.md` stay at root. `pnpm-lock.yaml` stays at root (workspace lockfile).

- [ ] **Step 2: Create `pnpm-workspace.yaml`** (repo root)

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "gamemap-workspace",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter aion2 dev",
    "build": "pnpm --filter aion2 build",
    "lint": "pnpm --filter aion2 lint",
    "preview": "pnpm --filter aion2 preview",
    "e2e": "pnpm --filter aion2 exec playwright test"
  },
  "pnpm": {
    "overrides": {
      "vite": "npm:rolldown-vite@7.2.2"
    }
  }
}
```

- [ ] **Step 4: Update `apps/aion2/package.json`**

- Change `"name"` from `aion2-interactive-map` to `"aion2"`.
- Add `"e2e": "playwright test"` to scripts.
- Add `"@playwright/test"` to devDependencies if it is not there (check first — the baseline had it installable; keep the version already in `pnpm-lock.yaml`, `^1.61.1`).
- Remove the top-level `"overrides"` block (npm-style; superseded by root `pnpm.overrides`).
- Keep the `"vite": "npm:rolldown-vite@7.2.2"` devDependency as-is.

- [ ] **Step 5: Fix sibling-repo default paths in `apps/aion2/vite.config.ts`**

The dev middlewares default to `../resource/UI` and `../data` (resolved from the app dir). The app is now one level deeper, and these defaults must point at the workspace siblings of the *frontend repo root*:
- `"../resource/UI"` → `"../../../resource/UI"`
- `"../data"` → `"../../../data"`

Check how the paths are resolved (`path.resolve` against what) and keep the `RESOURCE_UI_DIR` / `DATA_DIR` env overrides working exactly as before. Everything else in `vite.config.ts` is unchanged.

- [ ] **Step 6: Split `.gitignore`**

Root `.gitignore`: keep general patterns (`node_modules`, `dist`, `.env`, logs, editor dirs, `.tanstack`, `.claude/worktrees` if present). Create `apps/aion2/.gitignore` containing the app-anchored patterns that were root-anchored before:

```
/test-results/
/playwright-report/
/.playwright/
/.screenshots/
/public/UI/
```

- [ ] **Step 7: Update `.github/workflows/deploy.yml`**

- Replace yarn setup/install with pnpm: use `pnpm/action-setup@v4` (version 9), `actions/setup-node` with `cache: pnpm`, `pnpm install --frozen-lockfile` at root.
- Build step: `pnpm --filter aion2 build` (keep the existing `VITE_*` env block unchanged).
- Deploy artifact path: `dist/` → `apps/aion2/dist/`.

- [ ] **Step 8: Update `README.md`** — replace `yarn`-based dev instructions with `pnpm install` + `pnpm dev` from repo root, note the monorepo layout (`apps/aion2`, `packages/*`).

- [ ] **Step 9: Reinstall and typecheck**

```bash
rm -rf node_modules apps/aion2/node_modules
pnpm install
pnpm --filter aion2 exec tsc -b
```
Expected: install OK (lockfile updates to workspace layout — commit it), tsc exit 0.

- [ ] **Step 10: Run e2e from the new layout**

```bash
cd apps/aion2 && E2E_PORT=5199 RESOURCE_UI_DIR="E:/aion2-map/resource/UI" DATA_DIR="E:/aion2-map/data" pnpm exec playwright test; cd ../..
```
Expected: **23 passed, 1 failed (only the known `wiki.spec.ts:20` baseline exception)**.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: pnpm workspace monorepo - app moves to apps/aion2, drop yarn.lock and src/_legacy"
```

---

### Task 2: Phase B — `@gamemap/data-contract` package

**Files:**
- Create: `packages/data-contract/package.json`, `packages/data-contract/src/index.ts`, `packages/data-contract/src/types.ts`, `packages/data-contract/src/schemas.ts`, `packages/data-contract/src/validate.ts`, `packages/data-contract/scripts/validate-data.ts`, `packages/data-contract/README.md`
- Modify: `apps/aion2/src/types/game.ts` (shrink), all app files importing moved types (12 non-legacy files import from `@/types/game`), `apps/aion2/package.json` (+dep), root `package.json` (+script)

- [ ] **Step 1: Create `packages/data-contract/package.json`**

```json
{
  "name": "@gamemap/data-contract",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "zod": "^4.1.0"
  }
}
```
(Adjust the zod semver to the latest v4 that `pnpm add` resolves; no React, no Leaflet — dependency rule from the spec.)

- [ ] **Step 2: Create `src/types.ts`** — move these types **verbatim** (with their doc comments) from `apps/aion2/src/types/game.ts`: `GameMapMeta`, `MarkerTypeSubtype`, `MarkerTypeCategory`, `MarkerEntityRef`, `MarkerInstance`, `RegionInstance`, `MapsFile`, `TypesFile`, `RawMarkersFile`, `RawRegionsFile`. Add:

```ts
/** Bump when the emitted data format changes; document in README changelog. */
export const CONTRACT_VERSION = 1;
```

Do NOT move: `MAP_NAMES` (AION2-specific), `MapRef` (Leaflet type), `MarkerWithTranslations`, `CommentInstance` (app/backend concerns) — these stay in `apps/aion2/src/types/game.ts`, which now imports `MarkerInstance` from the package for the `MarkerWithTranslations` intersection.

- [ ] **Step 3: Create `src/schemas.ts`** — zod schemas mirroring the interfaces, with a compile-time drift guard:

```ts
import { z } from "zod";
import type {
  GameMapMeta, MarkerTypeCategory, MarkerTypeSubtype, MarkerEntityRef,
  MarkerInstance, RegionInstance, MapsFile, TypesFile, RawMarkersFile, RawRegionsFile,
} from "./types.js";

export const gameMapMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  tileWidth: z.number(),
  tileHeight: z.number(),
  tilesCountX: z.number(),
  tilesCountY: z.number(),
  isVisible: z.boolean(),
}) satisfies z.ZodType<GameMapMeta>;

export const markerTypeSubtypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  icon: z.string().optional(),
  iconScale: z.number().optional(),
  hideTooltip: z.boolean().optional(),
  color: z.string().optional(),
  canComplete: z.boolean().optional(),
  iconComplete: z.string().optional(),
}) satisfies z.ZodType<MarkerTypeSubtype>;

export const markerTypeCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  subtypes: z.array(markerTypeSubtypeSchema),
}) satisfies z.ZodType<MarkerTypeCategory>;

export const markerEntityRefSchema = z.object({
  type: z.enum(["quest", "npc", "item"]),
  id: z.number(),
}) satisfies z.ZodType<MarkerEntityRef>;

export const markerInstanceSchema = z.object({
  id: z.string(),
  category: z.string().optional(),
  subtype: z.string(),
  region: z.string().optional(),
  x: z.number(),
  y: z.number(),
  images: z.array(z.string()),
  contributors: z.array(z.string()),
  icon: z.string().optional(),
  name: z.string().optional(),
  indexInSubtype: z.number(),
  tier: z.number().optional(),
  fragmentType: z.enum(["ground", "air", "water"]).optional(),
  entity: markerEntityRefSchema.optional(),
}) satisfies z.ZodType<MarkerInstance>;

export const regionInstanceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  borders: z.array(z.array(z.array(z.number()))),
}) satisfies z.ZodType<RegionInstance>;

export const mapsFileSchema = z.object({ maps: z.array(gameMapMetaSchema) }) satisfies z.ZodType<MapsFile>;
export const typesFileSchema = z.object({ categories: z.array(markerTypeCategorySchema) }) satisfies z.ZodType<TypesFile>;
export const rawMarkersFileSchema = z.object({ markers: z.array(markerInstanceSchema) }) satisfies z.ZodType<RawMarkersFile>;
export const rawRegionsFileSchema = z.object({ regions: z.array(regionInstanceSchema) }) satisfies z.ZodType<RawRegionsFile>;
```

**Important:** validate the schemas against the real data first (Step 6). If real files carry extra fields, that is fine (zod objects strip/allow unknown keys by default — do NOT use `.strict()`). If real files *omit* a field typed as required (e.g. `images` or `contributors` missing on some markers), loosen the schema AND the interface to `.optional()` and note it in the README changelog — the contract must describe reality.

- [ ] **Step 4: Create `src/validate.ts`** — Node-only helper (uses `node:fs`, `node:path`; keep imports erasable so Node 26 can run it without a build step):

```ts
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { mapsFileSchema, typesFileSchema, rawMarkersFileSchema, rawRegionsFileSchema } from "./schemas.js";

export interface ValidationIssue { file: string; message: string; }

function check(issues: ValidationIssue[], file: string, schema: z.ZodType, data: unknown) {
  const r = schema.safeParse(data);
  if (!r.success) {
    for (const issue of r.error.issues) {
      issues.push({ file, message: `${issue.path.join(".")}: ${issue.message}` });
    }
  }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Validate a data repo checkout (maps/types/markers/regions + locale layout). */
export function validateDataRepo(dir: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mapsPath = join(dir, "maps.json");
  if (!existsSync(mapsPath)) return [{ file: mapsPath, message: "missing maps.json" }];
  const maps = readJson(mapsPath);
  check(issues, "maps.json", mapsFileSchema, maps);
  check(issues, "types.json", typesFileSchema, readJson(join(dir, "types.json")));
  for (const sub of ["markers", "regions"] as const) {
    const subdir = join(dir, sub);
    if (!existsSync(subdir)) { issues.push({ file: subdir, message: `missing ${sub}/` }); continue; }
    for (const f of readdirSync(subdir).filter((f) => f.endsWith(".json"))) {
      check(issues, `${sub}/${f}`, sub === "markers" ? rawMarkersFileSchema : rawRegionsFileSchema, readJson(join(subdir, f)));
    }
  }
  // Locale layout: locales/<lng>/maps.json + types.json must exist for each language dir.
  const localesDir = join(dir, "locales");
  if (!existsSync(localesDir)) {
    issues.push({ file: localesDir, message: "missing locales/" });
  } else {
    for (const lng of readdirSync(localesDir)) {
      for (const ns of ["maps.json", "types.json"]) {
        if (!existsSync(join(localesDir, lng, ns))) {
          issues.push({ file: `locales/${lng}/${ns}`, message: "missing generated namespace" });
        }
      }
    }
  }
  return issues;
}
```

**First inspect the real repo layout** (`ls E:/aion2-map/data`, `ls E:/aion2-map/data/locales/en | head`) and adapt the exact file names/paths above to what actually exists (e.g. if maps/types live under a subdir, or locales use per-map namespaces `markers/<map>.json` — check and encode reality). The code above is the shape, reality wins.

- [ ] **Step 5: Create `src/index.ts`** re-exporting everything, and `scripts/validate-data.ts`:

```ts
// src/index.ts
export * from "./types.js";
export * from "./schemas.js";
export * from "./validate.js";
```

```ts
// scripts/validate-data.ts
import { validateDataRepo } from "../src/validate.js";

const dir = process.argv[2] ?? "../data";
const issues = validateDataRepo(dir);
if (issues.length) {
  for (const i of issues) console.error(`${i.file}: ${i.message}`);
  console.error(`${issues.length} issue(s) found in ${dir}`);
  process.exit(1);
}
console.log(`data repo at ${dir} is valid (contract v1)`);
```

Root `package.json` script (Node 26 runs .ts directly via type stripping):

```json
"validate-data": "node packages/data-contract/scripts/validate-data.ts"
```

- [ ] **Step 6: Run the validator against the real data repo**

```bash
pnpm install
pnpm validate-data E:/aion2-map/data
```
Expected: exit 0. If it reports issues, determine whether the schema is wrong (fix schema per Step 3 guidance) — do not "fix" the data repo.

- [ ] **Step 7: Switch the app to the package**

- `apps/aion2/package.json` dependencies: add `"@gamemap/data-contract": "workspace:*"`, then `pnpm install`.
- Shrink `apps/aion2/src/types/game.ts` to only: `MAP_NAMES`, `MapRef`, `MarkerWithTranslations` (importing `MarkerInstance` from `@gamemap/data-contract`), `CommentInstance`, plus `export type { ... } from "@gamemap/data-contract"` re-exports are **not** allowed — instead update every importer.
- Delete the entire legacy block (lines ~175-357: `ClassMeta` through `RawSkillsFile`) — verified only `src/_legacy` used it, which is already deleted.
- Update the non-legacy importers of `@/types/game` (12 files: `lib/coords.ts`, `features/map/sidebar/SelectMap.tsx`, `features/map/search/SearchPanel.tsx`, `features/map/popup/MarkerPopupContent.tsx`, `features/map/canvas/GameMarker.tsx`, `GameMapBorders.tsx`, `GameMapTiles.tsx`, `GameMapView.tsx`, `features/map/MapRoute.tsx`, `context/MarkersContext.tsx`, `context/GameDataContext.tsx`, `context/GameMapContext.tsx`) to import contract types from `@gamemap/data-contract` and app-only types (`MarkerWithTranslations`, `MapRef`, `MAP_NAMES`) still from `@/types/game`.

- [ ] **Step 8: Typecheck + e2e**

```bash
pnpm --filter aion2 exec tsc -b
cd apps/aion2 && E2E_PORT=5199 RESOURCE_UI_DIR="E:/aion2-map/resource/UI" DATA_DIR="E:/aion2-map/data" pnpm exec playwright test; cd ../..
```
Expected: tsc 0; e2e 23 passed + only the known exception.

- [ ] **Step 9: Create `packages/data-contract/README.md`** — document: purpose, the exported types/schemas, coordinate convention (image-pixel space, y-down; the world→pixel transform happens in `tools`), locale namespace layout (`maps`, `types`, `markers/<map>`, `regions/<map>` under `<dataBase>/locales/<lng>/<ns>.json`), `pnpm validate-data` usage, and a `## Changelog` section starting at `v1`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(data-contract): @gamemap/data-contract package - types, zod schemas, validate-data"
```

---

### Task 3: Phase C1 — `@gamemap/map-engine` package with pure modules

**Files:**
- Create: `packages/map-engine/package.json`, `packages/map-engine/src/index.ts`
- Move (git mv): `apps/aion2/src/lib/coords.ts` → `packages/map-engine/src/coords.ts`; `apps/aion2/src/lib/leaflet-smooth-wheel-zoom.ts` → `packages/map-engine/src/leaflet-smooth-wheel-zoom.ts`; `apps/aion2/src/features/map/canvas/markerIcons.tsx` → `packages/map-engine/src/markerIcons.tsx`; `apps/aion2/src/features/map/canvas/cursorStore.ts` → `packages/map-engine/src/cursorStore.ts`
- Modify: all app importers of the moved modules

- [ ] **Step 1: Create `packages/map-engine/package.json`**

```json
{
  "name": "@gamemap/map-engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@gamemap/data-contract": "workspace:*",
    "lucide-react": "<same version as apps/aion2>"
  },
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19",
    "leaflet": "^1.9",
    "react-leaflet": "^5"
  },
  "devDependencies": {
    "@types/leaflet": "<same as apps/aion2>",
    "@types/react": "<same as apps/aion2>",
    "leaflet": "<same as apps/aion2>",
    "react": "<same as apps/aion2>",
    "react-dom": "<same as apps/aion2>",
    "react-leaflet": "<same as apps/aion2>"
  }
}
```
(Copy exact semvers from `apps/aion2/package.json`. Check whether `markerIcons.tsx` imports `lucide-react` or `@fortawesome` — take whichever icon lib it actually uses as a dependency; `react-dom/server` usage makes `react-dom` a peer.)

- [ ] **Step 2: git mv the four pure modules** listed above. In `coords.ts`, change `import type { GameMapMeta } from "@/types/game"` to `from "@gamemap/data-contract"`. In `markerIcons.tsx`, keep the color literals for now (theme seam is Task 5). Create `src/index.ts`:

```ts
export * from "./coords.js";
export * from "./markerIcons.js";
export * from "./cursorStore.js";
import "./leaflet-smooth-wheel-zoom.js";
```

Check first how the app imports the smooth-zoom module (side-effect import + module augmentation). If the augmentation needs to reach app tsc, ensure the package's `.d.ts`-less TS source still propagates it via the direct import — prefer keeping an explicit side-effect subpath export (`"./smooth-wheel-zoom": "./src/leaflet-smooth-wheel-zoom.ts"` in `exports`) if the barrel doesn't carry it. Verify with tsc.

- [ ] **Step 3: Update app importers** — grep for `@/lib/coords`, `leaflet-smooth-wheel-zoom`, `canvas/markerIcons`, `canvas/cursorStore` in `apps/aion2/src` and point them at `@gamemap/map-engine`. Add `"@gamemap/map-engine": "workspace:*"` to `apps/aion2/package.json` dependencies; `pnpm install`.

- [ ] **Step 4: Typecheck + e2e** (same commands as Task 2 Step 8). Expected: tsc 0; 23 passed + known exception. The `yflip` suite is the specific regression net for `coords.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(map-engine): @gamemap/map-engine package - coords, smooth wheel zoom, marker icons, cursor store"
```

---

### Task 4: Phase C2 — invert contexts → props on all engine components (in place)

Refactor the canvas/popup components **in place** (still under `apps/aion2`) so they stop importing `useGameMap`/`useMarkers`/`useGameData` and receive everything via props. The app's contexts stay; `MapRoute.tsx` (and `GameMapView`'s prop chain) becomes the adapter. Moving files happens in Task 6.

**Files:**
- Modify: `apps/aion2/src/features/map/canvas/GameMapView.tsx`, `GameMapTiles.tsx`, `GameMarker.tsx`, `GameMapBorders.tsx`, `CursorTracker.tsx`, `MapContextMenu.tsx`, `MapStatusBar.tsx`, `MapZoomControl.tsx`, `MarkerFocusController.tsx`, `popup/SelectedMarkerPopup.tsx`, `features/map/MapRoute.tsx`
- Create: `apps/aion2/src/features/map/engineTypes.ts` (temporary home for the engine prop interfaces; moves into the package in Task 6)

- [ ] **Step 1: Define the engine marker + view props in `engineTypes.ts`**

```ts
import type { MarkerInstance, MarkerTypeSubtype, GameMapMeta, RegionInstance } from "@gamemap/data-contract";

/** Marker as the engine consumes it: pre-localized, subtype meta resolved by the app. */
export interface EngineMarker extends MarkerInstance {
  localizedName: string;
  localizedDescription?: string;
  subtypeMeta: MarkerTypeSubtype;
  completed?: boolean;
}
```

Then read `GameMapView.tsx` and every component listed above, catalogue **exactly** which values each pulls from `useGameMap()` / `useMarkers()` / `useGameData()`, and design `GameMapViewProps` to carry them (map, markers as `EngineMarker[]`, regions, visibility state, `showLabels`, `showBorders`, LOD flag, selection id, callbacks `onToggleMarker` / `onMarkerComplete` / region toggles as needed, plus pass-through slots already present). Keep prop names close to the spec sketch (`map`, `markers`, `regions`, `selectedMarkerId`, `onToggleMarker`, `onMarkerComplete`) but let the real component needs drive the full list — the spec says names are final at implementation.

- [ ] **Step 2: Build `EngineMarker[]` in the app adapter** — in `MapRoute.tsx` (or a small `useEngineMarkers()` hook next to it), derive from `useMarkers().markers` (already `MarkerWithTranslations`) + `useGameMap().types` (resolve `subtypeMeta` per marker via a `Map<subtypeId, MarkerTypeSubtype>`) + completion state (`completedBySubtype`/equivalent from `MarkersContext`) → memoized `EngineMarker[]`. **Memoize carefully** (this feeds thousands of markers; referential stability matters for the memoized `GameMarker`).

- [ ] **Step 3: Refactor components one by one, keeping tsc green after each:** replace each context hook usage with props, threading them down from `GameMapView`. `CursorTracker` takes `map: GameMapMeta`; `MarkerFocusController` takes `map`, `markersById`-equivalent lookup or `markers`, selection id, fly duration constant stays app-side and arrives as prop (or moves verbatim if it is engine-internal — check where `MAP_FLY_TO_DURATION` lives in `lib/constants.ts`; if only the engine uses it, it can become an engine-internal constant); `GameMapBorders` takes `regions`, `visibleRegions`, `showBorders`; `MapContextMenu` takes `map` + a `labels` prop for its strings (i18n inversion for this component happens here since it is trivial); `SelectedMarkerPopup` keeps its anti-blink logic **byte-identical** where possible — only its data sources change (selected marker arrives as `EngineMarker`, position via `dataToLatLngTuple`).
- [ ] **Step 4: `MapRoute.tsx` passes everything as props**; the components no longer import any `@/context/*` module. Verify:

```bash
grep -rn "context/" apps/aion2/src/features/map/canvas apps/aion2/src/features/map/popup/SelectedMarkerPopup.tsx
```
Expected: no matches.

- [ ] **Step 5: Typecheck + e2e.** Expected: tsc 0; 23 passed + known exception. `popup-blink` and `map-flicker` are the perf regression nets — if either fails, check referential stability of the new props (memoization) before anything else.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(map): invert app contexts to props across canvas/popup components"
```

---

### Task 5: Phase C3 — invert url.ts, i18n, popup content, theme (in place)

**Files:**
- Modify: `apps/aion2/src/features/map/engineTypes.ts` (+`MapAssets`, `MapTheme`, `labels`), `GameMapTiles.tsx`, `GameMarker.tsx`, `MapZoomControl.tsx`, `MapStatusBar.tsx`, `MapContextMenu.tsx` (if strings remain), `popup/SelectedMarkerPopup.tsx`, `GameMapView.tsx`, `MapRoute.tsx`, `packages/map-engine/src/markerIcons.tsx`
- Create: `apps/aion2/src/features/map/aionAssets.ts` (app `MapAssets` impl), `apps/aion2/src/features/map/aionTheme.ts`

- [ ] **Step 1: Add the interfaces to `engineTypes.ts`**

```ts
export interface MapAssets {
  tileUrl(map: GameMapMeta, x: number, y: number, z?: number): string;
  markerIconUrl(icon: string | undefined, map: GameMapMeta): string;
  resolveImage(path: string): string;
  watermarkUrl?: string;
}

export interface MapTheme {
  pinDiscBg: string;      // was rgba(0,0,0,0.6) literal in markerIcons
  pinBorder: string;      // was rgba(255,255,255,1)
  pinDot: string;         // was #2E97FF
  completedAccent: string; // was #22c55e
  zoomGlyph: string;      // was #3D3D3D in MapZoomControl
  // extend with any other literals found in the components (tooltip colors etc.)
}
```
First **grep the components for every color literal** (`#[0-9a-fA-F]{3,8}` and `rgba?\(`) and make the theme cover exactly what exists — the field list above is a starting point, reality wins. Wire theme through `GameMapView` props with these values as the **defaults** (engine works without a theme prop; AION2 passes `aionTheme.ts` which today equals the defaults).

- [ ] **Step 2: `aionAssets.ts`** — implement `MapAssets` on top of the existing `lib/url.ts` (`getStaticUrl`, `parseIconUrl` incl. Light→Dark swap). Inspect `GameMapTiles.tsx` for the current tile URL construction and move that URL-building into `aionAssets.tileUrl`; the engine tile layer calls the injected builder. `lib/url.ts` itself does not move — it stays app code.

- [ ] **Step 3: Remove i18n from engine components** — grep `useTranslation|react-i18next` in the canvas/popup components. Markers already arrive pre-localized (`EngineMarker`); remaining UI strings (context menu entries like copy-position, status bar text) become a `labels` prop (flat object of strings) provided by `MapRoute.tsx` via `useTranslation()` at the adapter level. Status-bar subzone lookup (`useSubzoneLookup.ts`) stays app-side; if `MapStatusBar` uses it, convert to a render/format prop (`statusBar={{ formatCoords?, subzoneLabel? }}` per spec sketch).

- [ ] **Step 4: Popup render prop** — `SelectedMarkerPopup` no longer imports `MarkerPopupContent`; `GameMapView` accepts `renderPopupContent(marker: EngineMarker): ReactNode` and threads it down. `MapRoute.tsx` passes `(m) => <MarkerPopupContent ... />`. `MarkerPopupContent.tsx` (router Link, shadcn Card, wiki deep-links) stays app code, keeps its own `useTranslation`/contexts as needed.

- [ ] **Step 5: Parameterize `markerIcons.tsx` colors** — `createPinIcon` gains a `theme: MapTheme` (or the relevant subset) parameter; **the icon cache key must include theme-dependent values** only if they can vary at runtime (they cannot for AION2 — a code comment noting this is enough; do not destabilize the cache key). Update `GameMarker.tsx` call sites.

- [ ] **Step 6: Purity check + typecheck + e2e**

```bash
grep -rn "react-i18next\|useTranslation\|@tanstack/react-router\|import\.meta\.env\|@/lib/url\|@/context" apps/aion2/src/features/map/canvas apps/aion2/src/features/map/popup/SelectedMarkerPopup.tsx
```
Expected: no matches. tsc 0; e2e 23 passed + known exception (watch `popup-blink` closely).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(map): invert assets/i18n/theme/popup-content to injected props"
```

---

### Task 6: Phase C4 — move the engine components into `@gamemap/map-engine`

**Files:**
- Move (git mv) from `apps/aion2/src/features/map/` → `packages/map-engine/src/`: `canvas/GameMapView.tsx`, `canvas/GameMapTiles.tsx`, `canvas/GameMarker.tsx`, `canvas/GameMapBorders.tsx`, `canvas/CursorTracker.tsx`, `canvas/MapContextMenu.tsx`, `canvas/MapStatusBar.tsx`, `canvas/MapZoomControl.tsx`, `canvas/MarkerFocusController.tsx`, `popup/SelectedMarkerPopup.tsx`, `engineTypes.ts`
- Modify: `packages/map-engine/src/index.ts` (export the components + types), app importers (`MapRoute.tsx`, wiki `EmbeddedMap` if it uses canvas components — grep first), `apps/aion2` leftovers

- [ ] **Step 1: grep all importers first** — `grep -rn "features/map/canvas\|features/map/popup/SelectedMarkerPopup\|features/map/engineTypes" apps/aion2/src` (note the wiki `EmbeddedMap` from the spec survey likely imports canvas components — update it too).
- [ ] **Step 2: git mv the files**, fix intra-engine relative imports, export public surface from `src/index.ts` (`GameMapView`, `CursorTracker` if app-used, `EngineMarker`, `MapAssets`, `MapTheme`, plus existing pure-module exports). Any Tailwind `className` usage inside moved components must be converted to inline styles / the engine's static CSS (spec: engine is Tailwind-free) — grep `className=` in the moved files and check each for Tailwind utilities (plain `leaflet-*` class names are fine). If a static CSS file becomes necessary, add `packages/map-engine/src/engine.css` and have the app import it once.
- [ ] **Step 3: Enforce the forbidden-import rule with a script** — root `package.json`:

```json
"check:engine": "grep -rn --include=*.ts --include=*.tsx -E \"react-i18next|@tanstack/react-router|import\\.meta\\.env|@/context|@/lib|localStorage|UI/\" packages/map-engine/src && exit 1 || exit 0"
```
(Refine the pattern if it false-positives on comments/`UI/` inside doc strings — the goal: no app imports, no env, no i18n, no router, no hardcoded UI/ paths, no localStorage in the engine. Windows bash has grep; verify the script runs.)
- [ ] **Step 4: `pnpm install` (workspace links), typecheck, `pnpm check:engine`, e2e.** Expected: all green (23 + known exception).
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(map-engine): move canvas/popup components into the package behind the props interface"
```

---

### Task 7: Phase D — vitest, bundle check, READMEs

**Files:**
- Create: `packages/map-engine/src/coords.test.ts`, `packages/data-contract/src/schemas.test.ts`, `packages/data-contract/test/fixtures/` (tiny maps/types/markers/regions JSON fixtures), `vitest.config.ts` (root), `packages/map-engine/README.md`
- Modify: root `package.json` (devDeps vitest, script `test`), `packages/data-contract/README.md` (if contract learnings from Task 2 need recording)

- [ ] **Step 1: Add vitest** — `pnpm add -D -w vitest`. Root `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.test.ts", "packages/**/test/**/*.test.ts"],
    environment: "node",
  },
});
```
Root script: `"test": "vitest run"`.

- [ ] **Step 2: Write `coords.test.ts` FIRST, watch it fail if broken** (TDD applies to the assertions, the code exists):

```ts
import { describe, expect, it } from "vitest";
import { dataToLatLng, dataToLatLngTuple, latLngToData, mapHeightOf } from "./coords.js";
import type { GameMapMeta } from "@gamemap/data-contract";

const map: GameMapMeta = {
  id: "World_L_A", name: "World_L_A", type: "light",
  tileWidth: 256, tileHeight: 256, tilesCountX: 32, tilesCountY: 32,
  isVisible: true,
};

describe("coords", () => {
  it("mapHeightOf = tileHeight * tilesCountY", () => {
    expect(mapHeightOf(map)).toBe(8192);
  });
  it("applies exactly one vertical flip (y=0 → lat=height)", () => {
    const ll = dataToLatLng(map, 100, 0);
    expect(ll.lat).toBe(8192);
    expect(ll.lng).toBe(100);
  });
  it("latLngToData ∘ dataToLatLng = identity", () => {
    for (const [x, y] of [[0, 0], [4096, 4096], [8191.5, 123.25]]) {
      const ll = dataToLatLng(map, x, y);
      const back = latLngToData(map, ll.lat, ll.lng);
      expect(back.x).toBeCloseTo(x, 10);
      expect(back.y).toBeCloseTo(y, 10);
    }
  });
  it("tuple form matches LatLng form", () => {
    const [lat, lng] = dataToLatLngTuple(map, 42, 77);
    const ll = dataToLatLng(map, 42, 77);
    expect(lat).toBe(ll.lat);
    expect(lng).toBe(ll.lng);
  });
});
```
Note: `coords.ts` imports `leaflet`, which needs a DOM — if importing it under Node fails, set `environment: "jsdom"` for this file (`// @vitest-environment jsdom` pragma) and add `jsdom` as root devDep.

- [ ] **Step 3: Write `schemas.test.ts`** — round-trip small fixture files through the schemas:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mapsFileSchema, typesFileSchema, rawMarkersFileSchema, rawRegionsFileSchema } from "./schemas.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../test/fixtures");
const load = (f: string) => JSON.parse(readFileSync(join(fixtures, f), "utf8"));

describe("data-contract schemas", () => {
  it("accepts valid fixture files", () => {
    expect(mapsFileSchema.safeParse(load("maps.json")).success).toBe(true);
    expect(typesFileSchema.safeParse(load("types.json")).success).toBe(true);
    expect(rawMarkersFileSchema.safeParse(load("markers.json")).success).toBe(true);
    expect(rawRegionsFileSchema.safeParse(load("regions.json")).success).toBe(true);
  });
  it("rejects a marker missing coordinates", () => {
    const bad = load("markers.json");
    delete bad.markers[0].x;
    expect(rawMarkersFileSchema.safeParse(bad).success).toBe(false);
  });
});
```
Build the fixtures by copying **small real excerpts** from `E:/aion2-map/data` (1 map, 1 category with 1 subtype, 2 markers, 1 region) — real shapes, minimal size.

- [ ] **Step 4: Run `pnpm test`** — expected: all pass.
- [ ] **Step 5: Bundle check** — `pnpm build`, then verify chunking survived the restructure:

```bash
ls apps/aion2/dist/assets | grep vendor-map
grep -L leaflet apps/aion2/dist/assets/index-*.js >/dev/null 2>&1 || true
```
Assert: a `vendor-map-*.js` chunk exists and is the only chunk containing the string `leaflet` (spot-check with `grep -l leaflet apps/aion2/dist/assets/*.js`). Record result.

- [ ] **Step 6: `packages/map-engine/README.md`** — document the component API (`GameMapView` props incl. `MapAssets`, `MapTheme`, `EngineMarker`, `renderPopupContent`, `labels`), the peer-dep policy, the Tailwind-free rule, and the forbidden-import list + `pnpm check:engine`.
- [ ] **Step 7: Full gate: `pnpm --filter aion2 exec tsc -b && pnpm test && pnpm check:engine` + e2e** (23 + known exception).
- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "test: vitest for coords + contract schemas; bundle check; package READMEs"
```

---

## Final acceptance (spec §2 success criterion)

1. `pnpm install && pnpm --filter aion2 exec tsc -b` — clean.
2. e2e: 23 passed, only `wiki.spec.ts:20` failing (pre-existing baseline exception).
3. `pnpm validate-data E:/aion2-map/data` — exit 0.
4. `pnpm test` — vitest green.
5. `pnpm check:engine` — no forbidden imports.
6. `grep -rn "aion2\|AION2" packages/` — no AION2-specific logic in packages (names in comments/README changelog are acceptable; code must be game-agnostic).
