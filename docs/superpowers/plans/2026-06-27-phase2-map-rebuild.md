# Phase 2 — Map Module Clean Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Archive the old frontend and rebuild the Map module clean on shadcn/ui, running entirely on local parsed data (no server), validated by Playwright smoke tests + manual screenshots.

**Architecture:** Same repo, reuse existing infra (Vite/rolldown, Tailwind v4, TanStack Router, i18next, Leaflet, the 2A shadcn foundation). Old `src/` is tagged + moved to `src/_legacy/` (excluded from build) as a read-only reference. New `src/` is rebuilt feature-by-feature. The data-loading layer is simplified to **local-only** (the static/dynamic `DataMode` duality is removed). UI is rewritten with shadcn primitives bound to the 2A token layer — no hardcoded one-off styles. Server-coupled pieces (comments, feedback/edit, backend user-marker sync) are omitted (Phase 3).

**Tech Stack:** React 19, TypeScript, Vite (rolldown-vite), Tailwind CSS v4, shadcn/ui, TanStack Router, react-leaflet/Leaflet, i18next, minisearch, Playwright.

**Reference:** Design spec `docs/superpowers/specs/2026-06-27-phase2-frontend-rebuild-design.md`. Data-source map `docs/superpowers/specs/2026-06-27-phase2-local-data-cutover-and-gap.md`.

---

## File Structure (new `src/`)

```
src/
  main.tsx                     app entry (router + providers)
  index.css                    Tailwind v4 + shadcn token layer (reused, HeroUI refs removed)
  lib/
    utils.ts                   cn() (exists)
    yaml.ts                    fetchYaml + loadGameData(path) — local-only loader
    url.ts                     getStaticUrl/getQueryParam/setQueryParam (ported, trimmed)
    constants.ts               storage keys + tunables (ported)
  types/
    game.ts                    game data types (ported as-is)
  i18n.ts                      i18next init, local-only loadPath
  context/
    ThemeContext.tsx           light/dark/abyss (ported as-is)
    GameMapContext.tsx         maps.yaml + types.yaml + selectedMap (ported)
    MarkersContext.tsx         markers/regions + completion (ported, server bits already absent)
    GameDataContext.tsx        visible subtypes/regions/borders filters (ported as-is)
    UserMarkersContext.tsx     local user markers ONLY (localStorage; backend sync removed)
  components/ui/               shadcn primitives (button exists; add as needed)
  features/map/
    MapRoute.tsx               page composition (sidebar + canvas)
    canvas/
      GameMapView.tsx          MapContainer + layers (cleaned)
      GameMapTiles.tsx         tile layer (ported as-is)
      GameMapBorders.tsx       region polygons (ported, theme-aware classes)
      GameMarker.tsx           marker pin (cleaned, shadcn tooltip)
      UserMarker.tsx           local user marker pin (cleaned)
      CursorTracker.tsx        ported as-is
      MapContextMenu.tsx       right-click → copy position (shadcn)
      MarkerFocusController.tsx fly-to (ported as-is)
    sidebar/
      Sidebar.tsx              collapsible shell (shadcn)
      SelectMap.tsx            map selector (shadcn Select)
      MarkerTypes.tsx          type/subtype filter (shadcn Accordion + Checkbox)
      RegionFilter.tsx         region toggle list (shadcn Checkbox)
      MarkerSearch.tsx         minisearch search (shadcn Command/Input)
    popup/
      SelectedMarkerPopup.tsx  selected marker → Leaflet popup host
      MarkerPopupContent.tsx   local content only (shadcn Card; NO comments)
  components/
    TopNavbar.tsx              theme + language switch (shadcn DropdownMenu)
e2e/
  smoke.spec.ts                Playwright smoke suite
playwright.config.ts
```

---

## Task 1: Archive the old frontend

**Files:**
- Move: `frontend/src/**` → `frontend/src/_legacy/**`
- Modify: `frontend/tsconfig.app.json` (exclude `_legacy`)
- Modify: `frontend/eslint.config.js` (ignore `_legacy`)

- [ ] **Step 1: Tag + branch the current state**

```bash
cd frontend
git add -A && git commit -q -m "chore: checkpoint before Phase 2 rebuild" || true
git tag -a frontend-v1-archive -m "Frontend v1 (HeroUI) archived before Phase 2 clean rebuild"
git branch archive/v1
```

- [ ] **Step 2: Move old src aside, keep new entry dirs**

