# Phase 0 — Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Co-locate the AION2 repos under `G:\NCSoft\aion2-map\` as a workspace, split the 190 MB game-image set out of the frontend, and create the empty `data`/`images` repos — without losing any uncommitted work or breaking the frontend dev build.

**Architecture:** The root folder becomes a lightweight *workspace* git repo that `.gitignore`s its nested repos (which stay fully independent with their own remotes/histories). The frontend's `public/UI` WebP set is physically moved into the new `images` repo and surfaced back into the frontend via a Windows directory **junction**, so `getStaticUrl("UI/...")` keeps resolving with zero code changes. Switching `UI/` to a separate served image-service URL is deferred to Phase 2c.

**Tech Stack:** git, Windows `mklink /J` (directory junction), git-bash shell.

> **Note on test style:** Phase 0 is repository plumbing — there is no application code to unit-test. Each task therefore uses **command + expected-output verification steps** in place of TDD tests. That is the intended adaptation, not an omission.

> **Pre-flight (do once before Task 1):** Close WebStorm and PyCharm so no IDE holds locks on the source repos during the moves.

---

## File Structure (end state)

```
G:\NCSoft\aion2-map\
├── .gitignore                 # NEW — ignores nested repos
├── CLAUDE.md                  # NEW — workspace architecture + repo map + data-flow
├── .claude\skills\.gitkeep    # NEW — shared-skills home (empty for now)
├── docs\superpowers\          # EXISTING — spec + this plan
├── frontend\                  # MOVED from C:\Users\liuyh\WebstormProjects\aion2-interactive-map
│   └── public\UI  -> junction to ..\..\images
├── backend\                   # MOVED from C:\Users\liuyh\PycharmProjects\aion2-interactive-map-backend
├── tools\                     # MOVED from C:\Users\liuyh\PycharmProjects\aion2-tools
├── images\                    # NEW git repo — holds Map\ + Resource\ (the former public\UI)
└── data\                      # NEW git repo — served parsed dataset (empty scaffold)
```

Source repos (verified 2026-06-27):
- frontend — remote `git@github.com:aion2-interactive-map/aion2-interactive-map.git`, branches `master` + `ui`, **clean**.
- backend — remote `git@github.com:aion2-interactive-map/aion2-interactive-map-backend.git`, `master`, **52 uncommitted files** (preserve, do not commit).
- tools — **no remote**, `master`, **68 uncommitted files** (preserve, do not commit).
- webadmin (`C:\Users\liuyh\WebstormProjects\aion2-interactive-map-webadmin`) — **left in place**, archived in Phase 2 after its features are ported.

---

## Task 1: Initialize the workspace repo

**Files:**
- Create: `G:\NCSoft\aion2-map\.gitignore`
- Create: `G:\NCSoft\aion2-map\CLAUDE.md`
- Create: `G:\NCSoft\aion2-map\.claude\skills\.gitkeep`

- [ ] **Step 1: Create `.gitignore` that excludes the nested repos**

```bash
cat > "G:/NCSoft/aion2-map/.gitignore" <<'EOF'
# Nested repos are independent — the workspace repo tracks meta files only
/frontend/
/backend/
/tools/
/images/
/data/

# OS / editor noise
.DS_Store
Thumbs.db
EOF
```

- [ ] **Step 2: Create the workspace `CLAUDE.md`**

```bash
cat > "G:/NCSoft/aion2-map/CLAUDE.md" <<'EOF'
# AION2 Interactive Map — Workspace

This folder co-locates five **independent** git repos. It is NOT a monorepo: each
sub-repo keeps its own remote and history; this root repo tracks only shared meta
(this file, `.claude/skills/`, `docs/`).

## Repos
- `frontend/` — unified map + admin app (React 19 / Vite / Tailwind / shadcn / Leaflet).
- `backend/`  — FastAPI + PostgreSQL + S3; dynamic/user data only.
- `tools/`    — Python; transforms the raw game export into `data/` + `images/`.
- `images/`   — derived WebP image set, served over HTTP.
- `data/`     — derived parsed dataset (markers, regions, tables, locales), served over HTTP.

## Data-flow contract
Raw game export (`G:\NCSoft\Export\Exports\AION2\Content\`, Perforce later)
  --tools-->  data/ (text)      --HTTP-->  frontend
  --tools-->  images/ (WebP)    --HTTP-->  frontend
backend  --HTTP (auth, comments, feedback, contributors, progress, uploads, artifact voting)-->  frontend

## Notes
- `frontend/public/UI` is a junction into `images/` (see Phase 0 plan). Do not commit it.
- Old web admin repo: `C:\Users\liuyh\WebstormProjects\aion2-interactive-map-webadmin`
  (to be ported into `frontend/` in Phase 2, then archived).

See `docs/superpowers/specs/2026-06-27-aion2-map-reconstruction-design.md` for the full design.
EOF
```

