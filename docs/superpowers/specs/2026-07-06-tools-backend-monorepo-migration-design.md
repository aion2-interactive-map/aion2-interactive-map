# Tools + Backend → Frontend Monorepo Migration (Design)

**Date:** 2026-07-06
**Status:** Design — pending user review, then implementation plan (writing-plans)
**Scope:** Consolidate the `tools` and `backend` repos into the `frontend` repo (the future
"main repo"), preserving full history and rewriting imported commit messages to this repo's
Conventional-Commits convention.

---

## 1. Context & goal

The workspace `E:\aion2-map` co-locates independent repos as siblings:

```
E:\aion2-map\
  frontend\   git@…/aion2-interactive-map.git          ← app; becomes the main repo
  backend\    git@…/aion2-interactive-map-backend.git   ← FastAPI service (import)
  tools\      git@…/tools.git                           ← Python data pipeline (import)
  data\ resource\ data-palworld\ resource-palworld\      ← derived artifacts (stay out)
  docs\ CLAUDE.md .claude\  (tracked by the near-empty root repo aion2-map.git)
```

**Goal:** make `frontend` the single source repo for the platform's *source* (app + API +
pipeline), so cross-cutting changes (e.g. a data-schema change in `tools` that ripples into
`frontend` types) become atomic commits instead of uncoordinated multi-repo PRs. `frontend` is
chosen as the shell because it has the gravity: 380 commits, active development, the CI/deploy
pipeline, and the `apps/`+`packages/` monorepo structure already in place. Moving the two small
Python repos into it is far less disruptive than the reverse.

## 2. Decisions (locked for this migration)

- **Shell = the `frontend` repo.** `backend/` and `tools/` become tracked **top-level
  subdirectories** of it.