```bash
cd frontend
mkdir -p src/_legacy
git mv src/components src/context src/hooks src/routes src/types src/utils src/_legacy/ 2>/dev/null || \
  (mv src/components src/context src/hooks src/routes src/types src/utils src/_legacy/)
git mv src/i18n.ts src/constants.ts src/hero.ts src/routeTree.gen.ts src/_legacy/ 2>/dev/null || \
  (mv src/i18n.ts src/constants.ts src/hero.ts src/routeTree.gen.ts src/_legacy/)
# Keep: src/main.tsx, src/index.css, src/lib/ (cn), src/components/ui/ (button), src/vite-env / env.d.ts
ls src
```
Expected: `src/` now contains `_legacy/`, `index.css`, `lib/`, `main.tsx`, and `components/ui/button.tsx`. (`main.tsx` will be rewritten in Task 2; `index.css` and `lib/utils.ts` and `components/ui/button.tsx` are the 2A foundation, kept.)

NOTE: `src/components/ui/button.tsx` and `src/lib/utils.ts` were created in 2A — do NOT move them into `_legacy`. If `git mv src/components` swept `ui/`, restore it: `git mv src/_legacy/components/ui src/components/ui`.

- [ ] **Step 3: Exclude `_legacy` from TypeScript + lint + router**

In `frontend/tsconfig.app.json`, change the `include`/add `exclude`:

```json
  "include": ["src", "env.d.ts"],
  "exclude": ["src/_legacy"]
```

In `frontend/eslint.config.js`, add `src/_legacy` to the ignores list (find the `globalIgnores([...])` or `ignores: [...]` array and add `"src/_legacy/**"`).

In `frontend/vite.config.ts`, scope the TanStack Router plugin so it does not scan `_legacy`: add `routesDirectory: "./src/routes"` to the `tanstackRouter({...})` options (the new `src/routes` is created in Task 2).

- [ ] **Step 4: Commit**

```bash
cd frontend
git add -A
git commit -m "chore(phase2): archive old src to _legacy, exclude from build"
```

---

## Task 2: Clean app scaffold that boots

**Files:**
- Create: `frontend/src/routes/__root.tsx`
- Create: `frontend/src/routes/index.tsx`
- Rewrite: `frontend/src/main.tsx`
- Create: `frontend/src/lib/constants.ts`
- Port: `frontend/src/lib/url.ts` (from `_legacy/utils/url.ts`, keep only `getStaticUrl`, `getQueryParam`, `setQueryParam`, `getStaticBaseUrl`; drop `getApiUrl`/`getCdnUrl`)
- Port: `frontend/src/types/game.ts` (copy from `_legacy/types/game.ts` verbatim)
- Port: `frontend/src/context/ThemeContext.tsx` (copy from `_legacy/context/ThemeContext.tsx` verbatim)

- [ ] **Step 1: Copy the verbatim-portable files**

```bash
cd frontend
cp src/_legacy/types/game.ts src/types/game.ts
mkdir -p src/context && cp src/_legacy/context/ThemeContext.tsx src/context/ThemeContext.tsx
```

- [ ] **Step 2: Create `src/lib/constants.ts`**

```ts
export const STORAGE_PREFIX = "aion2";
export const COMPLETED_MARKERS_V1_PREFIX = `${STORAGE_PREFIX}.completedMarkers.v1`;
export const COMPLETED_MARKERS_V2_PREFIX = `${STORAGE_PREFIX}.completedMarkers.v2`;
export const VISIBLE_SUBTYPES_STORAGE_PREFIX = `${STORAGE_PREFIX}.visibleSubtypes.v1.`;
export const VISIBLE_REGIONS_STORAGE_PREFIX = `${STORAGE_PREFIX}.visibleRegions.v1.`;
export const USER_MARKERS_STORAGE_PREFIX = `${STORAGE_PREFIX}.userMarkers.v1.`;
export const SEARCH_DEBOUNCE_MS = 300;
export const MAP_FLY_TO_DURATION = 0.5;
```

- [ ] **Step 3: Create `src/lib/url.ts`**

```ts
export function getStaticBaseUrl() {
  return (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
}

export function getStaticUrl(relPath: string) {
  const base = getStaticBaseUrl();
  return `${base}/${relPath.replace(/^\/+/, "")}`;
}

export function getQueryParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

export function setQueryParam(key: string, value: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState({}, "", url);
}
```

- [ ] **Step 4: Create `src/routes/__root.tsx`** (providers tree + outlet)

```tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ThemeProvider } from "@/context/ThemeContext";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  ),
});
```