- [ ] **Step 3: Create the shared-skills placeholder**

```bash
mkdir -p "G:/NCSoft/aion2-map/.claude/skills" && touch "G:/NCSoft/aion2-map/.claude/skills/.gitkeep"
```

- [ ] **Step 4: Initialize the repo and commit the meta + existing docs**

```bash
cd "G:/NCSoft/aion2-map"
git init
git add .gitignore CLAUDE.md .claude/skills/.gitkeep docs
git commit -m "chore: initialize aion2-map workspace repo

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 5: Verify the workspace tracks only meta**

Run: `cd "G:/NCSoft/aion2-map" && git ls-files | sed 's#/.*##' | sort -u`
Expected: only `.claude`, `.gitignore`, `CLAUDE.md`, `docs` — no `frontend`/`backend`/etc.

---

## Task 2: Move the backend repo

**Files:**
- Move: `C:\Users\liuyh\PycharmProjects\aion2-interactive-map-backend` → `G:\NCSoft\aion2-map\backend`

- [ ] **Step 1: Record the pre-move state**

Run: `git -C "C:/Users/liuyh/PycharmProjects/aion2-interactive-map-backend" status --porcelain | wc -l`
Expected: `52`

- [ ] **Step 2: Move the directory (copies across drives, then removes source)**

```bash
mv "C:/Users/liuyh/PycharmProjects/aion2-interactive-map-backend" "G:/NCSoft/aion2-map/backend"
```

- [ ] **Step 3: Verify history, remote, and working tree survived intact**

Run:
```bash
git -C "G:/NCSoft/aion2-map/backend" remote get-url origin
git -C "G:/NCSoft/aion2-map/backend" branch --show-current
git -C "G:/NCSoft/aion2-map/backend" status --porcelain | wc -l
```
Expected: `git@github.com:aion2-interactive-map/aion2-interactive-map-backend.git`, `master`, `52`.

- [ ] **Step 4: Confirm the source path is gone**

Run: `ls "C:/Users/liuyh/PycharmProjects/aion2-interactive-map-backend" 2>&1`
Expected: "No such file or directory".

---

## Task 3: Move the tools repo

**Files:**
- Move: `C:\Users\liuyh\PycharmProjects\aion2-tools` → `G:\NCSoft\aion2-map\tools`

- [ ] **Step 1: Record the pre-move state (no remote expected)**

Run:
```bash
git -C "C:/Users/liuyh/PycharmProjects/aion2-tools" status --porcelain | wc -l
git -C "C:/Users/liuyh/PycharmProjects/aion2-tools" remote -v | wc -l
```
Expected: `68` uncommitted; `0` remotes.

- [ ] **Step 2: Move the directory**

```bash
mv "C:/Users/liuyh/PycharmProjects/aion2-tools" "G:/NCSoft/aion2-map/tools"
```

- [ ] **Step 3: Verify branch + working tree survived**

Run:
```bash
git -C "G:/NCSoft/aion2-map/tools" branch --show-current
git -C "G:/NCSoft/aion2-map/tools" status --porcelain | wc -l
```
Expected: `master`, `68`.

- [ ] **Step 4: Confirm the source path is gone**

Run: `ls "C:/Users/liuyh/PycharmProjects/aion2-tools" 2>&1`
Expected: "No such file or directory".

---

## Task 4: Move the frontend repo

**Files:**
- Move: `C:\Users\liuyh\WebstormProjects\aion2-interactive-map` → `G:\NCSoft\aion2-map\frontend`

- [ ] **Step 1: Record the pre-move state**

Run:
```bash
git -C "C:/Users/liuyh/WebstormProjects/aion2-interactive-map" status --porcelain | wc -l
git -C "C:/Users/liuyh/WebstormProjects/aion2-interactive-map" branch | tr -d ' *'
```
Expected: `0` uncommitted; branches `master` and `ui`.

- [ ] **Step 2: Move the directory** (large — ~190 MB+; if `mv` is slow or errors mid-copy, use `robocopy "<src>" "<dst>" /E /MOVE` from cmd instead)

```bash
mv "C:/Users/liuyh/WebstormProjects/aion2-interactive-map" "G:/NCSoft/aion2-map/frontend"
```

- [ ] **Step 3: Verify history, remote, branches, and working tree survived**

Run:
```bash
git -C "G:/NCSoft/aion2-map/frontend" remote get-url origin
git -C "G:/NCSoft/aion2-map/frontend" branch | tr -d ' *'
git -C "G:/NCSoft/aion2-map/frontend" status --porcelain | wc -l
```
Expected: `git@github.com:aion2-interactive-map/aion2-interactive-map.git`; `master` + `ui`; `0`.

- [ ] **Step 4: Confirm the source path is gone**

Run: `ls "C:/Users/liuyh/WebstormProjects/aion2-interactive-map" 2>&1`
Expected: "No such file or directory".

---

## Task 5: Extract `public/UI` into the `images` repo (junction back)

**Files:**
- Create repo: `G:\NCSoft\aion2-map\images\` (will contain `Map\` + `Resource\`)
- Modify: `G:\NCSoft\aion2-map\frontend\.gitignore` (add `public/UI/`)
- Junction: `G:\NCSoft\aion2-map\frontend\public\UI` → `G:\NCSoft\aion2-map\images`

- [ ] **Step 1: Record the source size/format for later verification**

Run:
```bash
find "G:/NCSoft/aion2-map/frontend/public/UI" -type f | sed 's/.*\.//' | sort -u
ls "G:/NCSoft/aion2-map/frontend/public/UI"
```
Expected: only `webp`; directories `Map` and `Resource`.

- [ ] **Step 2: Create the images repo and move the two top dirs into it**

```bash
mkdir -p "G:/NCSoft/aion2-map/images"
mv "G:/NCSoft/aion2-map/frontend/public/UI/Map"      "G:/NCSoft/aion2-map/images/Map"
mv "G:/NCSoft/aion2-map/frontend/public/UI/Resource" "G:/NCSoft/aion2-map/images/Resource"
rmdir "G:/NCSoft/aion2-map/frontend/public/UI"
```

- [ ] **Step 3: Untrack `public/UI` in the frontend and ignore it**

```bash
cd "G:/NCSoft/aion2-map/frontend"
echo "public/UI/" >> .gitignore
git rm -r --cached public/UI
```
Expected: git reports the removal of the previously-tracked `public/UI/...` entries from the index (working tree already moved).

- [ ] **Step 4: Recreate `public/UI` as a junction into the images repo**

```bash
cmd //c 'mklink /J "G:\NCSoft\aion2-map\frontend\public\UI" "G:\NCSoft\aion2-map\images"'
```
Expected: `Junction created for ...UI <<===>> ...images`.

- [ ] **Step 5: Verify the frontend can still resolve `UI/...` through the junction**

Run: `ls "G:/NCSoft/aion2-map/frontend/public/UI/Map" && ls "G:/NCSoft/aion2-map/frontend/public/UI/Resource/Texture" | head`
Expected: lists `WorldMap` under Map, and texture subfolders under Resource — i.e. the images repo content shows through.

- [ ] **Step 6: Verify git ignores the junction now**

Run: `cd "G:/NCSoft/aion2-map/frontend" && git status --porcelain | grep "public/UI" || echo "UI not in status (good)"`
Expected: `UI not in status (good)` — only the `.gitignore` change and the `public/UI` index removals are staged.

- [ ] **Step 7: Commit the frontend de-dirtying**

```bash
cd "G:/NCSoft/aion2-map/frontend"
git add .gitignore
git commit -m "chore: extract public/UI image set into separate images repo

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 8: Initialize the images repo and commit the WebP set**