- **History preserved in full.** Every `tools` (~104) and `backend` (~102) commit is kept — no
  squashing (including backend's duplicate `feat: artifact vote` runs). Only messages and file
  paths change.
- **Import mechanism = `git filter-repo` + unrelated-histories merge.** One `filter-repo` pass
  per source repo does both required transforms (move files into a subdir *and* rewrite commit
  messages); then merge each into `frontend`.
- **Commit-message rewrite = nested scopes** to match this repo's `type(scope):` convention:
  - `tools` already conforms (`feat(palworld):`) → nest under `tools`: `feat(tools/palworld):`.
  - `backend` is mostly unscoped (`feat: …`) → `feat(backend): …`.
- **Import target branch = the active branch** (`worktree-multi-game-map-platform`), not `master`.
  `master` is a stale pre-monorepo snapshot (170 commits behind, old `src/` layout); the real
  mainline and the Phase 0a `frontend/` restructure both live on the active branch, so that is the
  coherent integration point. Reconciling/promoting `master` to match is a separate follow-up
  (§7).

## 3. Deferred / out of scope (explicitly NOT done here)

- **Renaming** the repo / GitHub remote to the new brand — deferred; the repo stays
  `aion2-interactive-map` for now, referred to as "the main repo."
- **Folding the root repo's meta** (`CLAUDE.md`, `docs/`, `.claude/`) into the main repo and
  **retiring the root `aion2-map` repo** — deferred (tied to the rename).
- **Cleaning `frontend`'s 525 MB history** (the dead `public/UI` map tiles) — deferred; the main
  repo starts at its current size. Importing backend/tools does **not** touch or force-push
  `frontend` history, so this is independent.
- **Merging `data*` / `resource*`** — they remain separately-pulled, gitignored artifacts.

## 4. Target end state

The frontend is a pnpm workspace whose `apps/` and `packages/` are frontend-only. To avoid a
misleading top level (bare `apps/`+`packages/` sitting beside Python `backend/`+`tools/`), the
**whole pnpm workspace is grouped under a top-level `frontend/` dir**, so every top-level entry is
one domain:

```
frontend/        ← the pnpm workspace (was the repo root)
  apps/            aion2, palworld
  packages/        ui, map-engine, map-shell, data-contract
  package.json, pnpm-workspace.yaml, pnpm-lock.yaml, vitest.config.ts, tsconfig*
backend/         single shared FastAPI service (NOT per-game; no apps/packages split)
tools/           ← Python pipeline, reorganized to mirror frontend (see §4a)
  apps/            aion2, palworld          (per-game extractor pipelines)
  packages/        core (shared framework), backend-client
  pyproject.toml, uv.lock, README.md
.github/  LICENSE  README.md  docs/                                          ← stay at repo root
```

Both `frontend/` and `tools/` use the `apps/` (per-game) + `packages/` (shared) convention;
`backend/` is a single shared service (one FastAPI app, one DB — auth/comments/uploads/voting are
cross-game), so it is *not* split into apps/packages.

- **Moves into `frontend/`:** `apps/`, `packages/`, and the pnpm/TS config (`package.json`,
  `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `vitest.config.ts`, `tsconfig*`).
- **Stays at repo root:** `.github/` (GitHub only reads workflows from the root), `LICENSE`,
  `README.md`, and later `docs/`.
- This adds a **frontend-restructure step** (see §5.0): a plain `git mv` into `frontend/` (no
  history rewrite) plus updating `.github/workflows/deploy.yml` paths (`apps/*` → `frontend/apps/*`).
- `pnpm-workspace.yaml` moves with the workspace and still globs `apps/*`/`packages/*` (now
  relative to `frontend/`); `backend/` and `tools/` remain outside it, so pnpm ignores them.
- Nested `backend/.gitignore` and `tools/.gitignore` come along and keep working (git honors
  nested ignore files), so Python caches/venvs never enter the tree.

> Reversible: if the CI churn isn't wanted now, drop the `frontend/` grouping and keep `apps/`+
> `packages/` at the repo root; `backend/`+`tools/` still import as top-level siblings.
- The old sibling working dirs `E:\aion2-map\backend` and `E:\aion2-map\tools` are retired
  (their tracked source now lives inside the main repo; their large *untracked* working files —
  raw exports, venvs — are unaffected and can be relocated/regenerated as needed).
- Old `backend` and `tools` GitHub remotes are archived after verification.

## 4a. `tools/` reorganization (apps/packages)

`tools` is currently a single hatchling package (`aion2-tools`, `packages = ["aion2","palworld"]`)
with a shared framework dir literally named `tools/`. It is regrouped to mirror `frontend`:

| now | → | after |
|-----|---|-------|
| `aion2/` | → | `apps/aion2/` |
| `palworld/` | → | `apps/palworld/` |
| `tools/` (shared framework) | → | `packages/core/` (also removes the awkward `tools/tools/`) |
| `aion2-interactive-map-backend-client/` | → | `packages/backend-client/` |
| `data_src/`, `parsed_data/`, `tests/` | → | co-located with their owner (mostly `apps/aion2/`) |

- **Packaging choice = light (one package, regrouped dirs)**, not a uv workspace. Keep the single
  `aion2-tools` package; `apps/`/`packages/` are directory groupings. Imports become
  `apps.aion2.*` / `packages.core.*`; update `[tool.hatch.build.targets.wheel] packages`, the
  ~64 `from aion2|palworld|tools` imports, and the `python -m aion2.tools.…` commands in
  `README.md`. Verify with `uv run pytest`. (A true uv-workspace split is a heavier future option,
  deferred.)
- **Naming:** `apps/` (per-game *extractor pipelines*) is used for cross-repo consistency with
  frontend; `games/` would be semantically truer — open to either.
- **Commit scopes stay `tools/<game>`** (e.g. `feat(tools/palworld):`), not `tools/apps/palworld`,
  matching how frontend scopes read.
- Done as a tested commit in the `tools` repo **before** import (Phase 0b), so the
  `--to-subdirectory-filter tools` pass lands it directly as `tools/apps/…`, `tools/packages/…`.

## 5. Migration mechanics

All history rewriting/merging happens on **throwaway clones**, never the live working copies, so
the two live `frontend` worktrees are never disrupted. The one exception is the frontend
restructure (Phase 0a), which is a normal commit on the active branch.

### Phase 0a — Restructure frontend into `frontend/` (active branch; normal commit)
Done on the **active branch** (`worktree-multi-game-map-platform`) — that's where `apps/`+
`packages/` live; `master` is the stale pre-monorepo layout and does not get this move.
1. `git mv` the pnpm workspace into `frontend/`: `apps/`, `packages/`, `package.json`,
   `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `vitest.config.ts`, `tsconfig*` → `frontend/…`.
   Keep `.github/`, `LICENSE`, `README.md`, `.gitignore` at the repo root.
2. Update `.github/workflows/deploy.yml` paths/`working-directory`: `apps/*` → `frontend/apps/*`
   (and any `pnpm --filter` cwd assumptions).
3. Smoke-test: `cd frontend && pnpm install && pnpm build:aion2` (and palworld) still work.
Commit as `refactor(repo): nest pnpm workspace under frontend/` **and push** — the Phase 0 import
clone branches from this.

### Phase 0b — Reorganize `tools` into apps/packages (in the `tools` repo; tested commit)
Done in the **`tools` repo** before import, so the Phase 1 `--to-subdirectory-filter tools` pass
lands the new shape directly (see §4a for the mapping).
1. `git mv` per-game dirs under `apps/` and the shared framework/client under `packages/`.
2. Rewrite imports (`from aion2.`→`from apps.aion2.`, `from tools.`→`from packages.core.`, etc.),
   update `[tool.hatch.build.targets.wheel] packages`, and the `python -m …` commands in `README.md`.
3. Verify: `uv run pytest` passes; a sample pipeline runs (`python -m apps.aion2.tools.maps.emit_frontend --map World_L_A`).
Commit (e.g. `refactor: reorganize into apps/packages`) **and push** — Phase 1 clones this.

### Phase 0 — Prep
1. Install the tool: `pip install git-filter-repo` (verify `git filter-repo --version`).
2. Fresh clones into a scratch dir (e.g. `E:\aion2-map\_migrate\`):
   - `git clone git@github.com:aion2-interactive-map/tools.git tools-import`
   - `git clone git@github.com:aion2-interactive-map/aion2-interactive-map-backend.git backend-import`
   - `git clone git@github.com:aion2-interactive-map/aion2-interactive-map.git main-import` (the shell)
3. Confirm `git -C main-import ls-tree master` has no `backend/` or `tools/` path (verified today: 0).

### Phase 1 — Rewrite each source (subdir move + message rescope)
Run inside each `*-import` clone. `--to-subdirectory-filter` moves every file under the subdir;
`--message-callback` rescopes the subject line (rules in §6):

```
cd tools-import
git filter-repo --to-subdirectory-filter tools --message-callback "$(cat ../rescope-tools.py)"

cd ../backend-import
git filter-repo --to-subdirectory-filter backend --message-callback "$(cat ../rescope-backend.py)"
```

(`filter-repo` drops the `origin` remote as a safety measure — expected; we add these clones as
local remotes in Phase 2.)

### Phase 2 — Merge imports into the active branch (on the clone)
The Phase 0 clone already carries the active branch **with the Phase 0a `frontend/` restructure**
(pushed first). Merge the two rewritten sources onto it:
```
cd main-import
git checkout worktree-multi-game-map-platform
git remote add tools-import   ../tools-import   && git fetch tools-import
git remote add backend-import ../backend-import && git fetch backend-import
git merge --allow-unrelated-histories tools-import/master \
  -m "chore(repo): import tools/ pipeline history into the monorepo"
git merge --allow-unrelated-histories backend-import/master \
  -m "chore(repo): import backend/ service history into the monorepo"
```
Paths don't overlap (`backend/**`, `tools/**` vs `frontend/**`), so both merges are conflict-free.
Result: the active branch gains `backend/` + `tools/` as tracked top-level subdirs, with full
rewritten history joined via two merge commits.

### Phase 3 — Verify (before anything is pushed) — see §8.

### Phase 4 — Publish + reconcile the live workspace
1. Push the clone's active branch: `git push origin worktree-multi-game-map-platform`. **Normal
   (non-force) push** — the branch only gained descendant commits; no history is rewritten.
2. In the live `E:\aion2-map\frontend` worktree (already on the active branch), `git pull --ff-only`
   to receive `backend/` + `tools/`.
3. Retire the old sibling dirs once their content is confirmed inside the main repo:
   remove `E:\aion2-map\backend` and `E:\aion2-map\tools` (tracked source is now at top-level
   `backend/`, `tools/` in the main repo).

### Phase 5 — Retire sources (after you're confident)
- Archive the `tools` and `backend` GitHub repos (read-only), like the old webadmin repo.
- Update `E:\aion2-map\CLAUDE.md`'s repo list to reflect the consolidation.

## 6. Commit-message rewrite rules

Transform only the **subject line**; leave the body untouched. Match the Conventional-Commits
shape `type(scope)!: subject` and nest the subsystem into the scope.

**`rescope-tools.py`** (tools already conforms; nest under `tools/`):
```python
import re
m = re.match(r'^(\w+)(?:\(([^)]*)\))?(!)?: (.*)$', message.split(b'\n',1)[0].decode('utf-8','surrogateescape'))
# feat(palworld): …        -> feat(tools/palworld): …
# feat(palworld/types): …  -> feat(tools/palworld/types): …
# feat: …                  -> feat(tools): …
# <non-conventional>       -> chore(tools): <original>
```

**`rescope-backend.py`** (mostly unscoped; set scope to `backend`):
```python
# feat: artifact vote      -> feat(backend): artifact vote
# chore(markers): …        -> chore(backend/markers): …
# <non-conventional>       -> chore(backend): <original>
```

(The `.py` files implement the full read-first-line / transform / re-encode logic; the regex
above is the core. Multi-line bodies and merge commits keep their body verbatim.)

**Sample transforms (real commits):**

| repo | before | after |
|------|--------|-------|
| tools | `feat(palworld): catalog extractor for items…` | `feat(tools/palworld): catalog extractor for items…` |
| tools | `refactor(palworld): port extractor from JS to Python` | `refactor(tools/palworld): port extractor from JS to Python` |
| backend | `feat: season matching order` | `feat(backend): season matching order` |
| backend | `chore(markers): flag user-uploaded marker type` | `chore(backend/markers): flag user-uploaded marker type` |
| backend | `chore: add uv lockfile and pin python 3.13` | `chore(backend): add uv lockfile and pin python 3.13` |

## 7. Branch strategy: the active branch is the mainline; `master` is stale

`master` (89ce398) is the pre-multi-game structure (old `src/` layout); the live branch
`worktree-multi-game-map-platform` is 170 commits ahead and holds the `apps/`+`packages/` monorepo.
Because both the Phase 0a `frontend/` restructure and the real product live on the active branch,
the migration lands there:
- **Phase 0a** (nest into `frontend/`) and **Phase 2** (merge imported `backend/`+`tools/`) both
  target the active branch. The imports are path-orthogonal (`backend/**`, `tools/**`), so they
  don't touch `frontend/**`.
- **`master` reconciliation is a separate follow-up:** once the active branch is validated it
  should be promoted to `master` (fast-forward/merge or a decision to make it the new default),
  after which the stale `master` layout is retired. This is deferred out of this migration to keep
  scope tight, but is the intended end-state.
- Other stale branches (`phase2/map-rebuild`) are not updated; they predate the monorepo.

## 8. Verification checklist (gate before push)

Run against `main-import` after Phase 2:
- **Messages rescoped:** `git log --oneline -- tools | head` shows `…(tools/…)`; `… -- backend | head`
  shows `…(backend…)`. No bare `feat:`/`fix:` remain in imported commits.
- **Content byte-identical to source HEADs:**
  `git diff tools-import/master:tools <tools-orig-HEAD tree>` is empty; same for backend.
  (Equivalent: compare `git ls-tree -r` checksums of `tools/` vs the original tools repo root.)
- **File counts match:** `git ls-files tools | wc -l` == original tools tracked count;
  `git ls-files backend | wc -l` == original backend tracked count.
- **History preserved:** `git rev-list --count tools-import/master` ≈ 104;
  `… backend-import/master` ≈ 102; both ancestries reachable from the active branch tip.
- **No collateral:** diffing the pre-import tip (post-Phase-0a) against the post-import tip touches
  only `backend/**`, `tools/**`, and the two merge commits — nothing under `frontend/**`.
- **App still builds** from the merged tree (install + `vite build` / typecheck) as a smoke test.

## 9. Rollback

- **Phase 0a (restructure):** a normal commit — `git revert` it (or reset the active branch) if the
  `frontend/` grouping needs undoing.
- **Before the import push:** discard the clone (`main-import`); the live repo only carries the
  revertable Phase 0a commit.
- **After the import push, before retiring sources:** `git revert -m 1 <merge-commit>` for each
  import (keeps history, removes the subtrees), or reset the active branch to its pre-import commit
  and force-push *that branch only* if no one else has pulled. The `backend`/`tools` repos still
  exist independently, so a re-import is always possible.

## 10. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| `filter-repo` run on a dirty/non-fresh repo mangles it | Only ever run on fresh throwaway clones |
| Live worktrees disrupted | All surgery on clones; live repos only do a normal `merge origin/master` |
| Message callback misfires on odd commits | Fallback wraps any non-conventional subject as `chore(scope): <original>`; verify §8 before push |
| Confusion from duplicate content (sibling dirs vs new subdirs) | Retire `E:\aion2-map\backend` + `\tools` in Phase 4.3 once verified |
| Big untracked working files (tools 615 MB, backend 118 MB) | Not in git; import only moves *tracked* source — stays lightweight |

## 11. Open items (deferred, tracked for later)

- Choose the new brand name and rename repo + remote (Chinese-first + CN-friendly English; see
  naming discussion).
- Fold root meta into the main repo; retire the root `aion2-map` repo.
- Clean `frontend`'s 525 MB history (dead `public/UI` tiles) — separate history-rewrite task.