- [ ] **Step 5: Create `src/routes/index.tsx`** (temporary boot check; replaced in Task 6)

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="flex h-full items-center justify-center bg-background text-foreground">
      <Button data-testid="boot-check">AION2 Map — rebuild boot OK</Button>
    </div>
  ),
});
```

- [ ] **Step 6: Rewrite `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import "./index.css";
import "leaflet/dist/leaflet.css";
import "./i18n";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ basepath: import.meta.env.BASE_URL, routeTree });
declare module "@tanstack/react-router" {
  interface Register { router: typeof router; }
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}
```

- [ ] **Step 7: Create `src/i18n.ts`** (local-only loadPath)

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { parse } from "yaml";
import { getStaticBaseUrl } from "@/lib/url";

export type LanguageCode = "en" | "zh-CN" | "zh-TW";
export const SUPPORTED_LANGUAGES: LanguageCode[] = ["en", "zh-CN", "zh-TW"];

const base = getStaticBaseUrl();

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "zh-CN",
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: ["common", "maps", "types"],
    defaultNS: "common",
    detection: { order: ["querystring", "localStorage", "navigator", "htmlTag"], caches: ["localStorage"] },
    backend: {
      loadPath: `${base}/locales/{{lng}}/{{ns}}.yaml?build=${__BUILD_GIT_COMMIT__}`,
      parse: (data: string) => parse(data),
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
```

NOTE: `markers/<map>` and `regions/<map>` namespaces are loaded on demand by `useTranslation([ns])`; i18next-http-backend will resolve them through the same `loadPath` template (`{{ns}}` becomes e.g. `markers/World_L_A`). The map files live at `public/locales/<lng>/markers/<map>.yaml`. No special-casing needed (unlike `_legacy` which branched on data mode).

- [ ] **Step 8: Run dev server and verify boot**

Run: `yarn dev` then open the printed URL.
Expected: a centered button "AION2 Map — rebuild boot OK" on a white background; no console errors. Stop the server.

- [ ] **Step 9: Verify typecheck/build**

Run: `yarn build`
Expected: `tsc -b` passes and Vite builds. (`routeTree.gen.ts` is auto-generated by the router plugin on dev/build.)

- [ ] **Step 10: Commit**

```bash
cd frontend
git add -A
git commit -m "feat(phase2): clean app scaffold (router, providers, local-only i18n) boots"
```

---

## Task 3: Playwright smoke harness + boot test (TDD baseline)

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/smoke.spec.ts`
- Modify: `frontend/package.json` (add `e2e` script + dev dep)

- [ ] **Step 1: Install Playwright**

```bash
cd frontend
yarn add -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create `frontend/playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:5173", trace: "on-first-retry" },
  webServer: {
    command: "yarn dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

NOTE: confirm the dev port. Vite prints it on `yarn dev`; if it is not 5173, update `baseURL` and `webServer.url`.

- [ ] **Step 3: Write the failing boot test**

Create `frontend/e2e/smoke.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("app boots without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/");
  await expect(page.getByTestId("boot-check")).toBeVisible();
  expect(errors, errors.join("\n")).toHaveLength(0);
});
```

- [ ] **Step 4: Add the `e2e` script to `package.json`**

In `scripts`: `"e2e": "playwright test"`.

- [ ] **Step 5: Run the smoke test**

Run: `yarn e2e`
Expected: 1 passed ("app boots without console errors").

- [ ] **Step 6: Commit**

```bash
cd frontend
git add -A && git commit -m "test(phase2): playwright smoke harness + boot test"
```

---

## Task 4: Local-data layer (loader + contexts)

**Files:**
- Create: `frontend/src/lib/yaml.ts`
- Create: `frontend/src/context/GameMapContext.tsx` (port)
- Create: `frontend/src/context/MarkersContext.tsx` (port, server-free)
- Create: `frontend/src/context/GameDataContext.tsx` (port verbatim)
- Create: `frontend/src/context/UserMarkersContext.tsx` (local-only rewrite)

- [ ] **Step 1: Create `src/lib/yaml.ts`** (replaces `useYamlLoader`/`dataMode`)

```ts
import { parse } from "yaml";
import { getStaticBaseUrl } from "@/lib/url";

export async function fetchYaml<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  return parse(await res.text()) as T;
}

