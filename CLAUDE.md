# AION2 Interactive Map — Workspace

This folder co-locates five **independent** git repos. It is NOT a monorepo: each
sub-repo keeps its own remote and history; this root repo tracks only shared meta
(this file, `.claude/skills/`, `docs/`).

## Repos
- `frontend/` — unified map + admin app (React 19 / Vite / Tailwind / shadcn / Leaflet).
- `backend/`  — FastAPI + PostgreSQL + S3; dynamic/user data only.
- `tools/`    — Python; transforms the raw game export into `data/` + `resource/`.
- `resource/` — derived WebP image set under a `UI/` root, served over HTTP.
- `data/`     — derived parsed dataset (markers, regions, tables, locales), served over HTTP.

## Data-flow contract
Raw game export (`G:\NCSoft\Export\Exports\AION2\Content\`, Perforce later)
  --tools-->  data/ (text)        --HTTP-->  frontend
  --tools-->  resource/UI (WebP)  --HTTP-->  frontend
backend  --HTTP (auth, comments, feedback, contributors, progress, uploads, artifact voting)-->  frontend

## Coordinate transform (world → map pixels)
The game uses 3D world coords (`MapData.json` X,Y); the map PNG/tiles are an N×N pixel grid
(`tilesCount × tileSize`, e.g. World_L_A = 8192×8192). The transform is a **pure linear map**
from the map's `WorldBoundBox` to pixels, read from `Data/WorldMap/<Map>.json`
(`Min`/`Max` and `SectorSize × SectorPlaneSize` = pixel size):

```
px = (worldX - Min.X) / (Max.X - Min.X) * pixelWidth      # X → pixel-x, no flip
py = (worldY - Min.Y) / (Max.Y - Min.Y) * pixelHeight     # Y → pixel-y, no flip
```

**Orientation (verified against `World_L_A.png` 2026-06-27): `px_from=X, flip_x=False,
flip_y=False`** — i.e. the formula above as-is. Ground truth used: Eternal Isle = lower-left,
Dawn Legion Base = upper-left. This matches the raw **map image** (image Y increases downward).

**Caveat — two Y conventions, one flip apart:**
- **Map image / PNG / tiles** (this transform): `flip_y=False` (Y down). Use for drawing on the
  map PNG and for the canonical dataset emitted by `tools`.
- **Current frontend `regions.yaml` (Leaflet `CRS.Simple`, Y up):** `flip_y=True`
  (`py' = pixelHeight - py`). The 1A calibration matched this space. The Phase 2 frontend
  should standardize on the image-space (no-flip) convention to remove the discrepancy.

The orientation is expected to hold for all maps (same engine), but **re-verify per map** via
landmarks/overlay. Implementation: `tools/aion2/tools/maps/` (`WorldMapTransform`).

## Conventions
- **New features:** open a git worktree for the work (isolate from the current workspace).
- **Merging back:** integrate with rebase (not merge commits).
- **Live testing:** when work needs live testing, merge it back first (with rebase), then test.
- **Git on Windows:** bash or PowerShell both work. All repo origins are SSH
  (`git@github.com:...`); SSH works via `HOME` set in `~/.claude/settings.json` env plus
  `core.sshCommand = C:/Windows/System32/OpenSSH/ssh.exe` in the global gitconfig.
- **Dev server for verification:** a Vite dev server is often already running (default
  `http://localhost:5173`). Before asking the user to set one up, try connecting to it
  first (e.g. `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173`); also check
  nearby ports (5174+) since Vite auto-increments when 5173 is taken. Only ask the user
  to start/set up the server if nothing responds.
- **Implementation:** do all coding, design, planning, research, review, and
  verification directly. Codex delegation is disabled — do NOT delegate to Codex.

## Notes
- Frontend `UI/` assets (game tiles + marker icons) come from the `resource/` repo
  (`resource/UI/...`). Dev: a Vite middleware serves `../resource/UI` at `/UI`
  (`frontend/vite.config.ts`, `RESOURCE_UI_DIR` override). Prod: set
  `VITE_RESOURCE_BASE_URL`. The old `frontend/public/UI` junction is removed.
  Non-`UI/` assets (sidebar bg, logo, watermark) still live in `frontend/public/images`.
- Old web admin repo: `C:\Users\liuyh\WebstormProjects\aion2-interactive-map-webadmin`
  (to be ported into `frontend/` in Phase 2, then archived).

See `docs/superpowers/specs/2026-06-27-aion2-map-reconstruction-design.md` for the full design.
