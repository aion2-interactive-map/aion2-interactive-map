# Palworld Pal ID Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans / subagent-driven-development. Steps use `- [ ]` tracking.

**Goal:** Show each catalogued pal's 3-digit Paldeck number (`No.037B`) in the palworld sidebar (wild pals), marker popup, and search (wild + alpha pals).

**Architecture:** Carry the extractor's existing `zukanIndex`/`zukanIndexSuffix` through emit → data-contract → frontend. Wild pals carry it on their subtype; alpha pals carry it per marker row. The `No.###` formatting lives in the palworld app; the shared shell exposes generic `idLabel` props.

**Tech Stack:** TypeScript, React 19, Vite, zod, MiniSearch, Node ESM (extractor), Vitest.

Spec: `docs/superpowers/specs/2026-07-04-palworld-pal-id-display-design.md`.

---

### Task 1: data-contract fields

**Files:**
- Modify: `frontend/packages/data-contract/src/types.ts` (`MarkerTypeSubtype`, `MarkerInstance`)
- Modify: `frontend/packages/data-contract/src/schemas.ts` (`markerTypeSubtypeSchema`, `markerInstanceSchema`)

- [ ] Add to `MarkerTypeSubtype` and `MarkerInstance` interfaces:
  ```ts
  /** Paldeck index (palworld). 1-based; absent/<=0 means uncatalogued. */
  zukanIndex?: number;
  /** Paldeck variant suffix, e.g. "B". */
  zukanIndexSuffix?: string;
  ```
- [ ] Add to both zod schemas: `zukanIndex: z.number().optional()`, `zukanIndexSuffix: z.string().optional()`.
- [ ] Verify: `pnpm --filter @gamemap/data-contract build` (or repo typecheck) passes.
- [ ] Commit (frontend repo): `feat(data-contract): optional pal Paldeck index fields`.

### Task 2: tools emit + regenerate data-palworld

**Files:**
- Modify: `tools/.claude/worktrees/palworld-extractor/palworld/src/emit.mjs`
- Regenerate: `data-palworld/types.json`, `data-palworld/markers/*.json`

- [ ] In the `types` builder (per-subtype map, ~line 88), add
  `...(s.zukanIndex > 0 ? { zukanIndex: s.zukanIndex, zukanIndexSuffix: s.zukanIndexSuffix } : {})`.
  (`palSubtypes` already carry these; non-pal yaml subtypes don't and are skipped.)
- [ ] In the boss loop (`for (const b of parsed.bosses)`), compute `const z = zForId(b.characterId)` and add to the pushed candidate:
  `...(z.zukanIndex > 0 ? { zukanIndex: z.zukanIndex, zukanIndexSuffix: z.zukanIndexSuffix } : {})`.
- [ ] In the id-assignment step (where marker rows are built from candidates, ~line 171), carry through:
  `...(c.zukanIndex ? { zukanIndex: c.zukanIndex, ...(c.zukanIndexSuffix ? { zukanIndexSuffix: c.zukanIndexSuffix } : {}) } : {})`.
- [ ] Run the emit stage from the extractor dir: `node src/cli.mjs emit` (writes to the data-palworld out dir — confirm the out path in `cli.mjs`).
- [ ] Verify with node: wild-pal subtypes in `data-palworld/types.json` have `zukanIndex`; at least one `alphaPal` row in `data-palworld/markers/MainWorld.json` has `zukanIndex`.
- [ ] Commit tools repo (`feat(palworld): emit Paldeck index on pal subtypes + alpha markers`) and data-palworld repo (`chore: regenerate with Paldeck index`).

### Task 3: map-shell idLabel (search + popup)

**Files:**
- Modify: `frontend/packages/map-shell/src/SearchPanel.tsx`
- Modify: `frontend/packages/map-shell/src/MarkerPopupCard.tsx`
- Test: `frontend/packages/map-shell/src/SearchPanel.test.tsx` (create), `MarkerPopupCard` covered inline if a test file exists

- [ ] `SearchItem`: add `idLabel?: string`.
- [ ] MiniSearch config: add `"idLabel"` to `fields` and to `storeFields` so numeric queries match.
- [ ] Result row: render `item.idLabel` as a small mono badge before the name span (only when present).
- [ ] `MarkerPopupCardProps`: add `idLabel?: string`; render it as a badge adjacent to the `name` title (only when present).
- [ ] Tests: idLabel renders in a search result; a numeric query returns the item; popup renders the badge when given and omits when not.
- [ ] Verify: `pnpm --filter @gamemap/map-shell test` passes.
- [ ] Commit (frontend): `feat(map-shell): idLabel badge in search results + popup`.

### Task 4: palworld app wiring

**Files:**
- Modify: `frontend/apps/palworld/src/lib/data.ts` (`MarkerRow`)
- Create: `frontend/apps/palworld/src/lib/palId.ts` (+ `palId.test.ts`)
- Modify: `frontend/apps/palworld/src/App.tsx`

- [ ] `MarkerRow`: add `zukanIndex?: number`, `zukanIndexSuffix?: string`.
- [ ] `palId.ts`:
  ```ts
  export function formatPalId(zukanIndex?: number, suffix?: string): string | undefined {
    if (typeof zukanIndex !== "number" || zukanIndex <= 0) return undefined
    return `No.${String(zukanIndex).padStart(3, "0")}${suffix ?? ""}`
  }
  ```
- [ ] `palId.test.ts`: `No.001`, `No.037` + `B` → `No.037B`, `undefined` for `0`/`-1`/absent.
- [ ] `App.tsx` `engineMarkers`: pass `zukanIndex: m.zukanIndex`, `zukanIndexSuffix: m.zukanIndexSuffix` onto each `EngineMarker`.
- [ ] `App.tsx` `filterCategories`: for each subtype set `badge: formatPalId(s.zukanIndex, s.zukanIndexSuffix)` (undefined → no badge; alpha's generic subtype has none).
- [ ] `App.tsx` `searchItems`: set `idLabel: formatPalId(m.zukanIndex ?? m.subtypeMeta?.zukanIndex, m.zukanIndexSuffix ?? m.subtypeMeta?.zukanIndexSuffix)`.
- [ ] `App.tsx` `renderPopupContent`: pass the same resolved `idLabel` to `MarkerPopupCard`.
- [ ] Verify: `pnpm --filter palworld test` (formatPalId) passes.
- [ ] Commit (frontend): `feat(palworld): pal Paldeck id in sidebar badge, popup, search`.

### Task 5: Verify build + live

- [ ] `pnpm -r typecheck` (or per-package build) and `pnpm -r test` green.
- [ ] `pnpm -r lint` clean for touched packages.
- [ ] Dev server (probe :15174 first): wild-pal sidebar buttons show a `No.###` badge on the right; a wild-pal popup and an alpha-pal popup show the badge next to the name; searching a number surfaces the pal.
- [ ] Update `frontend/CLAUDE.md`/memory only if a non-obvious fact emerged (else skip).

## Self-Review

- **Spec coverage:** data-contract (T1), emit+regen (T2), shell search+popup (T3), app sidebar/popup/search + format (T4), tests+live (T5), caveat noted in spec. Sidebar uses existing `FilterSubtype.badge` — no shell change, covered in T4.
- **Type consistency:** `zukanIndex`/`zukanIndexSuffix` (data), `idLabel` (shell props + SearchItem), `formatPalId` (app) used consistently across tasks.
- **Placeholders:** none — format helper and field additions are fully specified.