/** Load a file from the local parsed-data root (public/). `rel` e.g. "data/maps.yaml". */
export function loadGameData<T>(rel: string): Promise<T> {
  const base = getStaticBaseUrl();
  const cleaned = rel.replace(/^\/+/, "");
  return fetchYaml<T>(`${base}/${cleaned}?build=${__BUILD_GIT_COMMIT__}`);
}
```

- [ ] **Step 2: Port `GameMapContext.tsx`**

Copy `src/_legacy/context/GameMapContext.tsx` → `src/context/GameMapContext.tsx`. Then change the data calls: replace `const loadYaml = useYamlLoader();` + `loadYaml<MapsFile>("data/maps.yaml")` with imports from `@/lib/yaml`:

```ts
import { loadGameData } from "@/lib/yaml";
// ...
const [mapsData, typesData] = await Promise.all([
  loadGameData<MapsFile>("data/maps.yaml"),
  loadGameData<TypesFile>("data/types.yaml"),
]);
```
Remove the `useYamlLoader` import and the `loadYaml` dependency in the effect deps (use `[]`). Keep everything else (selectedMap query-param logic) identical.

- [ ] **Step 3: Port `MarkersContext.tsx`**

Copy `src/_legacy/context/MarkersContext.tsx` → `src/context/MarkersContext.tsx`. Replace `useYamlLoader` with `loadGameData` (same pattern as Step 2) for `data/markers/<map>.yaml` and `data/regions/<map>.yaml`. Update the `constants` import path to `@/lib/constants`. The legacy MarkersContext has **no server calls** — keep its logic (completion v1→v2 migration, subtypeCounts, completedBySubtype) verbatim.

- [ ] **Step 4: Port `GameDataContext.tsx` verbatim**

```bash
cd frontend
cp src/_legacy/context/GameDataContext.tsx src/context/GameDataContext.tsx
```
Fix the `constants` import to `@/lib/constants`. No other changes (it depends only on `useGameMap` + `useMarkers`).

- [ ] **Step 5: Create local-only `UserMarkersContext.tsx`**

Open `src/_legacy/context/UserMarkersContext.tsx` for reference. Create `src/context/UserMarkersContext.tsx` that keeps ONLY: `userMarkers` (read/write `localStorage` under `USER_MARKERS_STORAGE_PREFIX + mapName`), `pickMode`/`setPickMode`, `createMarker(x,y,...)` (push a `{type:"local"}` `UserMarkerInstance`), `removeMarker(id)`, `hideUserMarkers`/`setHideUserMarkers`. **Remove** all backend calls (`fetchWithAuth`, `marker_feedbacks` GET/POST/PATCH/DELETE) and any `feedback`/`uploaded` marker handling. Expose via `useUserMarkers()`.

Required interface (consumed by canvas Task 5):
```ts
type UserMarkersContextValue = {
  userMarkers: UserMarkerInstance[];
  pickMode: boolean;
  setPickMode: (v: boolean) => void;
  createMarker: (x: number, y: number) => void;
  removeMarker: (id: string) => void;
  hideUserMarkers: boolean;
  setHideUserMarkers: (v: boolean) => void;
};
```

- [ ] **Step 6: Wire providers into `__root.tsx`**

```tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ThemeProvider } from "@/context/ThemeContext";
import { GameMapProvider } from "@/context/GameMapContext";
import { MarkersProvider } from "@/context/MarkersContext";
import { GameDataProvider } from "@/context/GameDataContext";
import { UserMarkersProvider } from "@/context/UserMarkersContext";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <GameMapProvider>
        <MarkersProvider>
          <GameDataProvider>
            <UserMarkersProvider>
              <Outlet />
            </UserMarkersProvider>
          </GameDataProvider>
        </MarkersProvider>
      </GameMapProvider>
    </ThemeProvider>
  ),
});
```

- [ ] **Step 7: Typecheck**

Run: `yarn build`
Expected: passes. (Providers mount but the index route still shows the boot button — no data rendered yet.)

- [ ] **Step 8: Commit**

```bash
cd frontend
git add -A && git commit -m "feat(phase2): local-only data layer (loader + game/markers/filters/user-markers contexts)"
```

---

## Task 5: Map canvas

**Files (create under `src/features/map/canvas/`):**
- Port as-is: `GameMapTiles.tsx`, `CursorTracker.tsx`, `MarkerFocusController.tsx`, `MapCursorController.tsx`, `MapClickPicker.tsx`
- Port + clean: `GameMapBorders.tsx`, `GameMarker.tsx`, `UserMarker.tsx`
- Rewrite clean: `GameMapView.tsx`, `MapContextMenu.tsx`
- shadcn: `npx shadcn@latest add tooltip`

- [ ] **Step 1: Copy verbatim-portable Leaflet helpers**

```bash
cd frontend
mkdir -p src/features/map/canvas
for f in GameMapTiles CursorTracker MarkerFocusController MapCursorController MapClickPicker; do
  cp "src/_legacy/components/Map/$f.tsx" "src/features/map/canvas/$f.tsx"
