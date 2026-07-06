# Tools + Backend Monorepo Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the `tools` and `backend` repos into the `frontend` repo (the future "main repo") as top-level `tools/` and `backend/`, preserving full history and rewriting imported commit messages to this repo's `type(scope):` convention — while first regrouping `frontend` and `tools` under the `apps/`+`packages/` convention.

**Architecture:** History-preserving import via `git filter-repo` (one pass per source repo: `--to-subdirectory-filter` to move files + `--message-callback` to rescope subjects) followed by `git merge --allow-unrelated-histories` onto the active branch. All history surgery happens on throwaway clones; the two live `frontend` worktrees are only touched by ordinary commits/pulls. No force-push; `frontend`'s existing 525 MB history is untouched (clean deferred).

**Tech Stack:** git, `git-filter-repo` (Python), pnpm (frontend workspace), uv + hatchling (tools), Git Bash on Windows.

**Spec:** `docs/superpowers/specs/2026-07-06-tools-backend-monorepo-migration-design.md`

**Environment (verified 2026-07-06):**
- Workspace root: `/e/aion2-map`
- `frontend`: `/e/aion2-map/frontend` — remote `git@github.com:aion2-interactive-map/aion2-interactive-map.git`; active branch `worktree-multi-game-map-platform` (170 commits ahead of stale `master`). Two worktrees: main `/e/aion2-map/frontend`, plus `/e/aion2-map/frontend/.claude/worktrees/multi-game-map-platform` (`worktree-shared-shell`).
- `backend`: `/e/aion2-map/backend` — remote `…/aion2-interactive-map-backend.git` (~102 commits).
- `tools`: `/e/aion2-map/tools` — remote `…/tools.git` (~104 commits).
- Scratch dir for clones: `/e/aion2-map/_migrate/`

**Global rules for the executor:**
- Run commands from Git Bash. Use the exact `git -C <path>` or `cd` targets shown.
- After each task's commit, stop for review (subagent-driven) before the next task.
- Never run `git filter-repo` in a live working copy — only in the `_migrate` clones.
- Do NOT force-push anything in this plan.

---

## Task 1: Restructure `frontend` into `frontend/` (Phase 0a)

Nest the whole pnpm workspace under a top-level `frontend/` dir so the monorepo top level reads as domains (`frontend/`, `backend/`, `tools/`). Done live on the active branch (ordinary commit).

**Files:**
- Move: `apps/`, `packages/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `vitest.config.ts` → under `frontend/`
- Keep at root: `.github/`, `.gitignore`, `.gitattributes`, `LICENSE`, `README.md`
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Confirm clean tree on the active branch**

Run:
```bash
cd /e/aion2-map/frontend
git rev-parse --abbrev-ref HEAD   # expect: worktree-multi-game-map-platform
git status --porcelain            # expect: empty
```
Expected: branch is `worktree-multi-game-map-platform`, no output from status.

- [ ] **Step 2: Move the pnpm workspace under `frontend/`**

Run:
```bash
cd /e/aion2-map/frontend
mkdir frontend
git mv apps frontend/apps
git mv packages frontend/packages
git mv package.json pnpm-lock.yaml pnpm-workspace.yaml vitest.config.ts frontend/
git status --short   # expect: renames R apps/... -> frontend/apps/... etc.
```
Expected: all listed paths show as renames into `frontend/`.

- [ ] **Step 3: Update `.github/workflows/deploy.yml` for the new paths**

Replace the `Setup Node`, `Install dependencies`, `Build`, and `Deploy` steps so they run inside `frontend/`:
```yaml
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml

      - name: Install dependencies
        working-directory: frontend
        run: pnpm install --frozen-lockfile

      - name: Build
        working-directory: frontend
        run: pnpm --filter aion2 build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/apps/aion2/dist
          publish_branch: gh-pages
