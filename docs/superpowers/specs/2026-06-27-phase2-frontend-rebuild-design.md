# Phase 2 — Clean Server-Free Frontend Rebuild (Map First)

**Date:** 2026-06-27
**Status:** Map module IMPLEMENTED + validated (2026-06-28) on branch `phase2/map-rebuild`. Plan: `docs/superpowers/plans/2026-06-27-phase2-map-rebuild.md` (10 tasks done). Crafting/Class/Items modules still pending (own plans). Known minor gap: one marker-type category lacks an en translation in the locale data.

## Context & goal

The existing frontend works but is **dirty**: HeroUI components carry hardcoded inline
styles to force-match the UI design. Rather than migrate in place, Phase 2 **archives the
old frontend and rebuilds it clean** on shadcn/ui, running **without any server data** (local
parsed data only). Server-dependent features are deferred to Phase 3.

Revised overall plan (supersedes the earlier 2A–2E "strangler" decomposition):
1. **(Phase 2)** Archive old frontend code.
2. **(Phase 2)** Rebuild the frontend server-free and validate it.
3. **(Phase 3)** Generate a TS API client (an alternative to umi-openapi) and port the
   server-dependent features back, reworking the server at the same time.

This spec covers **steps 1–2 (Phase 2)**, **Map module first**.

## Decisions (from brainstorming)

- **Rebuild strategy:** same repo, reuse the existing clean infra, keep old `src/` as a
  read-only reference, rebuild `src/` clean.
- **Scope/order:** rebuild **Map first → validate → then** Crafting, Class/BD, Items.
  Character & Leaderboard depend on the live server → Phase 3 (omitted/stubbed now).
- **Server seam:** **pure local now, no abstraction.** Build Phase 2 directly against local
  data; introduce the data-access abstraction + TS client in Phase 3 when porting.
- **Validation:** **light Playwright e2e smoke + manual screenshots**, per module.
- **Coordinate convention:** keep the existing Leaflet **Y-up (flipped)** convention in
  Phase 2 (see §5).

## 1. Archive

- Annotated git tag `frontend-v1-archive` + branch `archive/v1` (full history preserved).
- Move old `src/` → `src/_legacy/`, **excluded** from `tsconfig` (`include`), eslint, and
  Vite so it never compiles, but remains a live in-repo reference during the rebuild.
- Delete `src/_legacy/` when Phase 2 is complete.

## 2. Reused infrastructure (unchanged)

Kept as-is: Vite (rolldown), Tailwind v4 (CSS `@theme`), TanStack file-based Router,
i18next (en / zh-CN / zh-TW), Leaflet + react-leaflet, `ThemeContext` (light/dark/abyss),
and the **Phase 2A shadcn foundation** (`components.json`, `cn()`, the semantic token layer
in `index.css`, `Button`).

**HeroUI is dropped.** New components are shadcn-only. At the **end** of Phase 2 (once
nothing imports HeroUI): remove `@heroui/react`, the `@plugin './hero.ts'` line + `hero.ts`,
the `--heroui-*` references in the Leaflet CSS (`index.css`), and the HeroUI Vite chunk
group. The shadcn token layer stays (its hex values originated from `hero.ts` and match the
Lanhu design system).

## 3. New `src/` structure

```
src/
  routes/            TanStack file routes (index = map; others added per module)
  features/map/      Map module: Leaflet layers, sidebar, popups, hooks
  components/ui/      shadcn primitives (Button done; add Input, Select, Accordion,
                     Dialog, Popover, Tabs, Tooltip, Checkbox, Command, ScrollArea
                     as each is needed)
  context/           local-data React contexts/hooks (maps, types, markers, regions,
                     filters) — ported from the old src/context/, cleaned, server bits
                     stripped. (Named context/ to match existing convention; distinct
                     from the canonical `data/` *repo* that holds the parsed dataset.)
  lib/               cn, coordinate transform, constants
```

localStorage user state is preserved (keys unchanged): completed markers (v1/v2), visible
subtypes, visible regions, local user markers, character history/starred (character module
is Phase 3 but keys reserved).

Local-data sources (current `frontend/public/data/**` + `public/locales/**`; the canonical
`data/` repo is still empty and will replace `public/data` once Phase 1 tools populate it):
`maps.yaml`, `types.yaml`, `markers/<map>.yaml`, `regions/<map>.yaml`, plus items/classes/
boards/skills/stats/servers for later modules.

## 4. Map module — vertical slice (dependency order)

1. **Canvas** — `GameMapView` + tile layer + region polygons + markers, sourced from local
   `maps.yaml`, `types.yaml`, `markers/<map>.yaml`, `regions/<map>.yaml`.
2. **Sidebar** — map selector, type/subtype filter, region filter, search (minisearch),
   completion toggle + clear-completed. Clean shadcn (Accordion / Checkbox / Command / Input).
3. **Marker popup** — **local content only**: name, description, icon, coordinates,
   completion toggle. **No comments, no feedback/edit** (Phase 3). Local user markers
   (add/remove via map context menu) kept via localStorage.
4. **Chrome** — top bar with theme switch + language switch.

**Deferred (YAGNI) unless later requested:** promotional banners + Embla carousel
(`DismissibleBanner`, `EmblaCarousel/*`).

**Omitted in Phase 2 (server-coupled):** marker comments, marker feedback/edit, backend
user-marker sync, forum, character, leaderboard, contact/feedback.

## 5. Coordinate convention (explicit decision)

The verified world→pixel transform (CLAUDE.md) is a pure linear map from `WorldBoundBox`
with `px_from=X, flip_x=False, flip_y=False` (image space, Y-down). CLAUDE.md notes Phase 2
*should* standardize on this no-flip convention.

**However**, the curated `public/data` markers/regions were authored in the old Leaflet
**Y-up (flipped)** space. Switching the render convention now would mismatch the existing
data. **Decision: keep the existing Y-up convention in Phase 2** so curated data renders
correctly. Defer the image-space switch to when tools-parsed `data/` replaces the curated
set (Phase 1 follow-up). This is a deliberate deferral, not an oversight.

## 6. Validation (per module; Map first)

- **Playwright smoke** (new dev dependency), run against the dev server:
  - app boots without console errors;
  - map tiles render; markers count > 0 from local YAML;
  - type/subtype filter toggles marker visibility;
  - region filter toggles;
  - search returns hits;
  - language switch (en ↔ zh-CN) changes visible labels;
  - theme switch applies the `dark`/`abyss` class.
- **Manual screenshots:** Map across light/dark/abyss × {en, zh-CN} on 2–3 maps; visual
  parity check vs the current app and the Lanhu design tokens.

## 7. Design fidelity

shadcn primitives bound to the 2A semantic token layer. When building each component, pull
exact values (colors, fonts, radii, spacing, icons) from the Lanhu MCP design-system sector
(规范文档: buttons / fonts / icons / light-dark) rather than eyeballing or hardcoding. Match
the current app's rendered layout (which already follows the Lanhu design).

## Out of scope (Phase 3)

TS API client generation, server-feature porting (comments, feedback, user-marker sync,
character, leaderboard, auth, uploads, artifact voting), and the server rework itself.

## Success criteria

Map module rebuilt clean on shadcn (no HeroUI, no hardcoded one-off styles), runs entirely
on local data, passes the Playwright smoke suite, and matches the design across all three
themes and en/zh-CN — validated before moving on to Crafting/Class/Items.