done
```
Fix imports in each: `../../types/game` → `@/types/game`, `../../utils/url` → `@/lib/url`. These use only Leaflet + props; no styling/HeroUI.

- [ ] **Step 2: Port `GameMapBorders.tsx` (region polygons)**

Copy `_legacy/components/Map/GameMapBorders.tsx` → `src/features/map/canvas/GameMapBorders.tsx`. Keep the polygon-rendering logic and the `regions` + `visibleRegions` + `showBorders` consumption. Replace any HeroUI/hardcoded colors with token-driven values: use Leaflet path options `{ color: "var(--primary)", weight: 1, fillOpacity: hovered ? 0.2 : 0.05 }`. Fix context import paths to `@/context/*`. Preserve hover→`setHoveredRegion`.

- [ ] **Step 3: Add shadcn Tooltip + port `GameMarker.tsx`**

```bash
cd frontend && npx shadcn@latest add tooltip
```
Copy `_legacy/components/Map/GameMarker.tsx` → `src/features/map/canvas/GameMarker.tsx`. Keep the Leaflet `Marker` + `divIcon` construction and the `onSelectMarker` behavior. The marker icon currently uses FontAwesome + a subtype `icon`/`color` from `types.yaml`; keep that mapping. Replace any HeroUI tooltip with the marker's Leaflet `tooltip` (label) — the existing `.leaflet-tooltip.game-marker-tooltip` CSS is in `index.css`; keep it but swap `--heroui-*` vars for the shadcn tokens (`--card`, `--foreground`, `--border`) in Task 9. Fix import paths.

- [ ] **Step 4: Port `UserMarker.tsx`**

Copy → `src/features/map/canvas/UserMarker.tsx`. Keep the local marker rendering; remove any branch for `type === "feedback"`/`"uploaded"` and any status badges tied to the backend. Add a remove affordance that calls `removeMarker(id)` from `useUserMarkers`.

- [ ] **Step 5: Rewrite `MapContextMenu.tsx` (right-click → copy position)**

Create `src/features/map/canvas/MapContextMenu.tsx`. Keep the legacy's Leaflet `contextmenu` event wiring (`useMapEvents({ contextmenu })`) that computes map x/y and reports an `{x,y,mapX,mapY}` state to the parent. The menu UI itself is rendered by the parent overlay (Step 6) using a shadcn-styled panel — so this file only emits the event/state (port the controller half, drop the inline-styled menu).

- [ ] **Step 6: Rewrite `GameMapView.tsx` clean**

Create `src/features/map/canvas/GameMapView.tsx` based on `_legacy/components/Map/GameMapView.tsx` (lines 86–159 are the keepers: bounds/center math, `MapContainer` props, layer composition). Apply these changes:

> **Coordinate convention (spec §5):** keep the existing Leaflet `CRS.Simple` + `LatLng(y, x)` placement and the `bounds = [[0,0],[height,width]]` math **unchanged**. The curated local data is authored in this Y-up space; do NOT switch to the no-flip image-space transform in Phase 2 (deferred until tools-parsed `data/` lands).

- Keep: `MapContainer` config (CRS.Simple, zoom/min/max, bounds/center from `tileWidth*tilesCountX`), `GameMapTiles`, `GameMapBorders`, markers `.filter(m => selectedMarkerId === m.id || visibleSubtypes?.has(m.subtype))`, `UserMarker` list (now `type === "local"` only), `MarkerFocusController`, `CursorTracker`, `MapCursorController`, `MapClickPicker`, `MapContextMenu`.
- Remove: `MarkerPopupEdit`, `DismissibleBanner`, the `feedback` filter, and the hardcoded `沪ICP备...` text-shadow block — move the ICP text into a small `<span className="absolute bottom-14 left-3 z-[1000] text-xs text-white/80 drop-shadow">` (kept; it is a legal requirement) .
- Replace the inline context-menu `<div>` (legacy lines 186–210) with a shadcn-styled panel: `className="absolute z-[5000] min-w-[190px] rounded-md border border-border bg-popover text-popover-foreground shadow-md py-1"` and the item as `<button className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground">`.
- Replace `text-default-500` empty state with `text-muted-foreground`.
- Cursor-position overlay: keep, restyle `bg-black/80` → `bg-popover/90 text-popover-foreground border border-border`.

- [ ] **Step 7: Compose the map route**

Create `src/features/map/MapRoute.tsx`:

```tsx
import { useRef, useState } from "react";
import type { MapRef } from "@/types/game";
import GameMapView from "@/features/map/canvas/GameMapView";

export default function MapRoute() {
  const mapRef = useRef<MapRef>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedPosition] = useState<{ x: number; y: number } | null>(null);
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar added in Task 7 */}
      <GameMapView
        mapRef={mapRef}
        onSelectMarker={setSelectedMarkerId}
        selectedMarkerId={selectedMarkerId}
        selectedPosition={selectedPosition}
      />
    </div>
  );
}
```

Replace `src/routes/index.tsx` body to render `<MapRoute />` (keep the `createFileRoute("/")` wrapper).

- [ ] **Step 8: Add a smoke assertion for the canvas**

Append to `e2e/smoke.spec.ts`:

```ts
test("map renders tiles and markers from local data", async ({ page }) => {
  await page.goto("/?map=World_L_A");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible({ timeout: 15_000 });
});
```

Remove the `boot-check` test (the index route no longer shows that button) — delete the first test and update Task 3's test to navigate and assert the leaflet container instead. (The "no console errors" check can move into this test: collect `errors` and assert length 0.)

- [ ] **Step 9: Run smoke + manual look**

Run: `yarn e2e`
Expected: canvas test passes (tiles + at least one marker visible). Then `yarn dev`, open `/?map=World_L_A`, confirm tiles, region outlines, markers render. Stop server.

- [ ] **Step 10: Commit**

```bash
cd frontend
git add -A && git commit -m "feat(phase2): map canvas (tiles, regions, markers, context menu) on local data"
```

---

## Task 6: Sidebar (map select, type filter, region filter, search, completion)

**Files (create under `src/features/map/sidebar/`):** `Sidebar.tsx`, `SelectMap.tsx`, `MarkerTypes.tsx`, `RegionFilter.tsx`, `MarkerSearch.tsx`
- shadcn: `npx shadcn@latest add select accordion checkbox scroll-area command input separator`

- [ ] **Step 1: Add shadcn primitives**

```bash
cd frontend && npx shadcn@latest add select accordion checkbox scroll-area command input separator
```

- [ ] **Step 2: `SelectMap.tsx`** — shadcn `Select` over `useGameMap().maps`, value = `selectedMap?.name`, `onValueChange` → `setSelectedMap(maps.find(...))`. Option label via `t("maps:<name>.name", name)`. Reference behavior: `_legacy/components/Map/SideBar/SelectMap.tsx`.

- [ ] **Step 3: `MarkerTypes.tsx`** — shadcn `Accordion` (one item per category from `useGameMap().types`), each subtype a `Checkbox` bound to `useGameData().visibleSubtypes` + `handleToggleSubtype`. Show `completedCounts[sub]/subtypeCounts[sub]` from `useMarkers()`. Add "show all / hide all" buttons (`handleShowAllSubtypes`/`handleHideAllSubtypes`) and a clear-completed button → `clearMarkerCompleted()` (guard with a shadcn `AlertDialog`: `npx shadcn@latest add alert-dialog`). Reference: `_legacy/.../SideBar/MarkerTypes.tsx` (240 lines — keep the data wiring, drop HeroUI Accordion/Checkbox for shadcn). Subtype label via `t("types:<name>.name", name)`.

- [ ] **Step 4: `RegionFilter.tsx`** — list `useMarkers().regions`, each a `Checkbox` bound to `useGameData().visibleRegions` + `handleToggleRegion`; a master toggle for `showBorders` (`handleToggleBorders`). Region label via `t("regions:<map>:<name>.name", name)`.

- [ ] **Step 5: `MarkerSearch.tsx`** — port the minisearch index build from `_legacy/.../SideBar/MarkerSearch.tsx` (index over `useMarkers().markers` by `localizedName`/`localizedDescription`). Input = shadcn `Input` (debounced `SEARCH_DEBOUNCE_MS`); results in a shadcn `Command`/list; on select → call the route's `onSelectMarker(id)` + fly-to (set `selectedPosition`). Keep the search logic; replace HeroUI input/list with shadcn.

- [ ] **Step 6: `Sidebar.tsx`** — collapsible shell (shadcn `Button` toggle + `ScrollArea`), composes `SelectMap`, `MarkerSearch`, `MarkerTypes`, `RegionFilter` with `Separator`s. Use tokens: `bg-card text-card-foreground border-r border-border`. Reference layout: `_legacy/.../SideBar/SidebarWrapper.tsx` + `LeftSidebar.tsx` (keep the collapse behavior, drop hardcoded gradients — use `bg-card`).

- [ ] **Step 7: Mount sidebar in `MapRoute.tsx`** — render `<Sidebar onSelectMarker={...} setSelectedPosition={...} />` left of `<GameMapView/>`; lift `selectedPosition` to state and pass into both.

- [ ] **Step 8: Smoke assertions** — append to `e2e/smoke.spec.ts`:

```ts
test("type filter toggles marker visibility", async ({ page }) => {
  await page.goto("/?map=World_L_A");
  await page.locator(".leaflet-marker-icon").first().waitFor({ timeout: 15_000 });
  const before = await page.locator(".leaflet-marker-icon").count();
  await page.getByTestId("subtype-toggle-monolithMaterial").click(); // add data-testid in MarkerTypes
  await expect.poll(() => page.locator(".leaflet-marker-icon").count()).not.toBe(before);
});