```
(Note: `deploy.yml` triggers only on push to `master`, so this takes effect when `master` is promoted — deferred §7. `package.json` scripts need no change: they run relative to `package.json`, which moved with them.)

- [ ] **Step 4: Smoke-test the workspace still builds**

Run:
```bash
cd /e/aion2-map/frontend/frontend
pnpm install
pnpm --filter aion2 build
pnpm --filter palworld build
```
Expected: install resolves, both builds complete without path/module errors.

- [ ] **Step 5: Commit and push**

```bash
cd /e/aion2-map/frontend
git add -A
git commit -m "refactor(repo): nest pnpm workspace under frontend/"
git push origin worktree-multi-game-map-platform
```
Expected: commit created; push succeeds (non-force).

---

## Task 2: Reorganize `tools` into apps/packages (Phase 0b)

Regroup the `tools` repo so per-game pipelines live under `apps/` and shared code under `packages/`, mirroring `frontend`. Done as a tested commit **in the `tools` repo** so the later import lands the new shape directly. Single hatchling package retained (light packaging).

**Files (in `/e/aion2-map/tools`):**
- Move: `aion2/` → `apps/aion2/`; `palworld/` → `apps/palworld/`; `tools/` → `packages/core/`; `aion2-interactive-map-backend-client/` → `packages/backend-client/`
- Create: `apps/__init__.py`, `packages/__init__.py`
- Keep at tools root (this pass): `data_src/`, `parsed_data/`, `tests/` (data/config referenced by path — relocating deferred to avoid breaking loads)
- Modify: `pyproject.toml`, `README.md`, and all `*.py` imports

- [ ] **Step 1: Confirm clean tree**

Run:
```bash
cd /e/aion2-map/tools
git rev-parse --abbrev-ref HEAD   # expect: master
git status --porcelain            # expect: empty (ignore untracked .venv/ etc. — they are gitignored)
```
Expected: on `master`, no tracked changes.

- [ ] **Step 2: Move packages into apps/ and packages/**

Run:
```bash
cd /e/aion2-map/tools
mkdir apps packages
git mv aion2 apps/aion2
git mv palworld apps/palworld
git mv tools packages/core
git mv aion2-interactive-map-backend-client packages/backend-client
printf '' > apps/__init__.py
printf '' > packages/__init__.py
git add apps/__init__.py packages/__init__.py
```
Expected: four renames staged plus two new `__init__.py`.

- [ ] **Step 3: Rewrite imports across all tracked Python files**

Run (Git Bash; edits tracked `.py` files in place):
```bash
cd /e/aion2-map/tools
git ls-files '*.py' | while read -r f; do
  sed -i \
    -e 's/\bfrom aion2\./from apps.aion2./g' \
    -e 's/\bfrom aion2 import/from apps.aion2 import/g' \
    -e 's/\bfrom palworld\./from apps.palworld./g' \
    -e 's/\bfrom palworld import/from apps.palworld import/g' \
    -e 's/\bfrom tools\./from packages.core./g' \
    -e 's/\bfrom tools import/from packages.core import/g' \
    "$f"
done
# Fix the single bare `import tools` (grep to locate, then edit by hand):
grep -rn '^\s*import tools\b' $(git ls-files '*.py')
```
Then edit each `import tools` hit to `from packages import core as tools` (preserves the `tools.` usages in that file).
Expected: sed runs clean; the grep shows the one (or few) bare-import sites to hand-edit.

- [ ] **Step 4: Update `pyproject.toml`**

Change the wheel packages and the editable client path:
```toml
[tool.uv.sources]
aion2-interactive-map-backend-client = { path = "packages/backend-client", editable = true }

