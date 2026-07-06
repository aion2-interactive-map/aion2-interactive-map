# Bootstrapping the AION2 Map workspace on a new PC

This repo (`aion2-map`) is the **workspace root**. It tracks only shared meta
(`CLAUDE.md`, `docs/`, `.claude/`, `.mcp.json`, this file). The five working
repos live as sibling folders **inside** this directory and are each their own
independent git repo (gitignored here — see `.gitignore`).

On a new machine you clone **only this repo**, then run the steps below (or hand
this file to Claude and say "set up this workspace"). Everything else is derived.

```
aion2-map/            ← this repo (clone first)
├── frontend/         ← React/Vite app
├── backend/          ← FastAPI + Postgres + S3
├── tools/            ← Python; raw game export → data/ + resource/
├── resource/         ← derived WebP image set (UI/ root), served over HTTP
└── data/             ← derived parsed dataset, served over HTTP
```

## 0. Prerequisites

Install and have on PATH:

- **git** and **GitHub CLI** (`gh`), authenticated to the `aion2-interactive-map`
  org: `gh auth login` then verify `gh auth status`. The org's repos are private,
  so the token needs `repo` scope.
- **Node** (for `frontend/`) + **pnpm** (or npm — check `frontend/package.json`).
- **Python 3.11+** and **uv** (for `backend/` and `tools/`).
- **The raw game export** (UE5 `Content/`) somewhere local — e.g.
  `G:\NCSoft\Export\Exports\AION2\Content`. Path differs per machine; you set it
  in `tools/.env` (step 2). Perforce-managed later.
- Secret values for `.env` files (DB password, S3 keys, backend login) — bring
  them from the previous machine / password manager. They are **not** in git.

## 1. Clone the five sub-repos into this folder

Run from the workspace root (the directory containing this file). All repos are
under the `aion2-interactive-map` org.

```bash
gh repo clone aion2-interactive-map/aion2-interactive-map         frontend
gh repo clone aion2-interactive-map/aion2-interactive-map-backend backend
gh repo clone aion2-interactive-map/tools                         tools
gh repo clone aion2-interactive-map/resource                     resource
gh repo clone aion2-interactive-map/data                         data
```

Note:
- The `frontend` and `backend` repos still use long slugs above; they are slated
  to be renamed to `frontend` / `backend`. If a clone 404s, the rename happened —
  use `gh repo clone aion2-interactive-map/frontend frontend` (and `…/backend backend`).
- Active branches: **frontend → `phase2/map-rebuild`**, others → `master`. After
  cloning, `cd frontend && git checkout phase2/map-rebuild`.

## 2. Create the `.env` files (copy from the committed `.env.example`)

Each repo has a credential-free `.env.example`. `.env` is gitignored everywhere.

```bash
cp frontend/.env.example frontend/.env   # works as-is for local dev
cp backend/.env.example  backend/.env    # fill in real secrets
cp tools/.env.example    tools/.env      # set RAW_DATA_PATH + backend login
```

Fill in:
- **`backend/.env`** — `POSTGRES_PASSWORD`, `S3_BUCKET`, `S3_USERNAME`,
  `S3_PASSWORD`, `S3_PUBLIC_URL` (real values from the previous machine).
- **`tools/.env`** — `RAW_DATA_PATH` = this machine's path to the game export
  `Content/` folder; `AION2_BACKEND_USERNAME` / `AION2_BACKEND_PASSWORD` =
  backend login used by the upload/sync tools. `FRONTEND_ROOT` defaults to
  `../frontend` and normally needs no change.
- **`frontend/.env`** — no secrets; defaults point at local dev. Adjust
  `VITE_API_BASE_URL` only if the backend runs elsewhere.

## 3. Install dependencies

```bash
# frontend
cd frontend && pnpm install   # or: npm install
cd ..

# backend
cd backend && uv sync
cd ..

# tools  (pulls in the editable aion2-interactive-map-backend-client path dep)
cd tools && uv sync
cd ..
```

`resource/` and `data/` are static asset repos — no install step.

## 4. How dev serving wires together (no extra config needed)

In dev, `frontend/vite.config.ts` proxies sibling repos by **relative** path:
- `/UI`   → `../resource/UI`   (override: `RESOURCE_UI_DIR`)
- `/data` → `../data`          (override: `DATA_DIR`)

So as long as the five repos sit side-by-side in this workspace, the frontend
finds game tiles, marker icons, and the parsed dataset automatically. In prod the
frontend reads `VITE_RESOURCE_BASE_URL` / `VITE_DATA_BASE_URL` instead.

## 5. Run

```bash
# backend  (defaults to port 9000)
cd backend && uv run <your run command — see backend README>

# frontend  (per game: dev:aion2 / dev:palworld)
cd frontend && pnpm dev:aion2
```

## Notes for whoever (or whatever) runs this

- `tools/` on GitHub is **source-only** (the `aion2` Python package + the editable
  backend client). The raw game export, parsed datasets, region overlays, and
  scratch files are gitignored — they are local inputs or regenerable outputs, not
  source. Generate datasets by running the tools against your local game export.
- Never commit a real `.env`; they are gitignored in every repo. Only the
  `.env.example` templates are tracked.
- See `CLAUDE.md` for the data-flow contract and the world→map coordinate transform.