test("search returns hits", async ({ page }) => {
  await page.goto("/?map=World_L_A");
  await page.getByTestId("marker-search").fill("a");
  await expect(page.getByTestId("search-results").locator("li").first()).toBeVisible({ timeout: 10_000 });
});
```
Add the referenced `data-testid`s (`subtype-toggle-<name>`, `marker-search`, `search-results`) to the respective components.

- [ ] **Step 9: Run smoke + manual look**

Run: `yarn e2e` → all pass. Then `yarn dev`, verify map select switches maps + updates URL `?map=`, type/region toggles change markers/borders, search flies to a marker, completion counts update and persist after reload.

- [ ] **Step 10: Commit**

```bash
cd frontend
git add -A && git commit -m "feat(phase2): map sidebar (select/type/region filters, search, completion) on shadcn"
```

---

## Task 7: Marker popup (local content only)

**Files (create under `src/features/map/popup/`):** `SelectedMarkerPopup.tsx`, `MarkerPopupContent.tsx`
- shadcn: `npx shadcn@latest add card`

- [ ] **Step 1: Add shadcn Card**

```bash
cd frontend && npx shadcn@latest add card
```

- [ ] **Step 2: `SelectedMarkerPopup.tsx`** — port the Leaflet `Popup` host from `_legacy/components/Map/SelectedMarkerPopup.tsx`: render a react-leaflet `<Popup>` at the selected marker's `LatLng(y,x)`, looking up the marker via `useMarkers().markersById[selectedMarkerId]`; `onClose` → `onSelectMarker(null)`. Keep the existing `index.css` rules that strip the default popup chrome.

- [ ] **Step 3: `MarkerPopupContent.tsx`** — clean rewrite of `_legacy/components/Map/MarkerPopupContent.tsx` (382 lines). **Keep:** name (`localizedName`), description (`localizedDescription`), subtype icon/label, coordinates, completion toggle (`toggleMarkerCompleted` + `completedBySubtype`), and the image gallery IF images are local (use the Embla gallery only if you port it; otherwise a simple `<img>` grid — YAGNI, prefer simple). **Remove entirely:** the comments section + `GET/POST /comments` calls, contributors-from-backend, and any auth-gated UI. Use a shadcn `Card` with token classes (`bg-card text-card-foreground border-border`).

- [ ] **Step 4: Smoke assertion** — append:

```ts
test("clicking a marker opens a local popup", async ({ page }) => {
  await page.goto("/?map=World_L_A");
  await page.locator(".leaflet-marker-icon").first().click({ timeout: 15_000 });
  await expect(page.locator(".leaflet-popup")).toBeVisible();
  await expect(page.getByTestId("marker-popup-card")).toBeVisible();
});
```
Add `data-testid="marker-popup-card"` to the Card root.

- [ ] **Step 5: Run smoke + manual** — `yarn e2e` passes; `yarn dev`, click markers, confirm popup shows name/desc/coords/completion, NO comments UI.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add -A && git commit -m "feat(phase2): local-only marker popup (shadcn Card; no comments)"
```