[tool.hatch.build.targets.wheel]
packages = ["apps", "packages"]
```
Expected: `packages = ["apps", "packages"]`; client source path points at `packages/backend-client`.

- [ ] **Step 5: Update `README.md` run commands**

Run:
```bash
cd /e/aion2-map/tools
sed -i 's/python -m aion2\./python -m apps.aion2./g; s/python -m palworld\./python -m apps.palworld./g' README.md
```
Expected: README `python -m aion2.tools.…` becomes `python -m apps.aion2.tools.…`.

- [ ] **Step 6: Install and run tests; fix stragglers until green**

Run:
```bash
cd /e/aion2-map/tools
uv sync
uv run pytest -q
```
Expected: tests pass. If failures remain, they will be (a) missed imports — re-scan with `grep -rn 'aion2\.\|palworld\.\|tools\.' $(git ls-files '*.py')` and fix, or (b) data-file path references — adjust the path or move the referenced `data_src`/`parsed_data` subdir under the owning app. Re-run until green.

- [ ] **Step 7: Sample a real pipeline run**

Run:
```bash
cd /e/aion2-map/tools
uv run python -m apps.aion2.tools.maps.emit_frontend --map World_L_A
```
Expected: completes without import/path errors (same behavior as before the move).

- [ ] **Step 8: Commit and push**

```bash
cd /e/aion2-map/tools
git add -A
git commit -m "refactor: reorganize into apps/packages"
git push origin master
```
Expected: commit created; push succeeds. (This commit's message gets rescoped to `refactor(tools): …` during import, Task 4.)

---

## Task 3: Prep — install filter-repo and make clones (Phase 0)

**Files:** none in-repo; creates `/e/aion2-map/_migrate/`.

- [ ] **Step 1: Install git-filter-repo**

Run:
```bash
pip install git-filter-repo
git filter-repo --version
```
Expected: prints a version (e.g. `git-filter-repo 2.x`). If `git filter-repo` isn't found, ensure the Python `Scripts/` dir is on PATH.

- [ ] **Step 2: Fresh clones into the scratch dir**

Run:
```bash
mkdir -p /e/aion2-map/_migrate
cd /e/aion2-map/_migrate
git clone git@github.com:aion2-interactive-map/tools.git tools-import
git clone git@github.com:aion2-interactive-map/aion2-interactive-map-backend.git backend-import
git clone git@github.com:aion2-interactive-map/aion2-interactive-map.git main-import
```
Expected: three clones. `tools-import` includes the Task 2 reorg commit; `main-import` includes the Task 1 restructure commit on `worktree-multi-game-map-platform`.

- [ ] **Step 3: Confirm no path collisions in the shell repo**

Run:
```bash
cd /e/aion2-map/_migrate/main-import
git checkout worktree-multi-game-map-platform
git ls-tree -r --name-only HEAD | grep -cE '^(backend|tools)/'
```
Expected: `0` (no existing `backend/` or `tools/` paths — imports won't conflict).

---

## Task 4: Rewrite each source (subdir move + message rescope) (Phase 1)

Create the two message-rewrite callbacks, then run `git filter-repo` once per source clone.

**Files:** Create `/e/aion2-map/_migrate/rescope-tools.py`, `/e/aion2-map/_migrate/rescope-backend.py`.

- [ ] **Step 1: Write `rescope-tools.py`** (the callback *body*; `message` is bytes, must `return` bytes)

Create `/e/aion2-map/_migrate/rescope-tools.py`:
```python
import re
first, sep, rest = message.partition(b"\n")
subject = first.decode("utf-8", "surrogateescape")
if subject.startswith("Merge "):
    result = message
else:
    m = re.match(r"^([a-zA-Z]+)(?:\(([^)]*)\))?(!)?: (.*)$", subject)
    if m:
        typ, scope, bang, desc = m.group(1), m.group(2), m.group(3) or "", m.group(4)
        newscope = "tools/" + scope if scope else "tools"
        subject = f"{typ}({newscope}){bang}: {desc}"
    else:
        subject = "chore(tools): " + subject
    result = subject.encode("utf-8", "surrogateescape") + sep + rest
return result
```

- [ ] **Step 2: Write `rescope-backend.py`**

Create `/e/aion2-map/_migrate/rescope-backend.py`:
```python
import re
first, sep, rest = message.partition(b"\n")
subject = first.decode("utf-8", "surrogateescape")
if subject.startswith("Merge "):
    result = message
else:
    m = re.match(r"^([a-zA-Z]+)(?:\(([^)]*)\))?(!)?: (.*)$", subject)
    if m:
        typ, scope, bang, desc = m.group(1), m.group(2), m.group(3) or "", m.group(4)
        newscope = "backend/" + scope if scope else "backend"
        subject = f"{typ}({newscope}){bang}: {desc}"
    else:
        subject = "chore(backend): " + subject
    result = subject.encode("utf-8", "surrogateescape") + sep + rest
