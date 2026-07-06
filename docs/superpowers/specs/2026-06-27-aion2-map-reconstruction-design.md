# AION2 Interactive Map — Monorepo Reconstruction Design

**Date:** 2026-06-27
**Status:** Approved structure & phasing; per-phase implementation plans to follow.

## 1. Goal

Reconstruct the AION2 Interactive Map project — currently four scattered repos plus a
game-data export — into a clean, co-located workspace under `G:\NCSoft\aion2-map\`.
The reconstruction:

- Unifies the two frontends (map viewer + web admin) into one application.
- Re-sources most game data and localization from the official game export instead of
  hand-entered backend data.
- Separates derived artifacts (parsed data, images) from code.
- Establishes a shared workspace layer (CLAUDE.md, skills, specs) above the repos.

## 2. Source inventory (as-found)

| Piece | Stack | Key facts |
|---|---|---|
| `aion2-interactive-map` (frontend) | React 19, Vite, HeroUI, Tailwind, TanStack Router, Leaflet, i18next | git repo; JWT auth; `public/images` 2.9MB curated; `public/UI` **190MB / 6,215 PNGs** (game-derived, the "dirty" part); loads static YAML + backend API; i18n from backend `/api/v1/export/locales`. |
| `aion2-interactive-map-webadmin` | React 19, Ant Design Pro, UmiJS/Max | git repo; marker CRUD + feedback/comment moderation; OpenAPI-generated client; **no map rendering**; deployed at `/webadmin/`. |
| `aion2-interactive-map-backend` | FastAPI, PostgreSQL, S3 (Tencent COS) | git repo; hand-placed marker x/y; screenshots in S3; comments/feedback/contributors; user progress; abyss artifacts. |
| `aion2-tools` | Python / uv | git repo; `game_data/ → parsed_data/`; has `parse/map.py`, `region/region.py`, template matching, `webp/transform.py`; depends on **opencc** (zh-TW→zh-CN). **Migrated Poetry→uv 2026-06-27** (in-project `.venv`, Python 3.13 pinned). |
| Game export `G:\NCSoft\Export\Exports\AION2\Content\` | UE5 export, 2.9 GB | JSON tables; `MapData.json` (X,Y,Z world coords); `WorldMap/*.json` (world→sector/pixel mapping); `UI/` PNGs (Map 895MB + Resource 992MB…); `Data/Table/L10N/{en-US,ko-KR,zh-TW}/L10NString.json` (flat key→string, `[DNT]` placeholders). |

## 3. Key decisions

| Decision | Choice |
|---|---|
| Workspace structure | One folder, repos stay **independent** (not a true monorepo). |
| Frontend merge | Rewrite **both** frontends onto **shadcn/ui**; webadmin features become admin-gated routes inside the map frontend. |
| i18n source | **Deeper rewrite:** most strings sourced from the game export `L10N` tables (via tools → data), not the backend export endpoint. |
| Data loading | **Deeper rewrite:** most game data served from `data` (static); only dynamic/user data from backend. |
| Game data (`data` repo) | Its own git repo named `data`, **served over HTTP**. |
| Images | Its own **plain git repo (no LFS)**, **WebP only**, derived from the export PNGs by the tools, served over HTTP. |
| Raw data | Stays at the export path as a tools **input**; plain folder for now (**Perforce later**). |
| Consumption | Frontend fetches data + images **by URL** from their own services (existing `VITE_CDN_BASE_URL` / `VITE_API_BASE_URL` config). No submodules, no build-time copy. |
| Workspace meta | Root folder is a **lightweight workspace git repo** holding shared CLAUDE.md, `.claude/skills/`, and specs; it `.gitignore`s the nested repos. |
| Backend reconciliation | **Deferred (future work)** — pair dataset with DB, preserve screenshots + user content, drop redundant hand-entered data. |
| Python tooling | **uv** (not Poetry) for all Python repos — in-project `.venv`, lockfile committed, Python pinned via `.python-version`. `tools` migrated 2026-06-27; `backend` migrates when its Phase 3 work begins. |
| Naming | **All names align with game-data terms.** Established: project `region` → game **`subzoneGroup`** (coarse named areas; `SubzoneGroup.json`); finer polygon volumes = **`subzone`** (`SubzoneVolumeInfoMap`); no standalone `Zone`. `tools`+docs aligned 2026-06-27; **frontend** rename folded into Phase 2, **backend** into Phase 3. |

## 4. Target layout

```
aion2-map/                   ← workspace git repo (meta only; gitignores nested repos)
├── .gitignore               (ignores frontend/ backend/ tools/ images/ data/)
├── CLAUDE.md                ← shared: architecture, repo map, cross-repo data-flow contract
├── .claude/skills/          ← shared skills
├── docs/superpowers/specs/  ← this design doc + per-phase plans
├── frontend/                git repo — unified map + admin on shadcn/ui
│     public/ keeps: images/ (2.9MB), data/, locales/, aion2.webp
│     public/UI/ REMOVED (extracted to images repo)
│     own CLAUDE.md, own .claude/skills/
├── backend/                 git repo — FastAPI, unchanged this round; own CLAUDE.md
├── tools/                   git repo — raw→parsed + image extractor + L10N parser; own CLAUDE.md
├── images/                  git repo (plain, no LFS) — WebP, tools-derived, served over HTTP
└── data/             git repo — tools-derived text data, served over HTTP
```

- `aion2-interactive-map-webadmin` is **consumed and archived**, not moved in as a live repo.
- Nested git repos are independent; the workspace repo only tracks meta files.
- CLAUDE.md / skills layer up the directory tree: working in `frontend/` sees both
  `frontend/CLAUDE.md` and root `CLAUDE.md`.

## 5. Data-flow contract (target)

```
Game export (raw, Perforce later)
   │  ── tools ──►  data repo (text: markers, subzoneGroups, tables, locales)  ──HTTP──┐
   │  ── tools ──►  images repo (WebP icons/UI)                                  ──HTTP──┤
   │                                                                                     ▼
backend (FastAPI) ── HTTP (dynamic/user data only) ──────────────────────────────►  frontend
   (auth, comments, feedback, contributors, user progress, image uploads, artifact voting)
```

## 6. Phases

Each phase gets its own spec → implementation plan → execution. Backend reconciliation is
explicitly future work.

### Phase 0 — Restructure

- Create the workspace git repo at `aion2-map/` with `.gitignore` for nested repos,
  initial `CLAUDE.md`, `.claude/skills/`, and `docs/`.
- Move `frontend`, `backend`, `tools` into the folder as-is (histories preserved; they
  remain independent repos with their existing remotes).
- Extract `frontend/public/UI` → new `images/` repo; remove it from the frontend; update
  frontend references to point at the image-service URL.
- Create empty `data/` repo.
- Configure the tools' raw-data input path to `G:\NCSoft\Export\Exports\AION2\Content\`.
- Archive the old webadmin repo (keep a reference; do not move it in live).

### Phase 1 — Tools rewrite

The technical heart. Inputs from the raw export; outputs to `data/` and `images/`.

- **(a) Markers & coords:** extract markers from the export; **transform game world coords
  (`MapData.json` X,Y,Z) → map-image pixel space** using `WorldMap/*.json` metadata
  (`StartWorldLocation`, `WorldBoundBox`, `SectorPlaneSize`, texture sizes) — the space the
  frontend/backend already use for marker x/y. Emit YAML/JSON matching the frontend schema.
- **(b) Subzone groups & tables:** regenerate subzone-group polygons and reference tables
  (rework the legacy `region/` package — renaming it region→subzoneGroup at that point —
  and `parse/map.py` where still valid).
- **(c) Images:** select needed UI images from `Content/UI`, **convert PNG → WebP**
  (reuse `webp/transform.py`), optimize, emit to `images/`.
- **(d) Localization:** parse `L10N/{en-US,ko-KR,zh-TW}/L10NString.json`; filter `[DNT]`
  entries; produce four target locales **en-US, ko-KR, zh-TW, zh-CN** (zh-CN derived from
  **zh-TW via opencc**); extract the keys the frontend needs; emit i18next-compatible locale
  files to `data`.
- Retire backend-upload tools the new dataset makes redundant; note what is dropped.

### Phase 2 — Frontend unification

Depends on Phase 0; can develop in parallel with Phase 1 against a sample dataset.

- **(a) Component layer:** migrate HeroUI → shadcn/ui; rebuild the webadmin's Antd/UmiJS
  screens (marker CRUD, feedback/comment moderation) as **admin-gated routes** (existing
  `isSuperuser` JWT flag) inside the Vite app. Remove HeroUI when done.
- **(b) i18n rewrite:** switch the i18next source from the backend export endpoint to the
  **served locale files in `data`** (game-L10N-derived). Keep i18next infra.
- **(c) Data-loading rewrite:** fetch **most game data from the `data` service**
  (static); keep **only dynamic/user data on the backend** — auth, comments, feedback,
  contributors, user progress, image uploads, abyss artifact voting. Rebase image
  references to the **image-service URL** (`.webp`).
- **Kept (not rewritten):** Leaflet map rendering, route structure, the OpenAPI backend
  client (regenerated into `frontend/`).

### Phase 3 — Backend reconciliation 🚩 future work

- Build a **pairing key** between dataset markers and DB markers (coordinate proximity +
  type/name).
- **Preserve:** S3 screenshots, comments, feedback, contributors, user progress.
- **Drop/regenerate:** hand-entered coordinates/translations now sourced from the dataset.
- Produce a migration that **re-anchors preserved screenshots** onto dataset-sourced markers.

### 🚩 Future work — recover `Abyss_Reshanta_B`
`Abyss_Reshanta_B` (the `AR2_` version) was **removed from the current export** and replaced by
`Abyss_Reshanta_C` (`AR3_`). Its `Map.json`/`Subzone.json`/`Achievement.json`/`WorldMap` entries
are gone; only a **stale `MapData.json`** survives (100 fragment positions + 6 subzone polygons,
**unnamed and ungrouped**). Old frontend B data is empty. Full reconstruction is **not possible
from the current export**. If B is ever needed, recover from **an older game-export snapshot**
(still has B in its tables) or from the **backend DB** (old hand-entered B markers + S3
screenshots). Deferred — C supersedes it in live content.

## 7. Risks & open questions (for per-phase specs)

- **Coordinate transform fidelity (Phase 1a):** must reproduce the existing marker x/y space
  precisely; validate against current backend markers before trusting it. Highest technical
  risk.
- **Language mapping (Phase 1d):** target locales are **en-US, ko-KR, zh-TW, zh-CN**; confirm
  the i18next namespace layout; verify opencc zh-TW→zh-CN quality on game terms.
- **Image subset selection (Phase 1c):** determine which of the 10k+ export PNGs the frontend
  actually references (6,215 currently shipped) to avoid bloating the images repo.
- **Admin parity (Phase 2a):** ensure no webadmin moderation capability is lost in the
  shadcn rebuild.
- **Served-service topology:** the data and images HTTP services are the user's infra
  to stand up; the frontend only needs base-URL config.
```