---

## Task 8: Chrome — theme + language switch

**Files:** Create `frontend/src/components/TopNavbar.tsx`
- shadcn: `npx shadcn@latest add dropdown-menu`

- [ ] **Step 1: Add dropdown-menu**

```bash
cd frontend && npx shadcn@latest add dropdown-menu
```

- [ ] **Step 2: `TopNavbar.tsx`** — a thin top bar: app logo/text, a theme `DropdownMenu` (auto/light/dark/abyss → `useTheme().setTheme`), and a language `DropdownMenu` (`SUPPORTED_LANGUAGES` → `i18n.changeLanguage`). Reference behavior: `_legacy/components/ThemeDropdown.tsx` + `_legacy/components/TopNavbar.tsx`, but rebuild on shadcn `DropdownMenu` with token classes. Mount it in `MapRoute.tsx` above the `flex` row (or as an overlay top bar).

- [ ] **Step 3: Smoke assertions** — append:

```ts
test("theme switch applies the theme class", async ({ page }) => {
  await page.goto("/?map=World_L_A");
  await page.getByTestId("theme-menu").click();
  await page.getByTestId("theme-dark").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("language switch changes labels", async ({ page }) => {
  await page.goto("/?map=World_L_A");
  const sel = page.getByTestId("map-select");
  const en = await sel.textContent();
  await page.getByTestId("lang-menu").click();
  await page.getByTestId("lang-zh-CN").click();
  await expect(sel).not.toHaveText(en ?? "");
});
```
Add the referenced `data-testid`s.