return result
```

- [ ] **Step 3: Rewrite `tools-import` (move under `tools/` + rescope)**

Run:
```bash
cd /e/aion2-map/_migrate/tools-import
git filter-repo --to-subdirectory-filter tools --message-callback "$(cat ../rescope-tools.py)"
```
Expected: filter-repo reports rewriting ~104 commits; working tree now has everything under `tools/` (e.g. `tools/apps/aion2`, `tools/packages/core`). (filter-repo removes `origin` — expected.)

- [ ] **Step 4: Verify tools rewrite**

Run:
```bash
cd /e/aion2-map/_migrate/tools-import
git log --oneline -5
git ls-tree --name-only HEAD | head
```
Expected: subjects read `feat(tools/palworld): …`, `refactor(tools): reorganize into apps/packages`, etc.; top-level tree is just `tools/`.

- [ ] **Step 5: Rewrite `backend-import` (move under `backend/` + rescope)**

Run:
```bash
cd /e/aion2-map/_migrate/backend-import
git filter-repo --to-subdirectory-filter backend --message-callback "$(cat ../rescope-backend.py)"
git log --oneline -5
```
Expected: ~102 commits rewritten; subjects read `feat(backend): season matching order`, `chore(backend): add uv lockfile …`; top-level tree is just `backend/`.

---

## Task 5: Merge imports into the active branch (Phase 2)

Done on `main-import` (the shell clone), on the active branch.

**Files:** none created; adds `backend/` + `tools/` to the tree via two merge commits.

- [ ] **Step 1: Add the rewritten clones as remotes and fetch**

Run:
```bash
cd /e/aion2-map/_migrate/main-import
git checkout worktree-multi-game-map-platform
git remote add tools-import   ../tools-import   && git fetch tools-import
git remote add backend-import ../backend-import && git fetch backend-import
```
Expected: both fetches succeed.

- [ ] **Step 2: Merge tools history (unrelated histories)**

Run:
```bash
cd /e/aion2-map/_migrate/main-import
git merge --allow-unrelated-histories tools-import/master \
  -m "chore(repo): import tools/ pipeline history into the monorepo"
```
Expected: merge completes with no conflicts (paths are disjoint); `tools/` now present.

- [ ] **Step 3: Merge backend history (unrelated histories)**

Run:
```bash
cd /e/aion2-map/_migrate/main-import
git merge --allow-unrelated-histories backend-import/master \
  -m "chore(repo): import backend/ service history into the monorepo"