```bash
cd "G:/NCSoft/aion2-map/images"
cat > .gitignore <<'EOF'
.DS_Store
Thumbs.db
EOF
cat > README.md <<'EOF'
# AION2 images

Derived WebP image set (game UI/Map textures) served over HTTP to the frontend.
Regenerated from the raw game export by `tools/` (Phase 1). Layout mirrors the
frontend's former `public/UI`: `Map/` and `Resource/`.
EOF
git init
git add .
git commit -m "feat: initial WebP image set extracted from frontend public/UI

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 9: Verify the images repo tracked the files**

Run: `git -C "G:/NCSoft/aion2-map/images" ls-files | grep -c '\.webp$'`
Expected: `6129` (the WebP count measured on 2026-06-27).

---

## Task 6: Create the empty `data` repo

**Files:**
- Create repo: `G:\NCSoft\aion2-map\data\`

- [ ] **Step 1: Scaffold and initialize**

```bash
mkdir -p "G:/NCSoft/aion2-map/data"
cd "G:/NCSoft/aion2-map/data"
cat > README.md <<'EOF'
# AION2 data

Derived parsed dataset served over HTTP to the frontend: markers (with map-pixel
coordinates), regions, reference tables, and i18n locale files (en-US, ko-KR,
zh-TW, zh-CN). Generated from the raw game export by `tools/` (Phase 1). Empty
until Phase 1 produces output.
EOF
cat > .gitignore <<'EOF'
.DS_Store
Thumbs.db
EOF
git init
git add .
git commit -m "chore: initialize data repo scaffold

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 2: Verify**

