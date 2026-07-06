# Phase 2 — Local-Data Cutover & Data-Loss Gap Analysis

**Date:** 2026-06-27
**Context:** Phase 2 frontend rework. Step before migrating the Map module to shadcn:
cut the frontend over to **local parsed data only** (no remote/backend data), then
catalog what data is lost and how to recover it.

## 1. Cutover (done)

The frontend had two `DataMode`s (`src/utils/dataMode.ts`):
- **static** — all data from locally-served files (`public/data/**`, `public/locales/**`).
- **dynamic** — core game data from backend `/api/v1/export/...`; plus live/user features.

Only the dev script forced `dynamic`. Changed `package.json` `dev` →
`VITE_DEFAULT_DATA_MODE=static`. Production already defaults to static when the env var
is unset. **Result: all core game data now loads locally.** The mode toggle in
`TopNavbar` was already disabled.

NOTE: the feature contexts below call the backend **directly** via `computeBaseUrl()` /
`fetchWithAuth`, ignoring `DataMode` — so the mode switch does not silence them. They are
handled per-module during 2B/2E migration (see §3).

## 2. What loads from local parsed data (KEPT — classification A)

All from `public/data/**` + `public/locales/{en,zh-CN,zh-TW}/**`:

| Data | File(s) | Consumer |
|------|---------|----------|
| Maps metadata | `data/maps.yaml` | GameMapContext |
| Marker types/subtypes | `data/types.yaml` | GameMapContext |
| Markers (9 maps) | `data/markers/<map>.yaml` | MarkersContext |
| Regions (9 maps) | `data/regions/<map>.yaml` | MarkersContext |
| Classes | `data/classes.yaml` | Class/ItemDataContext |
| Items + crafting/grades/slots/tiers/types | `data/items/*.yaml` | ItemDataContext |
| Skill boards (8 classes) | `data/boards/<class>.yaml` | BoardDataContext |
| Skills / Stats | `data/skills.yaml`, `data/stats.yaml` | CharacterContext |
| Servers | `data/servers.yaml` | ServerDataContext |
| Locales | `locales/<lng>/**` | i18n |
| User map state | localStorage (`completedMarkers`, visible filters, local userMarkers) | Map contexts |

The Map module itself depends only on **maps/types/markers/regions** + localStorage →
**fully functional on local data.**

## 3. What we LOSE going local-only, and how to recover

### 3a. User-generated content — recover via **Backend (Phase 3)**; not derivable from game export
| Lost data | Endpoint(s) | Consumer | Local fallback / plan |
|-----------|-------------|----------|------------------------|
| Marker comments | `GET/POST /maps/<map>/markers/<id>/comments` | MarkerPopupContent | Hide comments UI in local build; restore via backend in Phase 3 |
| Marker feedback / community marker edits | `GET/POST/PATCH/DELETE /maps/<map>/marker_feedbacks[/<id>]` | UserMarkersContext, MarkerPopupEdit | Keep **localStorage** user markers (`aion2.userMarkers.v1`); drop backend feedback sync until Phase 3 |
| Abyss artifact occupation (crowd-sourced state) | `…/artifacts/states`, `…/artifacts/count`, `…/verify`, `…/abyss_artifact_admins/*` | LeaderboardContext, artifact admin route | Inherently live+user data → backend only. Stub/hide Leaderboard-artifact features in local build |
| Auth / users | `/auth/jwt/login`, `/auth/register`, `/auth/altcha`, `/users/me`, `/users/search` | UserContext, Altcha | Only needed to gate the above. Drop in local build |

### 3b. Live game-service data — recover via **backend proxy to the live game API**; cannot be static
| Lost data | Endpoint(s) | Consumer | Plan |
|-----------|-------------|----------|------|
| Character search | `GET /characters/search` | CharacterSearch | Live player data → needs game-API proxy. Hide/stub Character feature in local build |
| Character profile + live updates | `GET /characters/info`, `WS /characters/ws` | CharacterContext | same |
| Seasons / server matchings | `GET /seasons/`, `/seasons/<id>/server_matchings/…` | LeaderboardContext | Live season config → backend |
| Realtime artifact ratio | (artifact states/count above) | RealtimeArtifactRatio | live → backend |

### 3c. Core game data that is "remote" in dynamic mode but BELONGS local — recover via **tools (Phase 1)**
In dynamic mode markers/regions/maps/types/locales came from backend `/export`. These ARE
parsed game data and should be **static**. Two recovery gaps remain:

1. **Canonical `data/` repo is EMPTY.** The frontend currently serves the *legacy curated*
   dataset bundled in `frontend/public/data`. The intended source is the `data/` repo
   (served over HTTP / junctioned). Phase 1 `tools` must emit the frontend-schema dataset
   into `data/`, then point the frontend at it.
2. **Tools pipeline is incomplete vs the curated data.** Legacy `public/data/markers/World_L_A.yaml`
   has subtypes: `monolithMaterial`(560), `hiddenCube`(118), `seal`(61), `teleport`(61),
   `occupation`(15), `battlefield`(22), `village`(4). The new tools have re-derived only
   **monolith** (=560 monolithMaterial) + subzones/regions. The other categories
   (hiddenCube, seal, teleport, occupation, battlefield, village) are **not yet regenerated**
   → finishing Phase 1B/1C marker extraction is required before the curated `public/data`
   can be fully replaced by tools-parsed `data/`.

## 4. Recommendation / sequencing

- **Now (local-only map build):** Map module reads local data only. During the 2B Map
  rewrite, gate the backend-coupled marker features (comments, backend feedback) behind a
  capability flag (e.g. `hasBackend`) that is OFF in the local build — keep localStorage
  user markers working.
- **Leaderboard & Character routes:** treat as backend-dependent; either exclude from the
  local build or render a "requires backend" stub. Decide during their own module migration.
- **Phase 1 follow-up:** populate `data/` from tools (finish non-monolith marker categories;
  emit frontend schema) so "local parsed data" means *tools-parsed*, not legacy-curated.
- **Phase 3:** backend reconciliation restores user content (comments/feedback/uploads,
  artifact voting) and proxies live game data (character, seasons).

## Classification legend
A = static/local (from game export via tools) · B = dynamic-user (user-generated, backend) ·
C = dynamic-gamelive (live game service) · D = config/auth.
