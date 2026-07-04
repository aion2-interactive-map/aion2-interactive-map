# AION2 Interactive Map

## Development

This is a pnpm workspace monorepo. Each game map is its own app under `apps/`
(`apps/aion2`, `apps/palworld`); commands are game-specific — there is no bare
default.

```bash
pnpm install          # install all workspace dependencies
pnpm dev:aion2        # start dev server for the aion2 app
pnpm build:aion2      # build the aion2 app
pnpm dev:palworld     # start dev server for the palworld app
pnpm build:palworld   # build the palworld app
```

The dev server serves game assets and data from sibling repos expected at
`../resource` and `../data` (relative to this repo). If they live elsewhere,
override with env vars:

```bash
RESOURCE_UI_DIR=/path/to/resource/UI DATA_DIR=/path/to/data pnpm dev:aion2
```

### Monorepo layout

| Path | Description |
|------|-------------|
| `apps/aion2/` | AION2 interactive map (React 19 / Vite / Tailwind / Leaflet) |
| `packages/data-contract/` | `@gamemap/data-contract` — contract types, zod schemas, `validate-data` CLI for the game-data repo format |
| `packages/map-engine/` | `@gamemap/map-engine` — game-agnostic Leaflet map components (props-injection, no i18n/router/env inside) |


## 🔗 License

Copyright (c) 2025 Yihao Liu (tc-imba)

This project consists of:

| Component | Path | License |
|----------|--------|----------|
| Source Code | `apps/*`, `packages/*` | GPL-3.0 |
| Data (images, JSON, assets, etc.) | sibling `data`/`resource` repos | CC BY-NC 4.0 |

---



### 🧠 Code — GPL-3.0
The source code inside the `apps/` and `packages/` directories is Free/Libre Open Source Software (FLOSS) under the GNU General Public License v3.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file for details.

> Full text: https://www.gnu.org/licenses/gpl-3.0.html

---

### 📦 Data — CC BY-NC 4.0
The game data files (served from the sibling `data` and `resource` repos: images, datasets, metadata, and other content) are licensed under Creative Commons **Attribution-NonCommercial 4.0**.

You may reuse them only for **non-commercial** purposes and must give credit.

> Full text: https://creativecommons.org/licenses/by-nc/4.0/

If you require commercial rights to the data, please contact the author.

---