```
Expected: merge completes with no conflicts; `backend/` now present.

---

## Task 6: Verify before publishing (Phase 3)

Gate. Do NOT push until every check passes. Run in `/e/aion2-map/_migrate/main-import`.

- [ ] **Step 1: Messages rescoped**

Run:
```bash
git log --oneline -- tools | head
git log --oneline -- backend | head
git log --oneline -- tools backend | grep -E '^\w+ (feat|fix|chore|refactor|docs): ' && echo "FOUND UNSCOPED" || echo "all scoped"
```
Expected: tools subjects show `…(tools/…)` / `…(tools)`; backend show `…(backend…)`; final line prints `all scoped`.

- [ ] **Step 2: Content byte-identical to source HEADs**

Run:
```bash
cd /e/aion2-map/_migrate/main-import
git ls-tree -r HEAD:tools | awk '{print $3, $4}' | sort > /tmp/tools_new.txt
git -C /e/aion2-map/_migrate/tools-import ls-tree -r HEAD:tools | awk '{print $3, $4}' | sort > /tmp/tools_ref.txt
diff /tmp/tools_new.txt /tmp/tools_ref.txt && echo "tools OK"
# backend:
git ls-tree -r HEAD:backend | awk '{print $3,$4}' | sort > /tmp/be_new.txt
git -C /e/aion2-map/_migrate/backend-import ls-tree -r HEAD:backend | awk '{print $3,$4}' | sort > /tmp/be_ref.txt
diff /tmp/be_new.txt /tmp/be_ref.txt && echo "backend OK"
```
Expected: both diffs empty; prints `tools OK` and `backend OK` (blob hashes + paths identical).

- [ ] **Step 3: History preserved**

Run:
```bash
git rev-list --count tools-import/master     # expect ~104
git rev-list --count backend-import/master   # expect ~102
```
Expected: counts match the source repos (both ancestries now reachable from the active branch tip).

- [ ] **Step 4: No collateral to frontend**

Run:
```bash
cd /e/aion2-map/_migrate/main-import
git diff --stat origin/worktree-multi-game-map-platform HEAD -- ':!backend' ':!tools'
```
Expected: empty (the only path changes vs the pushed active branch are under `backend/` and `tools/`; nothing under `frontend/`).

- [ ] **Step 5: App still builds from the merged tree**

Run:
```bash
cd /e/aion2-map/_migrate/main-import/frontend
pnpm install
pnpm --filter aion2 build
```
Expected: builds clean (sanity that the merge didn't disturb `frontend/`).

---

## Task 7: Publish + reconcile the live workspace (Phase 4)

- [ ] **Step 1: Push the active branch (normal, non-force)**

Run:
```bash
cd /e/aion2-map/_migrate/main-import
git push origin worktree-multi-game-map-platform
```
Expected: succeeds; branch only gained descendant commits.

- [ ] **Step 2: Fast-forward the live worktree**

Run:
```bash
cd /e/aion2-map/frontend
git pull --ff-only
ls backend tools   # expect the imported trees present
```
Expected: fast-forward pulls `backend/` and `tools/` into the live checkout.

- [ ] **Step 3: Retire the old sibling working dirs**

Verify content is now inside the main repo, then remove the standalone repos:
```bash
git -C /e/aion2-map/frontend ls-files backend | head    # non-empty
git -C /e/aion2-map/frontend ls-files tools   | head    # non-empty
rm -rf /e/aion2-map/backend /e/aion2-map/tools
```
Expected: files confirmed tracked inside the main repo; old sibling dirs removed. (Their large *untracked* working files — raw exports, venvs — are gone with them; regenerate/relocate as needed.)

---

## Task 8: Retire sources + update workspace docs (Phase 5)

- [ ] **Step 1: Archive the old GitHub remotes**

On GitHub, mark `aion2-interactive-map/tools` and `aion2-interactive-map/aion2-interactive-map-backend` as **archived** (read-only). Do this only after Task 6 passed and Task 7 is pushed.

- [ ] **Step 2: Update the workspace `CLAUDE.md` repo list**

In `/e/aion2-map/CLAUDE.md`, update the "Repos" section to reflect that `backend/` and `tools/` now live inside the main repo (no longer independent siblings). Commit in the root repo:
```bash
cd /e/aion2-map
git add CLAUDE.md
git commit -m "docs: fold tools + backend into the main repo (monorepo migration)"
```
Expected: root repo records the consolidation.

- [ ] **Step 3: Clean up scratch**

```bash
rm -rf /e/aion2-map/_migrate
```

---

## Deferred (NOT in this plan — see spec §3, §7)

- Renaming the repo/remote to the new brand; folding root meta into the main repo and retiring the root `aion2-map` repo.
- Promoting the active branch to `master` (which activates the updated `deploy.yml`) and retiring the stale `master` layout.
- Cleaning `frontend`'s 525 MB history (dead `public/UI` tiles).
- Optional: co-locating `tools` `data_src/`/`parsed_data/`/`tests/` under their owning app; a true uv-workspace split of `tools`.

## Rollback

- **Before Task 7 push:** delete `/e/aion2-map/_migrate` — live repos untouched.
- **After push, before archiving:** `git revert -m 1 <merge-commit>` for each import to remove the subtrees while keeping history; sources still exist as their own repos, so re-import is always possible.
- **Task 1/Task 2 commits** are ordinary commits on their branches — revert normally if needed.