- [ ] **Step 4: Run smoke + manual** — `yarn e2e` all pass; `yarn dev`, toggle themes (light/dark/abyss visibly change) and languages (labels change).

- [ ] **Step 5: Commit**

```bash
cd frontend
git add -A && git commit -m "feat(phase2): top navbar theme + language switch on shadcn"
```

---

## Task 9: Remove HeroUI + dead CSS

**Files:** `frontend/src/index.css`, `frontend/package.json`, `frontend/vite.config.ts`

- [ ] **Step 1: Confirm nothing live imports HeroUI**

Run: `grep -rn "@heroui" src --include=*.ts --include=*.tsx | grep -v "_legacy"`
Expected: no output. (If any, migrate that usage to shadcn before continuing.)

- [ ] **Step 2: Remove HeroUI from `index.css`**

Delete the line `@plugin './hero.ts';`. Replace the Leaflet rules that reference `--heroui-content1` / `--heroui-foreground` / `--heroui-default-200` (in the `.leaflet-tooltip` / `.game-marker-tooltip` / `.dark .leaflet-container` blocks) with shadcn tokens: `--heroui-content1` → `var(--card)`, `--heroui-foreground` → `var(--foreground)`, `--heroui-default-200` → `var(--border)`. Remove `@source '../node_modules/@heroui/theme/...'`.

- [ ] **Step 3: Remove the dep + Vite chunk**

```bash
cd frontend && yarn remove @heroui/react
```
In `vite.config.ts`, remove `@heroui|@nextui-org` from the `vendor-ui` chunk `test` regex (keep the rest).

- [ ] **Step 4: Build + smoke**

Run: `yarn build && yarn e2e`
Expected: build passes, all smoke tests pass. Manually confirm the marker tooltip + dark map background still look right.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add -A && git commit -m "chore(phase2): drop HeroUI dependency + dead theme CSS"
```

---

## Task 10: Validation — full smoke run + manual screenshots

**Files:** none (verification task)

- [ ] **Step 1: Run the full smoke suite**

Run: `yarn e2e`
Expected: all tests pass — boot/no-console-errors, tiles+markers, type filter, search, popup, theme, language.

- [ ] **Step 2: Manual screenshot matrix**

Run `yarn dev`. For maps `World_L_A` and `Abyss_Reshanta_A`, capture screenshots in each theme × language:
- themes: light, dark, abyss
- languages: en, zh-CN

Confirm for each: tiles load, markers + region outlines render, sidebar filters/search work, popup shows local content (no comments), labels localized, theme colors match the Lanhu design tokens (compare against the Lanhu 规范文档 light/dark boards via the lanhu MCP). Save screenshots under `frontend/.screenshots/` (gitignored).

- [ ] **Step 3: Record completion**

Update memory `reconstruction-project` (mark Phase 2 Map module done + validated) and the design spec status line. Confirm with the user before starting Crafting/Class/Items.

- [ ] **Step 4: Commit any doc updates**

```bash
cd "G:/NCSoft/aion2-map"
git add docs/ && git commit -m "docs: Phase 2 Map module rebuilt + validated"
```

---

## Out of scope (Phase 3)
TS API client generation, server-feature porting (comments, marker feedback/edit, backend user-marker sync, character, leaderboard, auth, uploads, artifact voting), server rework. Crafting/Class/Items modules get their own plans after the Map module is validated.
