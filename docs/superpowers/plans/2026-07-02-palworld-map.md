# Palworld Interactive Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Palworld interactive map: a Node extractor in the `tools` repo produces contract-v1 `data-palworld/` + `resource-palworld/` artifacts from the raw FModel export, and a new `apps/palworld` app in the frontend monorepo renders them via `@gamemap/map-engine` with zero engine changes.

**Architecture:** Three-stage extractor (`extract` → `emit` → `tiles`, plus a `calibrate` stage for coordinate-orientation verification) in `tools/palworld/` (Node ESM, deps: `sharp`, `yaml`, dev: `vitest`). Artifacts land in two fresh sibling git repos. `apps/palworld` is a small single-screen React app (no router, no backend) consuming the platform packages from branch `worktree-multi-game-map-platform`.

**Tech Stack:** Node 26 ESM, sharp, vitest, React 19, rolldown-vite, Tailwind v4, i18next, Leaflet via `@gamemap/map-engine`, Playwright.

**Spec:** `E:/aion2-map/docs/superpowers/specs/2026-07-02-palworld-map-design.md` (authoritative for scope/decisions).

---

## Global context for every task

- **Raw export root** (read-only, never modify): `E:/SteamLibrary/steamapps/common/Palworld/Exports/Pal/Content/Pal` — referred to as `$RAW` below.
- **Artifact repos** (create in Task 6/7): `E:/aion2-map/data-palworld`, `E:/aion2-map/resource-palworld`. Fresh local git repos, no remote, no push. NEVER touch `E:/aion2-map/data` or `E:/aion2-map/resource`.
- **Frontend monorepo worktree**: `E:/aion2-map/frontend/.claude/worktrees/multi-game-map-platform`, branch `worktree-multi-game-map-platform`. All `apps/palworld` work happens here. Never touch `E:/aion2-map/frontend` main checkout.
- **Tools repo**: `E:/aion2-map/tools` — extractor work happens in a worktree of it (Task 1).
- **Ports:** never use 5173 (user's live server). Dev verification: 5177. Palworld e2e: 5188. AION2 e2e regression: 5199.
- **Authoritative type sources** (read these, do not guess): contract shapes in `packages/data-contract/src/types.ts` + `src/validate.ts`; engine props in `packages/map-engine/src/engineTypes.ts` + `src/theme.ts`; existing AION2 dataset at `E:/aion2-map/data` (read-only reference for JSON shapes, e.g. `types.json`, `locales/en/...`).
- **Verified raw-data facts** (2026-07-02): DataTable JSONs parse as `array[0].Rows`. `DT_WorldMapUIData` rows `MainMap` and `Tree` carry `landScapeRealPositionMin/Max` (`{X,Y}`): MainMap X −1,099,400..349,400, Y −724,400..724,400; Tree X 347,351.5..689,148.5, Y −818,197..−476,400. Bounds overlap slightly → **test Tree first** when assigning. Level file `$RAW/Maps/MainWorld_5/PL_MainWorld5.json` is a 179 MB array of 31,159 exports; actor location = `Properties.RootComponent.ObjectPath` → trailing integer → index into the same array → that export's `Properties.RelativeLocation` (`{X,Y,Z}`). Actor class counts: `BP_LevelObject_TowerFastTravelPoint_C` 152, `BP_LevelObject_UnlockMapPoint_C` 22, `BP_DungeonPortalMarker_*_C` 157 total, `BP_LevelObject_TreasureMapPoint_C` 42, `BP_LevelObject_Note_C` 15, `BP_PalMapObjectSpawner_RockCopper_C` 39, `..._RockQuartz_C` 27, `..._RockCoal_C` 23, `BP_PalMapObjectSpawner_Sulfur_C` 23. `DT_BossSpawnerLoactionData` (sic) has 159 rows keyed `"0".."158"`: `{SpawnerID, CharacterID, Location:{X,Y,Z}, Level}`; keep only `CharacterID` starting `BOSS_`. `DT_PalSpawnerPlacement` 8253 rows `{SpawnerName, SpawnerType, Location:{X,Y,Z}, WorldName}` — keep `SpawnerType === "EPalSpawnedCharacterType::Common"`. `DT_PalWildSpawner` 1691 rows `{SpawnerName, Pal_1..Pal_3, LvMin_1..3, LvMax_1..3}`. `DT_PalNameText_Common` rows `PAL_NAME_<palId>` → `TextData.SourceString` (Japanese only). Pal head icons: `$RAW/Texture/PalIcon/Normal/T_<palId>_icon_normal.png` (827 files). Compass icons: `$RAW/Texture/UI/InGame/T_icon_compass_*.png`. Map images: `$RAW/Texture/UI/Map/T_WorldMap.png` and `T_TreeMap.png`, both 8192×8192.
- **Icon decisions** (visually verified 2026-07-02): fastTravel `T_icon_compass_FTtower`, eagleStatue `T_icon_compass_FTUnlockMap`, dungeon `T_icon_compass_dungeon`, boss fallback `T_icon_compass_boss`, treasureMap `T_icon_compass_Search_Treasure`, note `T_icon_compass_Search_Junk`. Resource subtypes have **no icon** — engine pin fallback with subtype colors: copper `#B87333`, quartz `#DCD9E8`, coal `#4A5560`, sulfur `#D9C24A`. Boss markers: per-marker pal head icon `T_<CharacterID minus BOSS_ prefix>_icon_normal` when the PNG exists, else `T_icon_compass_boss`. palSpawn markers: head icon of the cluster's primary pal (`Pal_1` of the first spawner in the cluster, `BOSS_` prefix stripped), no icon (pin) if the PNG is missing.
- Commit in whichever repo the task touches. Conventional-commit style messages.

---

### Task 1: Tools worktree + extractor scaffold

**Files:**
- Create: worktree `E:/aion2-map/tools/.claude/worktrees/palworld-extractor` (branch `worktree-palworld-extractor`)
- Create: `palworld/package.json`, `palworld/.gitignore`, `palworld/src/` (empty dir via first file in Task 2)

- [ ] **Step 1: Create the worktree**

```bash
cd E:/aion2-map/tools
git check-ignore -q .claude/worktrees || { echo ".claude/worktrees/" >> .gitignore && git add .gitignore && git commit -m "chore: ignore .claude/worktrees"; }
git worktree add .claude/worktrees/palworld-extractor -b worktree-palworld-extractor
cd .claude/worktrees/palworld-extractor
```

Expected: worktree created on new branch. All subsequent tools-repo work happens in this worktree directory (referred to as `$TOOLS_WT`).

- [ ] **Step 2: Scaffold `palworld/`**

Create `$TOOLS_WT/palworld/package.json`:

```json
{
  "name": "palworld-extractor",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "extract": "node src/cli.mjs extract",
    "calibrate": "node src/cli.mjs calibrate",
    "emit": "node src/cli.mjs emit",
    "tiles": "node src/cli.mjs tiles"
  },
  "dependencies": {
    "sharp": "^0.34.2",
    "yaml": "^2.6.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

Create `$TOOLS_WT/palworld/.gitignore`:

```
node_modules/
parsed/
calibration/
```

- [ ] **Step 3: Install and verify**

```bash
cd $TOOLS_WT/palworld && npm install && npx vitest --version
```

Expected: install succeeds, vitest version prints.

- [ ] **Step 4: Commit**

```bash
git add palworld/package.json palworld/.gitignore palworld/package-lock.json
git commit -m "feat(palworld): extractor package scaffold"
```

---

### Task 2: Coordinate transform + map assignment (TDD)

**Files:**
- Create: `$TOOLS_WT/palworld/src/transform.mjs`
- Create: `$TOOLS_WT/palworld/src/bounds.mjs`
- Test: `$TOOLS_WT/palworld/test/transform.test.mjs`

- [ ] **Step 1: Write the failing tests**

`test/transform.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { makeTransform } from '../src/transform.mjs';
import { assignMap } from '../src/bounds.mjs';

const bounds = { min: { X: -1099400, Y: -724400 }, max: { X: 349400, Y: 724400 } };

describe('makeTransform', () => {
  it('maps min corner to 0,0 and max corner to W,H with identity orientation', () => {
    const t = makeTransform(bounds, { pxAxis: 'X', flipX: false, flipY: false }, 8192, 8192);
    expect(t({ X: -1099400, Y: -724400 })).toEqual({ x: 0, y: 0 });
    expect(t({ X: 349400, Y: 724400 })).toEqual({ x: 8192, y: 8192 });
  });
  it('swaps axes when pxAxis is Y', () => {
    const t = makeTransform(bounds, { pxAxis: 'Y', flipX: false, flipY: false }, 8192, 8192);
    // px driven by world Y, py by world X
    expect(t({ X: -1099400, Y: 724400 })).toEqual({ x: 8192, y: 0 });
  });
  it('applies flips', () => {
    const t = makeTransform(bounds, { pxAxis: 'X', flipX: true, flipY: true }, 8192, 8192);
    expect(t({ X: -1099400, Y: -724400 })).toEqual({ x: 8192, y: 8192 });
  });
});

describe('assignMap', () => {
  const maps = [
    { mapId: 'WorldTree', min: { X: 347351.5, Y: -818197 }, max: { X: 689148.5, Y: -476400 } },
    { mapId: 'MainWorld', min: { X: -1099400, Y: -724400 }, max: { X: 349400, Y: 724400 } },
  ];
  it('assigns Tree-region points to WorldTree (Tree tested first despite overlap)', () => {
    expect(assignMap({ X: 500000, Y: -600000 }, maps)).toBe('WorldTree');
  });
  it('assigns main-region points to MainWorld', () => {
    expect(assignMap({ X: 0, Y: 0 }, maps)).toBe('MainWorld');
  });
  it('returns null outside all bounds', () => {
    expect(assignMap({ X: 9e6, Y: 9e6 }, maps)).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd $TOOLS_WT/palworld && npx vitest run test/transform.test.mjs`
Expected: FAIL — cannot resolve `../src/transform.mjs`.

- [ ] **Step 3: Implement**

`src/transform.mjs`:

```js
export function makeTransform(bounds, orientation, pixelW, pixelH) {
  const { min, max } = bounds;
  const { pxAxis, flipX, flipY } = orientation;
  const pyAxis = pxAxis === 'X' ? 'Y' : 'X';
  return (world) => {
    let x = ((world[pxAxis] - min[pxAxis]) / (max[pxAxis] - min[pxAxis])) * pixelW;
    let y = ((world[pyAxis] - min[pyAxis]) / (max[pyAxis] - min[pyAxis])) * pixelH;
    if (flipX) x = pixelW - x;
    if (flipY) y = pixelH - y;
    return { x, y };
  };
}
```

`src/bounds.mjs`:

```js
export function assignMap(world, maps) {
  for (const m of maps) {
    if (world.X >= m.min.X && world.X <= m.max.X && world.Y >= m.min.Y && world.Y <= m.max.Y) {
      return m.mapId;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/transform.test.mjs` — Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add palworld/src/transform.mjs palworld/src/bounds.mjs palworld/test/transform.test.mjs
git commit -m "feat(palworld): world->pixel transform and bounds-based map assignment"
```

### Task 3: Deterministic clustering (TDD)

Port of the AION2 greedy clustering (`E:/aion2-map/tools/aion2/tools/maps/creatures.py:78-108`, `CLUSTER_RADIUS=200.0`): sort points, place each into the first cluster whose *running centroid* is within the radius, else start a new cluster; round output coords to 2 decimals.

**Files:**
- Create: `$TOOLS_WT/palworld/src/cluster.mjs`
- Test: `$TOOLS_WT/palworld/test/cluster.test.mjs`

- [ ] **Step 1: Write the failing tests**

`test/cluster.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { clusterPoints } from '../src/cluster.mjs';

describe('clusterPoints', () => {
  it('merges points within radius into one cluster at their centroid', () => {
    const pts = [
      { x: 100, y: 100, z: 0, key: 'a' },
      { x: 150, y: 100, z: 0, key: 'b' },
    ];
    const out = clusterPoints(pts, 200);
    expect(out).toHaveLength(1);
    expect(out[0].x).toBe(125);
    expect(out[0].y).toBe(100);
    expect(out[0].items.map((p) => p.key)).toEqual(['a', 'b']);
  });
  it('keeps far-apart points separate', () => {
    const out = clusterPoints(
      [{ x: 0, y: 0, z: 0 }, { x: 1000, y: 1000, z: 0 }],
      200,
    );
    expect(out).toHaveLength(2);
  });
  it('is deterministic under input shuffling', () => {
    const pts = Array.from({ length: 50 }, (_, i) => ({
      x: (i * 137) % 900, y: (i * 251) % 900, z: 0, key: String(i),
    }));
    const shuffled = [...pts].reverse();
    const a = clusterPoints(pts, 200).map((c) => [c.x, c.y, c.items.length]);
    const b = clusterPoints(shuffled, 200).map((c) => [c.x, c.y, c.items.length]);
    expect(a).toEqual(b);
  });
  it('rounds centroid coords to 2 decimals', () => {
    const out = clusterPoints(
      [{ x: 0.111, y: 0.111, z: 0 }, { x: 0.115, y: 0.115, z: 0 }],
      200,
    );
    expect(out[0].x).toBe(0.11);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/cluster.test.mjs` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/cluster.mjs`:

```js
const round2 = (v) => Math.round(v * 100) / 100;

export function clusterPoints(points, radius) {
  const sorted = [...points].sort(
    (a, b) => a.x - b.x || a.y - b.y || (a.z ?? 0) - (b.z ?? 0),
  );
  const r2 = radius * radius;
  const clusters = [];
  for (const p of sorted) {
    let placed = false;
    for (const c of clusters) {
      const n = c.items.length;
      const dx = p.x - c.sx / n;
      const dy = p.y - c.sy / n;
      if (dx * dx + dy * dy <= r2) {
        c.items.push(p);
        c.sx += p.x; c.sy += p.y; c.sz += p.z ?? 0;
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ items: [p], sx: p.x, sy: p.y, sz: p.z ?? 0 });
  }
  return clusters.map((c) => ({
    x: round2(c.sx / c.items.length),
    y: round2(c.sy / c.items.length),
    z: round2(c.sz / c.items.length),
    items: c.items,
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/cluster.test.mjs` — Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add palworld/src/cluster.mjs palworld/test/cluster.test.mjs
git commit -m "feat(palworld): deterministic greedy clustering (port of aion2 creatures clustering)"
```

---

### Task 4: `extract` stage — parse raw export to intermediates

**Files:**
- Create: `$TOOLS_WT/palworld/src/extract.mjs`
- Create: `$TOOLS_WT/palworld/src/cli.mjs`
- Test: `$TOOLS_WT/palworld/test/extract.test.mjs` (integration, `skipIf` export missing)

- [ ] **Step 1: Write the failing integration test**

`test/extract.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { runExtract } from '../src/extract.mjs';

const RAW = process.env.PALWORLD_RAW
  ?? 'E:/SteamLibrary/steamapps/common/Palworld/Exports/Pal/Content/Pal';
const hasRaw = fs.existsSync(RAW);

describe.skipIf(!hasRaw)('extract (integration)', () => {
  it('parses the raw export into expected candidate counts', () => {
    const out = runExtract(RAW);
    const bySubtype = (k) => out.pois.filter((p) => p.subtype === k).length;
    expect(bySubtype('fastTravel')).toBe(152);
    expect(bySubtype('eagleStatue')).toBe(22);
    expect(bySubtype('dungeon')).toBe(157);
    expect(bySubtype('treasureMap')).toBe(42);
    expect(bySubtype('note')).toBe(15);
    expect(bySubtype('copper')).toBe(39);
    expect(bySubtype('quartz')).toBe(27);
    expect(bySubtype('coal')).toBe(23);
    expect(bySubtype('sulfur')).toBe(23);
    expect(out.pois.every((p) => Number.isFinite(p.location.X) && Number.isFinite(p.location.Y))).toBe(true);
    // 159 rows: 70 are CharacterID "None"; 89 start BOSS_ + 1 is "Boss_Anubis"
    // (mixed case, a real field boss) → case-insensitive filter yields 90.
    expect(out.bosses.length).toBe(90);
    expect(out.bosses.every((b) => /^BOSS_/i.test(b.characterId))).toBe(true);
    expect(out.palSpawns.length).toBeGreaterThan(5000);
    expect(out.palSpawns.every((s) => s.pals.length >= 1)).toBe(true);
    expect(out.names.Kitsunebi ?? out.names[Object.keys(out.names)[0]]).toBeTruthy();
    expect(out.bounds.MainWorld.min.X).toBe(-1099400);
    expect(out.bounds.WorldTree.max.Y).toBe(-476400);
    // Texture/PalIcon/Normal has 827 files = 413 .png + 414 .json sidecars;
    // only .png stems are collected.
    expect(out.palIcons.size ?? Object.keys(out.palIcons).length).toBeGreaterThan(400);
  }, 120_000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/extract.test.mjs` — Expected: FAIL, module not found (or skipped if raw missing — it isn't on this machine).

- [ ] **Step 3: Implement `src/extract.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';

const readRows = (raw, rel) =>
  JSON.parse(fs.readFileSync(path.join(raw, rel), 'utf8'))[0].Rows;

const POI_CLASSES = [
  { subtype: 'fastTravel', match: (t) => t === 'BP_LevelObject_TowerFastTravelPoint_C' },
  { subtype: 'eagleStatue', match: (t) => t === 'BP_LevelObject_UnlockMapPoint_C' },
  { subtype: 'dungeon', match: (t) => /^BP_DungeonPortalMarker_.+_C$/.test(t) },
  { subtype: 'treasureMap', match: (t) => t === 'BP_LevelObject_TreasureMapPoint_C' },
  { subtype: 'note', match: (t) => t === 'BP_LevelObject_Note_C' },
  { subtype: 'copper', match: (t) => t === 'BP_PalMapObjectSpawner_RockCopper_C' },
  { subtype: 'quartz', match: (t) => t === 'BP_PalMapObjectSpawner_RockQuartz_C' },
  { subtype: 'coal', match: (t) => t === 'BP_PalMapObjectSpawner_RockCoal_C' },
  { subtype: 'sulfur', match: (t) => t === 'BP_PalMapObjectSpawner_Sulfur_C' },
];

function actorLocation(actor, exportsArr) {
  const objPath = actor.Properties?.RootComponent?.ObjectPath;
  if (!objPath) return null;
  const idx = Number(objPath.split('.').pop());
  const loc = exportsArr[idx]?.Properties?.RelativeLocation;
  return loc ? { X: loc.X, Y: loc.Y, Z: loc.Z ?? 0 } : null;
}

export function runExtract(raw) {
  // Bounds
  const uiRows = readRows(raw, 'DataTable/WorldMapUIData/DT_WorldMapUIData.json');
  const bounds = {
    MainWorld: { min: uiRows.MainMap.landScapeRealPositionMin, max: uiRows.MainMap.landScapeRealPositionMax },
    WorldTree: { min: uiRows.Tree.landScapeRealPositionMin, max: uiRows.Tree.landScapeRealPositionMax },
  };

  // Level actors → POIs
  const level = JSON.parse(fs.readFileSync(
    path.join(raw, 'Maps/MainWorld_5/PL_MainWorld5.json'), 'utf8'));
  const pois = [];
  for (const exp of level) {
    const cls = POI_CLASSES.find((c) => c.match(exp.Type ?? ''));
    if (!cls) continue;
    const location = actorLocation(exp, level);
    if (!location) continue;
    pois.push({ subtype: cls.subtype, sourceName: exp.Name, location });
  }

  // Bosses
  const bossRows = readRows(raw, 'DataTable/UI/DT_BossSpawnerLoactionData.json');
  const bosses = Object.entries(bossRows)
    .map(([key, r]) => ({
      key, characterId: r.CharacterID, level: r.Level,
      location: { X: r.Location.X, Y: r.Location.Y, Z: r.Location.Z ?? 0 },
    }))
    .filter((b) => b.characterId && /^BOSS_/i.test(b.characterId)); // /i: "Boss_Anubis" is mixed case

  // Pal spawns: placement ⋈ wild spawner
  const wildRows = readRows(raw, 'DataTable/Spawner/DT_PalWildSpawner.json');
  const wildByName = new Map();
  for (const r of Object.values(wildRows)) {
    const pals = [];
    for (const n of [1, 2, 3]) {
      const id = r[`Pal_${n}`];
      if (id && id !== 'None') pals.push({ id, lvMin: r[`LvMin_${n}`], lvMax: r[`LvMax_${n}`] });
    }
    if (pals.length) wildByName.set(r.SpawnerName, pals);
  }
  const placeRows = readRows(raw, 'DataTable/Spawner/DT_PalSpawnerPlacement.json');
  const palSpawns = [];
  for (const r of Object.values(placeRows)) {
    if (r.SpawnerType !== 'EPalSpawnedCharacterType::Common') continue;
    const pals = wildByName.get(r.SpawnerName);
    if (!pals) continue;
    palSpawns.push({
      spawnerName: r.SpawnerName, pals,
      location: { X: r.Location.X, Y: r.Location.Y, Z: r.Location.Z ?? 0 },
    });
  }

  // Names (Japanese)
  const nameRows = readRows(raw, 'DataTable/Text/DT_PalNameText_Common.json');
  const names = {};
  for (const [key, r] of Object.entries(nameRows)) {
    if (key.startsWith('PAL_NAME_')) names[key.slice('PAL_NAME_'.length)] = r.TextData.SourceString;
  }

  // Available pal head icons (stems without extension)
  const palIcons = new Set(
    fs.readdirSync(path.join(raw, 'Texture/PalIcon/Normal'))
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.slice(0, -4)),
  );

  return { bounds, pois, bosses, palSpawns, names, palIcons };
}

export function writeParsed(raw, outDir) {
  const out = runExtract(raw);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'parsed.json'), JSON.stringify(
    { ...out, palIcons: [...out.palIcons] }, null, 1));
  return out;
}

export function readParsed(outDir) {
  const p = JSON.parse(fs.readFileSync(path.join(outDir, 'parsed.json'), 'utf8'));
  p.palIcons = new Set(p.palIcons);
  return p;
}
```

- [ ] **Step 4: Implement `src/cli.mjs`**

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeParsed } from './extract.mjs';

// Not exported: this module dispatches on import; stage modules receive paths as args.
const here = path.dirname(fileURLToPath(import.meta.url));
const RAW = process.env.PALWORLD_RAW
  ?? 'E:/SteamLibrary/steamapps/common/Palworld/Exports/Pal/Content/Pal';
const DATA_OUT = process.env.PALWORLD_DATA_OUT ?? 'E:/aion2-map/data-palworld';
const RES_OUT = process.env.PALWORLD_RES_OUT ?? 'E:/aion2-map/resource-palworld';
const PARSED_DIR = path.join(here, '..', 'parsed');

const stage = process.argv[2];
if (stage === 'extract') {
  writeParsed(RAW, PARSED_DIR);
  console.log('extract: wrote', PARSED_DIR);
} else if (stage === 'calibrate') {
  await (await import('./calibrate.mjs')).runCalibrate(RAW, PARSED_DIR);
} else if (stage === 'emit') {
  await (await import('./emit.mjs')).runEmit(PARSED_DIR, DATA_OUT);
} else if (stage === 'tiles') {
  await (await import('./tiles.mjs')).runTiles(RAW, DATA_OUT, RES_OUT);
} else {
  console.error('usage: node src/cli.mjs <extract|calibrate|emit|tiles>');
  process.exit(1);
}
```

(Note: `calibrate.mjs`/`emit.mjs`/`tiles.mjs` are dynamic imports, so the CLI works before later tasks exist as long as only `extract` is invoked.)

- [ ] **Step 5: Run test + stage, verify**

Run: `npx vitest run test/extract.test.mjs` — Expected: 1 passed (~10-60 s; 179 MB parse).
Run: `npm run extract` — Expected: writes `parsed/parsed.json`.

- [ ] **Step 6: Commit**

```bash
git add palworld/src/extract.mjs palworld/src/cli.mjs palworld/test/extract.test.mjs
git commit -m "feat(palworld): extract stage - level POIs, bosses, pal spawns, names, bounds"
```

---

### Task 5: `calibrate` stage + orientation constants ⚠ CONTROLLER CHECKPOINT

Orientation (`pxAxis`/`flipX`/`flipY`) is NOT assumed. This task renders all 8 candidates; **the controller (not the implementer subagent) must visually inspect the renders** and pick the correct orientation per map before the orientation constants are committed.

**Files:**
- Create: `$TOOLS_WT/palworld/src/calibrate.mjs`
- Create: `$TOOLS_WT/palworld/src/orientation.mjs`
- Test: `$TOOLS_WT/palworld/test/orientation.test.mjs`

- [ ] **Step 1: Implement `src/calibrate.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { makeTransform } from './transform.mjs';
import { assignMap } from './bounds.mjs';
import { readParsed } from './extract.mjs';

const MAP_IMAGES = { MainWorld: 'Texture/UI/Map/T_WorldMap.png', WorldTree: 'Texture/UI/Map/T_TreeMap.png' };
const SIZE = 8192, PREVIEW = 1024;

export async function runCalibrate(raw, parsedDir) {
  const { bounds, pois } = readParsed(parsedDir);
  const maps = [
    { mapId: 'WorldTree', ...bounds.WorldTree },
    { mapId: 'MainWorld', ...bounds.MainWorld },
  ];
  const outDir = path.join(parsedDir, '..', 'calibration');
  fs.mkdirSync(outDir, { recursive: true });
  const statues = pois.filter((p) => p.subtype === 'fastTravel');

  for (const [mapId, imgRel] of Object.entries(MAP_IMAGES)) {
    const base = await sharp(path.join(raw, imgRel)).resize(PREVIEW, PREVIEW).png().toBuffer();
    const pts = statues.filter((s) => assignMap(s.location, maps) === mapId);
    for (const pxAxis of ['X', 'Y']) {
      for (const flipX of [false, true]) {
        for (const flipY of [false, true]) {
          const t = makeTransform(bounds[mapId], { pxAxis, flipX, flipY }, SIZE, SIZE);
          const circles = pts.map((s) => {
            const { x, y } = t(s.location);
            return `<circle cx="${x / 8}" cy="${y / 8}" r="5" fill="red" stroke="white"/>`;
          }).join('');
          const svg = Buffer.from(`<svg width="${PREVIEW}" height="${PREVIEW}">${circles}</svg>`);
          const name = `${mapId}_px${pxAxis}_fx${flipX ? 1 : 0}_fy${flipY ? 1 : 0}.png`;
          await sharp(base).composite([{ input: svg }]).toFile(path.join(outDir, name));
        }
      }
    }
    console.log(`calibrate: ${mapId} — ${pts.length} statues, 8 renders`);
  }
  console.log('calibrate: wrote', outDir);
}
```

- [ ] **Step 2: Run calibration**

Run: `npm run extract` (if `parsed/` absent) then `npm run calibrate`.
Expected: 16 PNGs in `$TOOLS_WT/palworld/calibration/` (8 per map), MainWorld statue count + WorldTree statue count printed (sum ≤ 152; any unassigned are outside both bounds).

- [ ] **Step 3: CONTROLLER CHECKPOINT — pick orientation**

The implementer subagent STOPS here and reports DONE for steps 1-2. The controller Reads the 16 images and identifies, per map, the render where red dots sit on fast-travel statue positions. Ground-truth landmarks: the dense starter-area statue cluster, statues adjacent to the five tower badges on the map art, coastline silhouettes. MainWorld and WorldTree are verified independently. The controller then dispatches the next step with the chosen orientation values filled in.

- [ ] **Step 4: Write orientation golden test (values from checkpoint)**

`test/orientation.test.mjs` — replace `<CHOSEN>` with controller-confirmed values, and the golden pixel coords with the actual transform output for two statues from `parsed.json` after the orientation is locked (compute once, paste literal numbers):

```js
import { describe, it, expect } from 'vitest';
import { ORIENTATIONS } from '../src/orientation.mjs';
import { makeTransform } from '../src/transform.mjs';

describe('orientation lock', () => {
  it('MainWorld orientation is the calibrated one', () => {
    expect(ORIENTATIONS.MainWorld).toEqual(<CHOSEN_MAINWORLD>);
    expect(ORIENTATIONS.WorldTree).toEqual(<CHOSEN_WORLDTREE>);
  });
  it('golden pixels for known statues stay fixed', () => {
    const bounds = { min: { X: -1099400, Y: -724400 }, max: { X: 349400, Y: 724400 } };
    const t = makeTransform(bounds, ORIENTATIONS.MainWorld, 8192, 8192);
    // <statue sourceName>: world <X,Y> → px (paste computed literals)
    expect(t(<STATUE_1_WORLD>)).toEqual(<STATUE_1_PX>);
    expect(t(<STATUE_2_WORLD>)).toEqual(<STATUE_2_PX>);
  });
});
```

- [ ] **Step 5: Implement `src/orientation.mjs`** (values from checkpoint)

```js
// Verified 2026-07-02 via calibrate renders against fast-travel statue layout
// (starter-area cluster + tower-adjacent statues). Re-verify if map art changes.
export const ORIENTATIONS = {
  MainWorld: <CHOSEN_MAINWORLD>,   // e.g. { pxAxis: 'Y', flipX: false, flipY: true }
  WorldTree: <CHOSEN_WORLDTREE>,
};
```

- [ ] **Step 6: Run tests, then commit**

Run: `npx vitest run` — Expected: all tests pass.

```bash
git add palworld/src/calibrate.mjs palworld/src/orientation.mjs palworld/test/orientation.test.mjs
git commit -m "feat(palworld): calibration stage + verified per-map orientation constants"
```

### Task 6: `emit` stage — contract-v1 dataset + `data-palworld` repo

**Files:**
- Create: `$TOOLS_WT/palworld/data_src/types.yaml`
- Create: `$TOOLS_WT/palworld/src/emit.mjs`
- Test: `$TOOLS_WT/palworld/test/emit.test.mjs`
- Create: git repo `E:/aion2-map/data-palworld`

**Shape authority:** before coding, read `packages/data-contract/src/types.ts` and `src/validate.ts` in the frontend worktree, plus `E:/aion2-map/data/types.json` and `E:/aion2-map/data/locales/en/` (read-only) for the exact JSON shapes. The shapes below reflect that contract; if any field mismatches the zod schema, the schema wins. Key contract facts: `maps.json` is an array of `GameMapMeta {id,name,type,tileWidth,tileHeight,tilesCountX,tilesCountY,isVisible}`; each marker requires `{id, subtype, x, y, images: [], contributors: [], indexInSubtype}` with optional `category`, `icon`, `name` (schemas are non-strict, so the extra `z` field is allowed); locale layout must include, for every language dir, `maps.json`, `types.json`, `markers/<MapId>.json`, `regions/<MapId>.json`.

- [ ] **Step 1: Author `data_src/types.yaml`**

```yaml
languages: [en, zh-CN, zh-TW]
maps:
  - id: MainWorld
    names: { en: Palpagos Islands, zh-CN: 帕鲁帕格斯群岛, zh-TW: 帕魯帕格斯群島 }
    shortNames: { en: Main, zh-CN: 主大陆, zh-TW: 主大陸 }
  - id: WorldTree
    names: { en: Sakurajima & World Tree, zh-CN: 樱花岛与世界树, zh-TW: 櫻花島與世界樹 }
    shortNames: { en: Sakurajima, zh-CN: 樱花岛, zh-TW: 櫻花島 }
categories:
  - id: location
    names: { en: Locations, zh-CN: 地点, zh-TW: 地點 }
  - id: boss
    names: { en: Bosses, zh-CN: 首领, zh-TW: 首領 }
  - id: collectible
    names: { en: Collectibles, zh-CN: 收集品, zh-TW: 收集品 }
  - id: resource
    names: { en: Resources, zh-CN: 资源, zh-TW: 資源 }
  - id: pal
    names: { en: Pals, zh-CN: 帕鲁, zh-TW: 帕魯 }
subtypes:
  - id: fastTravel
    category: location
    icon: T_icon_compass_FTtower
    names: { en: Fast Travel Statue, zh-CN: 传送雕像, zh-TW: 傳送雕像 }
  - id: eagleStatue
    category: location
    icon: T_icon_compass_FTUnlockMap
    names: { en: Eagle Statue, zh-CN: 巨鹰雕像, zh-TW: 巨鷹雕像 }
  - id: dungeon
    category: location
    icon: T_icon_compass_dungeon
    names: { en: Dungeon, zh-CN: 地下城, zh-TW: 地下城 }
  - id: fieldBoss
    category: boss
    icon: T_icon_compass_boss
    names: { en: Field Boss, zh-CN: 野外首领, zh-TW: 野外首領 }
  - id: treasureMap
    category: collectible
    icon: T_icon_compass_Search_Treasure
    names: { en: Treasure Map Point, zh-CN: 藏宝图地点, zh-TW: 藏寶圖地點 }
  - id: note
    category: collectible
    icon: T_icon_compass_Search_Junk
    names: { en: Note, zh-CN: 笔记, zh-TW: 筆記 }
  - id: copper
    category: resource
    color: "#B87333"
    names: { en: Copper Ore, zh-CN: 铜矿, zh-TW: 銅礦 }
  - id: quartz
    category: resource
    color: "#DCD9E8"
    names: { en: Quartz, zh-CN: 石英, zh-TW: 石英 }
  - id: coal
    category: resource
    color: "#4A5560"
    names: { en: Coal, zh-CN: 煤矿, zh-TW: 煤礦 }
  - id: sulfur
    category: resource
    color: "#D9C24A"
    names: { en: Sulfur, zh-CN: 硫磺, zh-TW: 硫磺 }
  - id: palSpawn
    category: pal
    clusterRadius: 200
    names: { en: Pal Spawn, zh-CN: 帕鲁出没点, zh-TW: 帕魯出沒點 }
```

- [ ] **Step 2: Write the failing test**

`test/emit.test.mjs` (unit-level, uses tiny synthetic parsed data; full-dataset check is the validate-data gate in Step 5):

```js
import { describe, it, expect } from 'vitest';
import { buildDataset } from '../src/emit.mjs';

const parsed = {
  bounds: {
    MainWorld: { min: { X: -1099400, Y: -724400 }, max: { X: 349400, Y: 724400 } },
    WorldTree: { min: { X: 347351.5, Y: -818197 }, max: { X: 689148.5, Y: -476400 } },
  },
  pois: [
    { subtype: 'fastTravel', sourceName: 'FT_1', location: { X: 0, Y: 0, Z: 10 } },
    { subtype: 'fastTravel', sourceName: 'FT_2', location: { X: 400000, Y: -600000, Z: 10 } },
    { subtype: 'copper', sourceName: 'CU_1', location: { X: 100, Y: 100, Z: 0 } },
  ],
  bosses: [
    { key: '0', characterId: 'BOSS_Kitsunebi', level: 12, location: { X: 5000, Y: 5000, Z: 0 } },
  ],
  palSpawns: [
    { spawnerName: 'sp1', pals: [{ id: 'SheepBall', lvMin: 1, lvMax: 3 }], location: { X: 0, Y: 0, Z: 0 } },
    { spawnerName: 'sp1', pals: [{ id: 'SheepBall', lvMin: 1, lvMax: 3 }], location: { X: 50, Y: 50, Z: 0 } },
  ],
  names: { Kitsunebi: 'ホムラちび', SheepBall: 'モコロン' },
  palIcons: new Set(['T_Kitsunebi_icon_normal', 'T_SheepBall_icon_normal']),
};

describe('buildDataset', () => {
  const ds = buildDataset(parsed);

  it('emits two maps with 1024x8x8 tiling', () => {
    expect(ds.maps.map((m) => m.id)).toEqual(['MainWorld', 'WorldTree']);
    expect(ds.maps[0]).toMatchObject({ tileWidth: 1024, tileHeight: 1024, tilesCountX: 8, tilesCountY: 8, isVisible: true });
  });

  it('assigns markers to maps by bounds with stable ids and indexInSubtype', () => {
    const main = ds.markers.MainWorld;
    const tree = ds.markers.WorldTree;
    const ft = main.filter((m) => m.subtype === 'fastTravel');
    expect(ft).toHaveLength(1);
    expect(ft[0].id).toBe('MainWorld-fastTravel-1');
    expect(ft[0].indexInSubtype).toBe(1);
    expect(ft[0].images).toEqual([]);
    expect(ft[0].contributors).toEqual([]);
    expect(typeof ft[0].z).toBe('number');
    expect(tree.filter((m) => m.subtype === 'fastTravel')).toHaveLength(1);
  });

  it('gives bosses per-pal icons and ja Lv names in every locale', () => {
    const boss = ds.markers.MainWorld.find((m) => m.subtype === 'fieldBoss');
    expect(boss.icon).toBe('T_Kitsunebi_icon_normal');
    expect(ds.locales.en.markers.MainWorld[boss.id].name).toBe('ホムラちび Lv.12');
    expect(ds.locales['zh-CN'].markers.MainWorld[boss.id].name).toBe('ホムラちび Lv.12');
  });

  it('clusters pal spawns and lists pals in the description', () => {
    const spawns = ds.markers.MainWorld.filter((m) => m.subtype === 'palSpawn');
    expect(spawns).toHaveLength(1); // two placements 70px apart → one cluster
    expect(spawns[0].icon).toBe('T_SheepBall_icon_normal');
    const loc = ds.locales.en.markers.MainWorld[spawns[0].id];
    expect(loc.name).toBe('モコロン');
    expect(loc.description).toContain('Lv.1–3');
  });

  it('emits empty regions and complete locale trees for all 3 languages', () => {
    expect(ds.regions.MainWorld).toEqual([]);
    for (const lng of ['en', 'zh-CN', 'zh-TW']) {
      expect(ds.locales[lng].maps.MainWorld.name).toBeTruthy();
      expect(ds.locales[lng].types.subtypes.fastTravel.name).toBeTruthy();
      expect(ds.locales[lng].regions.MainWorld).toEqual({});
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run test/emit.test.mjs` — Expected: FAIL, module not found.

- [ ] **Step 4: Implement `src/emit.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { makeTransform } from './transform.mjs';
import { assignMap } from './bounds.mjs';
import { clusterPoints } from './cluster.mjs';
import { ORIENTATIONS } from './orientation.mjs';
import { readParsed } from './extract.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SIZE = 8192;
const round2 = (v) => Math.round(v * 100) / 100;

function loadTypesSrc() {
  return YAML.parse(fs.readFileSync(path.join(here, '..', 'data_src', 'types.yaml'), 'utf8'));
}

const palName = (names, id) => names[id.replace(/^BOSS_/i, '')] ?? names[id] ?? id;
const palIcon = (palIcons, id) => {
  const stem = `T_${id.replace(/^BOSS_/i, '')}_icon_normal`;
  return palIcons.has(stem) ? stem : null;
};

export function buildDataset(parsed) {
  const src = loadTypesSrc();
  const { bounds, names, palIcons } = parsed;
  const mapIds = ['MainWorld', 'WorldTree'];
  const assignOrder = [
    { mapId: 'WorldTree', ...bounds.WorldTree },
    { mapId: 'MainWorld', ...bounds.MainWorld },
  ];
  const transforms = Object.fromEntries(mapIds.map((id) =>
    [id, makeTransform(bounds[id], ORIENTATIONS[id], SIZE, SIZE)]));

  // maps.json
  const maps = src.maps.map((m) => ({
    id: m.id, name: m.id, type: 'world',
    tileWidth: 1024, tileHeight: 1024, tilesCountX: 8, tilesCountY: 8,
    isVisible: true,
  }));

  // types.json — mirror the aion2 data repo shape (categories/subtypes arrays)
  const types = {
    categories: src.categories.map((c) => ({ id: c.id })),
    subtypes: src.subtypes.map((s) => ({
      id: s.id, category: s.category,
      ...(s.icon ? { icon: s.icon } : {}),
      ...(s.color ? { color: s.color } : {}),
    })),
  };

  // Candidate markers per map, keyed by subtype, before id assignment.
  // Each candidate: { subtype, category, x, y, z, icon?, sortKey, locByLng? }
  const candidates = Object.fromEntries(mapIds.map((id) => [id, []]));
  const subtypeCat = Object.fromEntries(src.subtypes.map((s) => [s.id, s.category]));
  const push = (mapId, c) => candidates[mapId].push(c);
  const toPx = (mapId, loc) => {
    const { x, y } = transforms[mapId](loc);
    return { x: round2(x), y: round2(y), z: round2(loc.Z ?? 0) };
  };

  for (const p of parsed.pois) {
    const mapId = assignMap(p.location, assignOrder);
    if (!mapId) continue;
    push(mapId, { subtype: p.subtype, ...toPx(mapId, p.location), sortKey: p.sourceName });
  }

  for (const b of parsed.bosses) {
    const mapId = assignMap(b.location, assignOrder);
    if (!mapId) continue;
    const nm = `${palName(names, b.characterId)} Lv.${b.level}`;
    push(mapId, {
      subtype: 'fieldBoss', ...toPx(mapId, b.location),
      icon: palIcon(palIcons, b.characterId) ?? 'T_icon_compass_boss',
      sortKey: `${b.characterId}-${b.key}`,
      name: nm,
    });
  }

  // Pal spawns: cluster per map at radius from types.yaml
  const radius = src.subtypes.find((s) => s.id === 'palSpawn').clusterRadius;
  const byMap = Object.fromEntries(mapIds.map((id) => [id, []]));
  for (const s of parsed.palSpawns) {
    const mapId = assignMap(s.location, assignOrder);
    if (!mapId) continue;
    byMap[mapId].push({ ...toPx(mapId, s.location), spawnerName: s.spawnerName, pals: s.pals });
  }
  for (const mapId of mapIds) {
    for (const c of clusterPoints(byMap[mapId], radius)) {
      // distinct pals across the cluster, keeping first-seen order, merged level ranges
      const seen = new Map();
      for (const item of c.items) {
        for (const p of item.pals) {
          const e = seen.get(p.id);
          if (e) { e.lvMin = Math.min(e.lvMin, p.lvMin); e.lvMax = Math.max(e.lvMax, p.lvMax); }
          else seen.set(p.id, { ...p });
        }
      }
      const pals = [...seen.values()];
      push(mapId, {
        subtype: 'palSpawn', x: c.x, y: c.y, z: c.z,
        icon: palIcon(palIcons, pals[0].id) ?? undefined,
        sortKey: `${c.x},${c.y}`,
        name: pals.map((p) => palName(names, p.id)).join(' / '),
        description: pals.map((p) => `${palName(names, p.id)} Lv.${p.lvMin}–${p.lvMax}`).join('\n'),
      });
    }
  }

  // Assign stable ids: per map+subtype, sort by sortKey then coords, index from 1
  const markers = {};
  const markerLoc = {}; // mapId -> markerId -> {name?, description?}
  for (const mapId of mapIds) {
    const bySubtype = new Map();
    for (const c of candidates[mapId]) {
      if (!bySubtype.has(c.subtype)) bySubtype.set(c.subtype, []);
      bySubtype.get(c.subtype).push(c);
    }
    markers[mapId] = [];
    markerLoc[mapId] = {};
    for (const s of src.subtypes) {
      const list = (bySubtype.get(s.id) ?? []).sort((a, b) =>
        a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : a.x - b.x || a.y - b.y);
      list.forEach((c, i) => {
        const id = `${mapId}-${s.id}-${i + 1}`;
        markers[mapId].push({
          id, subtype: s.id, category: subtypeCat[s.id],
          x: c.x, y: c.y, z: c.z,
          ...(c.icon ? { icon: c.icon } : {}),
          images: [], contributors: [], indexInSubtype: i + 1,
        });
        if (c.name || c.description) {
          markerLoc[mapId][id] = {
            ...(c.name ? { name: c.name } : {}),
            ...(c.description ? { description: c.description } : {}),
          };
        }
      });
    }
  }

  // Locales — game-derived names are ja in all languages (spec decision 6);
  // taxonomy/map labels are hand-authored per language in types.yaml.
  const locales = {};
  for (const lng of src.languages) {
    locales[lng] = {
      maps: Object.fromEntries(src.maps.map((m) => [m.id, {
        name: m.names[lng], description: '', shortName: m.shortNames[lng],
      }])),
      types: {
        categories: Object.fromEntries(src.categories.map((c) => [c.id, { name: c.names[lng] }])),
        subtypes: Object.fromEntries(src.subtypes.map((s) => [s.id, { name: s.names[lng], description: '' }])),
      },
      markers: markerLoc,           // identical across languages (ja names)
      regions: Object.fromEntries(mapIds.map((id) => [id, {}])),
    };
  }

  const regions = Object.fromEntries(mapIds.map((id) => [id, []]));
  return { maps, types, markers, regions, locales };
}

export async function runEmit(parsedDir, dataOut) {
  const ds = buildDataset(readParsed(parsedDir));
  const w = (rel, obj) => {
    const f = path.join(dataOut, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(obj, null, 1));
  };
  w('maps.json', ds.maps);
  w('types.json', ds.types);
  for (const [mapId, list] of Object.entries(ds.markers)) w(`markers/${mapId}.json`, list);
  for (const [mapId, list] of Object.entries(ds.regions)) w(`regions/${mapId}.json`, list);
  for (const [lng, l] of Object.entries(ds.locales)) {
    w(`locales/${lng}/maps.json`, l.maps);
    w(`locales/${lng}/types.json`, l.types);
    for (const mapId of Object.keys(ds.markers)) {
      w(`locales/${lng}/markers/${mapId}.json`, l.markers[mapId]);
      w(`locales/${lng}/regions/${mapId}.json`, l.regions[mapId]);
    }
  }
  for (const [mapId, list] of Object.entries(ds.markers)) console.log(`emit: ${mapId} ${list.length} markers`);
}
```

Note for the implementer: `buildDataset`'s `markers` locale block stores `markerLoc` (an object keyed by mapId); the test accesses `ds.locales.en.markers.MainWorld[...]` — this shape is intentional.

- [ ] **Step 5: Run tests, run the stage, validate against the contract**

```bash
npx vitest run test/emit.test.mjs        # Expected: 5 passed
npm run extract && npm run emit          # writes E:/aion2-map/data-palworld
cd E:/aion2-map/frontend/.claude/worktrees/multi-game-map-platform
pnpm validate-data E:/aion2-map/data-palworld
```

Expected: validate-data exits 0. If it reports shape errors (e.g. `types.json` field names), fix `emit.mjs` to match `packages/data-contract` — the contract wins — and re-run both the unit test and the gate.

Sanity-check counts printed by emit: MainWorld should carry most markers; total fastTravel across both maps = 152, dungeon = 157, resources = 39/27/23/23, treasureMap = 42, note = 15, eagleStatue = 22; fieldBoss ≤ 90 (90 in source; any outside both bounds are dropped); palSpawn in the low hundreds per map (clustered from ~8k placements). If palSpawn is >1000 per map, report DONE_WITH_CONCERNS (spec §8 knob: raise radius in types.yaml).

- [ ] **Step 6: Initialize the data repo and commit both repos**

```bash
cd E:/aion2-map/data-palworld && git init && git add -A && git commit -m "feat: initial Palworld contract-v1 dataset (extractor emit)"
cd $TOOLS_WT
git add palworld/data_src/types.yaml palworld/src/emit.mjs palworld/test/emit.test.mjs
git commit -m "feat(palworld): emit stage - contract-v1 dataset with taxonomy, clustering, locales"
```

### Task 7: `tiles` stage — WebP tiles + icons + `resource-palworld` repo

**Files:**
- Create: `$TOOLS_WT/palworld/src/tiles.mjs`
- Create: git repo `E:/aion2-map/resource-palworld`

- [ ] **Step 1: Implement `src/tiles.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const MAP_IMAGES = { MainWorld: 'Texture/UI/Map/T_WorldMap.png', WorldTree: 'Texture/UI/Map/T_TreeMap.png' };
const TILE = 1024, COUNT = 8;
const pad2 = (n) => String(n).padStart(2, '0');

function collectIconNames(dataOut) {
  const icons = new Set();
  // Contract shapes: types.json nests subtypes under categories; markers files wrap in {markers}.
  const types = JSON.parse(fs.readFileSync(path.join(dataOut, 'types.json'), 'utf8'));
  for (const c of types.categories) for (const s of c.subtypes) if (s.icon) icons.add(s.icon);
  for (const f of fs.readdirSync(path.join(dataOut, 'markers'))) {
    const { markers } = JSON.parse(fs.readFileSync(path.join(dataOut, 'markers', f), 'utf8'));
    for (const m of markers) if (m.icon) icons.add(m.icon);
  }
  return icons;
}

function iconSourcePath(raw, name) {
  const compass = path.join(raw, 'Texture/UI/InGame', `${name}.png`);
  if (name.startsWith('T_icon_compass_') && fs.existsSync(compass)) return compass;
  const pal = path.join(raw, 'Texture/PalIcon/Normal', `${name}.png`);
  if (fs.existsSync(pal)) return pal;
  return null;
}

export async function runTiles(raw, dataOut, resOut) {
  for (const [mapId, imgRel] of Object.entries(MAP_IMAGES)) {
    const dir = path.join(resOut, 'tiles', mapId);
    fs.mkdirSync(dir, { recursive: true });
    const img = sharp(path.join(raw, imgRel), { limitInputPixels: false });
    for (let x = 0; x < COUNT; x++) {
      for (let y = 0; y < COUNT; y++) {
        await img.clone()
          .extract({ left: x * TILE, top: y * TILE, width: TILE, height: TILE })
          .webp({ quality: 90 })
          .toFile(path.join(dir, `${mapId}_${pad2(x)}_${pad2(y)}.webp`));
      }
    }
    console.log(`tiles: ${mapId} 64 tiles`);
  }

  const iconDir = path.join(resOut, 'icons');
  fs.mkdirSync(iconDir, { recursive: true });
  let ok = 0, missing = [];
  for (const name of collectIconNames(dataOut)) {
    const src = iconSourcePath(raw, name);
    if (!src) { missing.push(name); continue; }
    await sharp(src).webp({ quality: 90 }).toFile(path.join(iconDir, `${name}.webp`));
    ok++;
  }
  console.log(`icons: ${ok} converted`);
  if (missing.length) console.warn('icons missing sources:', missing);
}
```

- [ ] **Step 2: Run the stage and verify output**

```bash
cd $TOOLS_WT/palworld && npm run tiles
ls E:/aion2-map/resource-palworld/tiles/MainWorld | wc -l    # Expected: 64
ls E:/aion2-map/resource-palworld/tiles/WorldTree | wc -l    # Expected: 64
ls E:/aion2-map/resource-palworld/icons | wc -l              # Expected: >100 (compass + pal heads)
```

Expected: `icons missing sources: []` absent (no warning). If any icon is missing, fix the emit icon names (Task 6) rather than skipping — the dataset must only reference existing icons.

- [ ] **Step 3: Spot-check one tile visually**

Read (as image) `E:/aion2-map/resource-palworld/tiles/MainWorld/MainWorld_00_00.webp` — Expected: the top-left corner of the world map (ocean/NW landmass), not garbage.

- [ ] **Step 4: Initialize the resource repo and commit both repos**

```bash
cd E:/aion2-map/resource-palworld && git init && git add -A && git commit -m "feat: initial Palworld tiles + icons (WebP)"
cd $TOOLS_WT
git add palworld/src/tiles.mjs
git commit -m "feat(palworld): tiles stage - 1024px WebP tiles and icon conversion"
```

---

### Task 8: `apps/palworld` scaffold (builds clean, dev middleware serves artifacts)

All frontend work happens in `E:/aion2-map/frontend/.claude/worktrees/multi-game-map-platform` (referred to as `$FE_WT`), branch `worktree-multi-game-map-platform`.

**Files:**
- Create: `$FE_WT/apps/palworld/package.json`, `vite.config.ts`, `index.html`, `env.d.ts`, `eslint.config.js`, `.gitignore`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `$FE_WT/apps/palworld/src/main.tsx`, `src/index.css`, `src/i18n.ts`, `src/lib/urls.ts`, `src/App.tsx` (placeholder shell, replaced in Task 9)
- Modify: `$FE_WT/package.json` (root scripts)

**Pattern authority:** mirror `apps/aion2` — copy its `tsconfig*.json` and `eslint.config.js` verbatim, mirror its `vite.config.ts` middleware (`dataRepoProxy`/`resourceUiProxy`) and `package.json` dependency versions exactly (react 19.2, leaflet 1.9.4, react-leaflet 5, i18next 25, tailwindcss 4.1.17, `vite: npm:rolldown-vite@7.2.2`, typescript ~5.9.3, @playwright/test 1.61). No router, no shadcn.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "palworld",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@gamemap/data-contract": "workspace:*",
    "@gamemap/map-engine": "workspace:*",
    "i18next": "<same as aion2>",
    "i18next-browser-languagedetector": "<same as aion2>",
    "leaflet": "<same as aion2>",
    "react": "<same as aion2>",
    "react-dom": "<same as aion2>",
    "react-i18next": "<same as aion2>",
    "react-leaflet": "<same as aion2>"
  },
  "devDependencies": { "<copy the aion2 devDependencies block minus router/shadcn-specific entries>": "" }
}
```

(`<same as aion2>` = paste the literal version string from `apps/aion2/package.json`; keep `vite: npm:rolldown-vite@7.2.2`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `typescript`, `eslint` stack, `@types/*`, `@playwright/test`, `globals`.)

- [ ] **Step 2: Create `vite.config.ts`**

Mirror aion2's static middleware; serve the two artifact repos:

```ts
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'

const DATA_DIR = process.env.PALWORLD_DATA_DIR
  ?? path.resolve(__dirname, '../../../../../../data-palworld')
const RES_DIR = process.env.PALWORLD_RES_DIR
  ?? path.resolve(__dirname, '../../../../../../resource-palworld')

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
}

function staticDirPlugin(name: string, urlPrefix: string, rootDir: string): Plugin {
  const root = path.resolve(rootDir)
  return {
    name,
    configureServer(server) {
      server.middlewares.use(urlPrefix, (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '').split('?')[0])
        const file = path.resolve(path.join(root, rel))
        if (!file.startsWith(root)) { res.statusCode = 403; res.end(); return }
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { next(); return }
        res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-cache')
        fs.createReadStream(file).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    staticDirPlugin('palworld-data', '/data', DATA_DIR),
    staticDirPlugin('palworld-res', '/palres', RES_DIR),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

Note: verify the `__dirname`-relative default against the worktree location (`$FE_WT/apps/palworld` → `E:/aion2-map/data-palworld` is 6 levels up because the worktree lives under `frontend/.claude/worktrees/multi-game-map-platform`); adjust the `../` count so `path.resolve` lands on `E:/aion2-map/data-palworld`, and prefer checking how `apps/aion2/vite.config.ts` computes its default dirs.

- [ ] **Step 3: Create remaining scaffold files**

- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`: copy from `apps/aion2`, adjusting only project-name-specific bits if any.
- `.gitignore`: copy `apps/aion2/.gitignore` (playwright dirs).
- `index.html`: standard Vite shell, `<title>Palworld Map</title>`, `<div id="root">`, `<script type="module" src="/src/main.tsx">`.
- `env.d.ts`:

```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_DATA_BASE_URL?: string
  readonly VITE_RESOURCE_BASE_URL?: string
}
```

- `src/index.css`: `@import "tailwindcss";`
- `src/lib/urls.ts`:

```ts
export const DATA_BASE = import.meta.env.VITE_DATA_BASE_URL ?? '/data'
export const RES_BASE = import.meta.env.VITE_RESOURCE_BASE_URL ?? '/palres'
```

- `src/i18n.ts`:

```ts
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

export const LANGUAGES = ['en', 'zh-CN', 'zh-TW'] as const
export type Language = (typeof LANGUAGES)[number]

const resources = {
  en: { translation: { title: 'Palworld Map', categories: 'Markers', showAll: 'Show all', hideAll: 'Hide all' } },
  'zh-CN': { translation: { title: '帕鲁世界地图', categories: '标记', showAll: '全部显示', hideAll: '全部隐藏' } },
  'zh-TW': { translation: { title: '帕魯世界地圖', categories: '標記', showAll: '全部顯示', hideAll: '全部隱藏' } },
}

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  supportedLngs: [...LANGUAGES],
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
```

- `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './i18n'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- `src/App.tsx` (temporary shell; Task 9 replaces it):

```tsx
export default function App() {
  return <div className="h-screen bg-neutral-900 text-neutral-100">Palworld Map</div>
}
```

- [ ] **Step 4: Root scripts + install**

In `$FE_WT/package.json` add alongside the existing aion2 scripts:

```json
"dev:palworld": "pnpm --filter palworld dev",
"build:palworld": "pnpm --filter palworld build",
"lint:palworld": "pnpm --filter palworld lint",
"e2e:palworld": "pnpm --filter palworld e2e"
```

Run: `cd $FE_WT && pnpm install` — Expected: palworld app linked into the workspace.

- [ ] **Step 5: Verify build + middleware**

```bash
cd $FE_WT && pnpm build:palworld        # Expected: tsc -b clean + vite build succeeds
pnpm dev:palworld -- --port 5177 --strictPort &   # NEVER 5173
curl -s -o /dev/null -w "%{http_code}" http://localhost:5177/data/maps.json      # Expected: 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:5177/palres/tiles/MainWorld/MainWorld_00_00.webp  # Expected: 200
# then kill the dev server
```

- [ ] **Step 6: Commit**

```bash
cd $FE_WT
git add apps/palworld package.json pnpm-lock.yaml
git commit -m "feat(palworld): app scaffold with data/resource dev middleware"
```

### Task 9: App UI — data loading, map view, sidebar, top bar

**Files:**
- Create: `$FE_WT/apps/palworld/src/lib/data.ts`, `src/lib/assets.ts`, `src/theme.ts`, `src/components/TopBar.tsx`, `src/components/Sidebar.tsx`
- Modify: `$FE_WT/apps/palworld/src/App.tsx` (replace shell)

**Type authority:** `packages/map-engine/src/engineTypes.ts` (EngineMarker, MapAssets, GameMapViewProps, GameMapViewLabels), `packages/map-engine/src/theme.ts` (MapTheme, DEFAULT_MAP_THEME), `packages/data-contract/src/types.ts` (GameMapMeta, MarkerInstance, taxonomy). The code below matches these as researched; where a property name differs, the package source wins. Check how `apps/aion2` constructs `EngineMarker[]` and `MapAssets` and follow that pattern.

- [ ] **Step 1: `src/lib/data.ts`**

```ts
import { DATA_BASE } from './urls'

const j = async <T>(url: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  return r.json() as Promise<T>
}

export interface MapMeta {
  id: string; name: string; tileWidth: number; tileHeight: number
  tilesCountX: number; tilesCountY: number; isVisible: boolean
}
export interface Taxonomy {
  categories: { id: string }[]
  subtypes: { id: string; category: string; icon?: string; color?: string }[]
}
export interface MarkerRow {
  id: string; subtype: string; category?: string; x: number; y: number; z?: number
  icon?: string; indexInSubtype: number
}
export type MarkerLocale = Record<string, { name?: string; description?: string }>
export interface TypesLocale {
  categories: Record<string, { name: string }>
  subtypes: Record<string, { name: string; description?: string }>
}
export type MapsLocale = Record<string, { name: string; shortName?: string }>

// Contract file shapes (see data-contract schemas): maps.json = {maps:[...]},
// markers/<Map>.json = {markers:[...]}, types.json nests subtypes under categories.
// The nested taxonomy is flattened here so the UI keeps a flat subtype list.
interface TypesFile {
  categories: { id: string; subtypes: { id: string; icon?: string; color?: string }[] }[]
}

export async function loadStatic(lng: string) {
  const [mapsFile, typesFile, mapsL10n, typesL10n] = await Promise.all([
    j<{ maps: MapMeta[] }>(`${DATA_BASE}/maps.json`),
    j<TypesFile>(`${DATA_BASE}/types.json`),
    j<MapsLocale>(`${DATA_BASE}/locales/${lng}/maps.json`),
    j<TypesLocale>(`${DATA_BASE}/locales/${lng}/types.json`),
  ])
  const types: Taxonomy = {
    categories: typesFile.categories.map((c) => ({ id: c.id })),
    subtypes: typesFile.categories.flatMap((c) =>
      c.subtypes.map((s) => ({ ...s, category: c.id }))),
  }
  return { maps: mapsFile.maps, types, mapsL10n, typesL10n }
}

export async function loadMarkers(mapId: string, lng: string) {
  const [markersFile, l10n] = await Promise.all([
    j<{ markers: MarkerRow[] }>(`${DATA_BASE}/markers/${mapId}.json`),
    j<MarkerLocale>(`${DATA_BASE}/locales/${lng}/markers/${mapId}.json`),
  ])
  return { markers: markersFile.markers, l10n }
}
```

- [ ] **Step 2: `src/lib/assets.ts` and `src/theme.ts`**

```ts
// assets.ts
import type { MapAssets } from '@gamemap/map-engine'
import { RES_BASE } from './urls'

const pad2 = (n: number) => String(n).padStart(2, '0')

export const palworldAssets: MapAssets = {
  tileUrl: (map, x, y) => `${RES_BASE}/tiles/${map.id}/${map.id}_${pad2(x)}_${pad2(y)}.webp`,
  markerIconUrl: (icon) => (icon ? `${RES_BASE}/icons/${icon}.webp` : ''),
}
```

```ts
// theme.ts
import { DEFAULT_MAP_THEME, type MapTheme } from '@gamemap/map-engine'

export const palworldTheme: MapTheme = {
  ...DEFAULT_MAP_THEME,
  completedAccent: '#4fa8ff',
}
```

(Adjust member names to the actual `MapAssets`/`MapTheme` signatures in the package if they differ — e.g. `tileUrl(map, x, y)` argument shapes.)

- [ ] **Step 3: `src/components/TopBar.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'

interface Props {
  maps: { id: string; label: string }[]
  activeMapId: string
  onSelectMap: (id: string) => void
}

export function TopBar({ maps, activeMapId, onSelectMap }: Props) {
  const { t, i18n } = useTranslation()
  return (
    <header className="flex h-12 items-center gap-4 border-b border-neutral-700 bg-neutral-900 px-4 text-neutral-100">
      <h1 className="text-sm font-semibold">{t('title')}</h1>
      <nav className="flex gap-1">
        {maps.map((m) => (
          <button
            key={m.id}
            data-testid={`map-tab-${m.id}`}
            onClick={() => onSelectMap(m.id)}
            className={`rounded px-3 py-1 text-sm ${m.id === activeMapId ? 'bg-amber-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}
          >
            {m.label}
          </button>
        ))}
      </nav>
      <select
        aria-label="language"
        className="ml-auto rounded bg-neutral-800 px-2 py-1 text-sm"
        value={i18n.resolvedLanguage}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
      >
        {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
    </header>
  )
}
```

- [ ] **Step 4: `src/components/Sidebar.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import type { Taxonomy, TypesLocale } from '../lib/data'

interface Props {
  types: Taxonomy
  typesL10n: TypesLocale
  visible: Set<string>
  onToggle: (subtypeId: string) => void
  onSetAll: (on: boolean) => void
}

export function Sidebar({ types, typesL10n, visible, onToggle, onSetAll }: Props) {
  const { t } = useTranslation()
  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-100">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">{t('categories')}</span>
        <span className="flex gap-2 text-xs">
          <button className="text-amber-400 hover:underline" onClick={() => onSetAll(true)}>{t('showAll')}</button>
          <button className="text-neutral-400 hover:underline" onClick={() => onSetAll(false)}>{t('hideAll')}</button>
        </span>
      </div>
      {types.categories.map((cat) => (
        <section key={cat.id} className="mb-3">
          <h2 className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
            {typesL10n.categories[cat.id]?.name ?? cat.id}
          </h2>
          {types.subtypes.filter((s) => s.category === cat.id).map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-neutral-800">
              <input
                type="checkbox"
                data-testid={`subtype-toggle-${s.id}`}
                checked={visible.has(s.id)}
                onChange={() => onToggle(s.id)}
              />
              <span>{typesL10n.subtypes[s.id]?.name ?? s.id}</span>
            </label>
          ))}
        </section>
      ))}
    </aside>
  )
}
```

- [ ] **Step 5: `src/App.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameMapView, type EngineMarker } from '@gamemap/map-engine'
import { loadStatic, loadMarkers, type MapMeta, type Taxonomy, type TypesLocale, type MapsLocale, type MarkerRow, type MarkerLocale } from './lib/data'
import { palworldAssets } from './lib/assets'
import { palworldTheme } from './theme'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'

export default function App() {
  const { i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en'

  const [staticData, setStaticData] = useState<{
    maps: MapMeta[]; types: Taxonomy; mapsL10n: MapsLocale; typesL10n: TypesLocale
  } | null>(null)
  const [mapId, setMapId] = useState('MainWorld')
  const [markerData, setMarkerData] = useState<{ markers: MarkerRow[]; l10n: MarkerLocale } | null>(null)
  const [visible, setVisible] = useState<Set<string>>(new Set())
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)

  useEffect(() => {
    loadStatic(lng).then((d) => {
      setStaticData(d)
      setVisible((v) => (v.size ? v : new Set(d.types.subtypes.map((s) => s.id))))
    })
  }, [lng])

  useEffect(() => {
    setMarkerData(null)
    loadMarkers(mapId, lng).then(setMarkerData)
  }, [mapId, lng])

  const map = staticData?.maps.find((m) => m.id === mapId) ?? null

  const engineMarkers: EngineMarker[] = useMemo(() => {
    if (!staticData || !markerData) return []
    return markerData.markers.map((m) => {
      const loc = markerData.l10n[m.id]
      const subLabel = staticData.typesL10n.subtypes[m.subtype]?.name ?? m.subtype
      return {
        id: m.id,
        subtype: m.subtype,
        category: m.category,
        x: m.x,
        y: m.y,
        icon: m.icon,
        localizedName: loc?.name ?? subLabel,
        localizedDescription: loc?.description,
        subtypeLabel: subLabel,
        subtypeMeta: staticData.types.subtypes.find((s) => s.id === m.subtype),
        completed: false,
      }
    })
  }, [staticData, markerData])

  const onToggle = useCallback((id: string) => {
    setVisible((v) => {
      const next = new Set(v)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  if (!staticData || !map) return <div className="flex h-screen items-center justify-center bg-neutral-900 text-neutral-400">Loading…</div>

  return (
    <div className="flex h-screen flex-col bg-neutral-900">
      <TopBar
        maps={staticData.maps.map((m) => ({ id: m.id, label: staticData.mapsL10n[m.id]?.shortName ?? staticData.mapsL10n[m.id]?.name ?? m.id }))}
        activeMapId={mapId}
        onSelectMap={setMapId}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          types={staticData.types}
          typesL10n={staticData.typesL10n}
          visible={visible}
          onToggle={onToggle}
          onSetAll={(on) => setVisible(on ? new Set(staticData.types.subtypes.map((s) => s.id)) : new Set())}
        />
        <main className="min-w-0 flex-1">
          <GameMapView
            map={map}
            markers={engineMarkers}
            regions={[]}
            visibleSubtypes={visible}
            showLabels={false}
            showBorders={false}
            lodEnabled={false}
            selectedMarkerId={selectedMarkerId}
            selectedPosition={null}
            onToggleMarker={(id) => setSelectedMarkerId((cur) => (cur === id ? null : id))}
            subzoneAt={() => ''}
            flyToDuration={0.5}
            assets={palworldAssets}
            theme={palworldTheme}
            exposeTestHandle={import.meta.env.DEV}
            renderPopupContent={(marker) => (
              <div className="max-w-60">
                <div className="font-semibold">{marker.localizedName}</div>
                {marker.localizedDescription && (
                  <div className="mt-1 whitespace-pre-line text-xs text-neutral-300">{marker.localizedDescription}</div>
                )}
              </div>
            )}
            labels={{ copyPosition: 'Copy position', noMapSelected: 'No map selected', zoomIn: '+', zoomOut: '−' }}
          />
        </main>
      </div>
    </div>
  )
}
```

Adapt props to the real `GameMapViewProps` (check `packages/map-engine/src/engineTypes.ts` and aion2's usage — e.g. `map` may need conversion from `GameMapMeta` to an engine map type, `visibleSubtypes` may be an array, `renderPopupContent` signature may include extras). Do not add engine code or new engine props — everything must work with the engine as-is.

- [ ] **Step 6: Type-check, lint**

Run: `cd $FE_WT && pnpm --filter palworld exec tsc -b && pnpm lint:palworld` — Expected: both clean.

- [ ] **Step 7: Browser-verify (implementer does this before claiming done)**

```bash
cd $FE_WT && pnpm dev:palworld -- --port 5177 --strictPort
```

With Playwright MCP or a browser against `http://localhost:5177` (NEVER 5173):
1. Map renders MainWorld tiles; markers visible.
2. Click a fast-travel marker → popup with name.
3. Uncheck `palSpawn` in sidebar → pal markers disappear.
4. Switch to the WorldTree tab → tiles swap, markers reload.
5. Switch language to zh-CN → sidebar/taxonomy labels change (marker names stay ja — expected per spec).
Kill the dev server afterwards.

- [ ] **Step 8: Commit**

```bash
git add apps/palworld/src
git commit -m "feat(palworld): map screen - data loading, sidebar filters, map/lang switching"
```

---

### Task 10: Playwright smoke e2e

**Files:**
- Create: `$FE_WT/apps/palworld/playwright.config.ts`
- Create: `$FE_WT/apps/palworld/e2e/smoke.spec.ts`

- [ ] **Step 1: `playwright.config.ts`** (mirror `apps/aion2/playwright.config.ts`, port 5188)

```ts
import { defineConfig } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 5188)

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `pnpm dev --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
```

- [ ] **Step 2: `e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('renders MainWorld tiles', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('img.leaflet-tile[src*="/tiles/MainWorld/"]').first()).toBeVisible()
})

test('fast-travel markers are present', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.locator('.leaflet-marker-pane img[src*="T_icon_compass_FTtower"]').first(),
  ).toBeVisible()
})

test('toggling a subtype hides its markers', async ({ page }) => {
  await page.goto('/')
  const ft = page.locator('.leaflet-marker-pane img[src*="T_icon_compass_FTtower"]')
  await expect(ft.first()).toBeVisible()
  await page.getByTestId('subtype-toggle-fastTravel').uncheck()
  await expect(ft).toHaveCount(0)
})

test('map switch swaps tile URLs', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('img.leaflet-tile[src*="/tiles/MainWorld/"]').first()).toBeVisible()
  await page.getByTestId('map-tab-WorldTree').click()
  await expect(page.locator('img.leaflet-tile[src*="/tiles/WorldTree/"]').first()).toBeVisible()
})
```

Adjust selectors to what the engine actually renders (inspect the DOM from Task 9's browser check — e.g. marker icons may render as divIcon backgrounds instead of `img`; if so match on the element the engine produces, as aion2's e2e does).

- [ ] **Step 3: Run**

Run: `cd $FE_WT && pnpm e2e:palworld` — Expected: 4 passed.

- [ ] **Step 4: Commit**

```bash
git add apps/palworld/playwright.config.ts apps/palworld/e2e
git commit -m "test(palworld): playwright smoke suite - tiles, markers, filters, map switch"
```

---

### Task 11: Final gates + regression

No new files. Run every gate; all must pass.

- [ ] **Step 1: Dataset gate**

Run: `cd $FE_WT && pnpm validate-data E:/aion2-map/data-palworld` — Expected: exit 0.

- [ ] **Step 2: Engine purity gate**

Run: `pnpm check:engine` — Expected: clean (no Palworld leakage into `packages/map-engine`).

- [ ] **Step 3: Workspace tests + extractor tests**

```bash
cd $FE_WT && pnpm test          # workspace vitest — Expected: all pass
cd $TOOLS_WT/palworld && npx vitest run   # Expected: all pass
```

- [ ] **Step 4: Builds**

Run: `cd $FE_WT && pnpm build:palworld && pnpm build` — Expected: both build clean.

- [ ] **Step 5: AION2 e2e regression**

```bash
cd $FE_WT/apps/aion2
E2E_PORT=5199 RESOURCE_UI_DIR="E:/aion2-map/resource/UI" DATA_DIR="E:/aion2-map/data" pnpm exec playwright test
```

Expected: 23 passed. Known flake: `wiki.spec.ts:20` occasionally fails — retry once before treating as regression.

- [ ] **Step 6: Commit any final fixes**

If gates required fixes, commit them in the repo they touched with `fix(palworld): <what>`.

---

## Self-review record (writing-plans checklist)

- **Spec coverage:** §1 goals → Tasks 4-7 (extractor+artifacts), 8-10 (app), 11 (gates). §3 decisions: 1-2→Task 1, 3→Tasks 6-7, 4→Task 8, 5→Tasks 2/6, 6→Task 6 types.yaml/locales, 7→Task 6 empty regions, 8→Task 9 (`completed:false`, no wiki/backend), 9→Tasks 3/6, 10→Task 6 boss icons, 11→Task 6 (`z` emitted, no tier). §4.2 taxonomy → types.yaml. §6 calibration → Task 5. §7 testing → Tasks 2-6 vitest, 10 e2e, 11 gates. No gaps.
- **Intentional non-placeholders:** Task 5's `<CHOSEN_*>`/golden values are the calibration checkpoint's *output* — they cannot be known before the renders are inspected; the task defines exactly how they get filled. Task 8's `<same as aion2>` version strings point at a single authoritative file to copy from (duplicating them here would rot).
- **Type consistency:** `makeTransform(bounds, orientation, w, h)` used identically in Tasks 2/5/6; `clusterPoints(points, radius)` in 3/6; `runExtract/writeParsed/readParsed` in 4/5/6; `ORIENTATIONS` in 5/6; dataset shapes in 6 match loaders in 9 and locale access in the emit test.