Run: `git -C "G:/NCSoft/aion2-map/data" ls-files`
Expected: `.gitignore` and `README.md`.

---

## Task 7: Record the raw-data input path for the tools

**Files:**
- Create: `G:\NCSoft\aion2-map\tools\.env.example`
- Modify: `G:\NCSoft\aion2-map\tools\README` (append a "Raw data input" note) — create `README.md` if none exists.

> Actual consumption of this path is Phase 1. Phase 0 only records the contract so the path isn't lost.

- [ ] **Step 1: Write the example env pointing at the export**

```bash
cat > "G:/NCSoft/aion2-map/tools/.env.example" <<'EOF'
# Root of the raw UE5 game export consumed by the tools (Perforce-managed later).
RAW_DATA_PATH=G:/NCSoft/Export/Exports/AION2/Content

# Output repos (served over HTTP)
DATA_OUTPUT_PATH=G:/NCSoft/aion2-map/data
IMAGES_OUTPUT_PATH=G:/NCSoft/aion2-map/images
EOF
```

- [ ] **Step 2: Note it in the tools README**

```bash
cat >> "G:/NCSoft/aion2-map/tools/README.md" <<'EOF'

## Raw data input (added Phase 0)
The tools transform the raw game export into the `data/` and `images/` repos.
Copy `.env.example` to `.env` and set `RAW_DATA_PATH` to the export root
(default `G:/NCSoft/Export/Exports/AION2/Content`). Wiring lands in Phase 1.
EOF
```

- [ ] **Step 3: Verify (do NOT commit — tools has 68 unrelated uncommitted files; leave them for the user)**

Run: `ls "G:/NCSoft/aion2-map/tools/.env.example" && tail -5 "G:/NCSoft/aion2-map/tools/README.md"`
Expected: the file exists and the README shows the new section.

> Leaving these two files uncommitted is intentional — committing would entangle them with the 68 pre-existing uncommitted changes the user has not asked us to commit.

---

## Task 8: Final workspace verification

**Files:** none (verification only).

- [ ] **Step 1: Confirm the end-state layout**

Run: `ls "G:/NCSoft/aion2-map"`
Expected: `.claude  .git  .gitignore  CLAUDE.md  backend  data  docs  frontend  images  tools` (order may vary).

- [ ] **Step 2: Confirm each sub-repo is its own git repo**

Run:
```bash
for r in frontend backend tools images data; do
  echo -n "$r: "; git -C "G:/NCSoft/aion2-map/$r" rev-parse --is-inside-work-tree
done
```
Expected: `true` for all five.

- [ ] **Step 3: Confirm the workspace repo still ignores the nested repos**

Run: `cd "G:/NCSoft/aion2-map" && git status --porcelain`
Expected: empty (nested repos ignored; meta already committed).

- [ ] **Step 4: Confirm the frontend dev build still resolves images (smoke test)**

Run: `ls "G:/NCSoft/aion2-map/frontend/public/UI/Resource/Texture/Icon" | head -3`
Expected: WebP icon filenames appear through the junction (e.g. `UT_...webp`).

---

## Self-Review

- **Spec coverage (Phase 0 rows of §6):** workspace repo + `.gitignore` of nested repos (Task 1) ✓; move frontend/backend/tools as-is, histories preserved (Tasks 2–4) ✓; extract `public/UI` → `images`, remove from frontend (Task 5) ✓; create empty `data` repo (Task 6) ✓; point tools at raw input path (Task 7) ✓; webadmin left in place / documented for later archival (CLAUDE.md in Task 1) ✓. Frontend URL-reference rebasing is intentionally deferred to Phase 2c — Phase 0 preserves behavior via the junction.
- **Placeholder scan:** no TBD/TODO; every step has concrete commands and expected output.
- **Consistency:** repo names (`frontend`/`backend`/`tools`/`images`/`data`) and paths are identical across all tasks and the `.gitignore`; junction direction (`frontend/public/UI` → `images`) matches the verification in Task 5/8 and the CLAUDE.md note.
- **Uncommitted-work safety:** Tasks 2/3 verify the 52/68 counts survive the move; Task 7 explicitly avoids committing into tools' dirty tree.
```
