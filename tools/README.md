
## Raw data input (added Phase 0)
The tools transform the raw game export into the `data/` and `resource/` repos.
Copy `.env.example` to `.env` and set `RAW_DATA_PATH` to the export root
(default `G:/NCSoft/Export/Exports/AION2/Content`). Wiring lands in Phase 1.

## PNG → WebP asset conversion
`aion2/tools/assets/convert_webp.py` recursively converts every `*.png` under a
source root to `*.webp` under a destination root, mirroring the tree. It is
idempotent (skips up-to-date `.webp`) — re-run freely; pass `--force` to redo all.

```bash
# Marker icons (Resource/Texture/Icon -> resource/UI/.../Icon)
uv run python -m aion2.tools.assets.convert_webp \
    "G:/NCSoft/Export/Exports/AION2/Content/UI/Resource/Texture/Icon" \
    "G:/NCSoft/aion2-map/resource/UI/Resource/Texture/Icon"

# A single world map's tiles
uv run python -m aion2.tools.assets.convert_webp \
    "G:/NCSoft/Export/Exports/AION2/Content/UI/Map/WorldMap/World_L_A" \
    "G:/NCSoft/aion2-map/resource/UI/Map/WorldMap/World_L_A"

# Whole UI tree (large)
uv run python -m aion2.tools.assets.convert_webp \
    "G:/NCSoft/Export/Exports/AION2/Content/UI" \
    "G:/NCSoft/aion2-map/resource/UI"
```

Options: `-q/--quality` (default 90), `--lossless`, `-f/--force`.

## Emit frontend dataset → `data/` repo
`aion2/tools/maps/emit_frontend.py` converts the parsed per-map JSON
(`tools/parsed_data/maps/*.json`) into the FRONTEND data schema and writes it
into the sibling `data/` repo as **JSON** (`maps.json`, `types.json`,
`markers/<map>.json`, `regions/<map>.json`, and
`locales/<lng>/{maps,types,markers,regions}.json`). It is idempotent — re-run
freely.

**Data format convention:** generated data is JSON (the frontend consumes
JSON); only hand-authored config is YAML. The `types` definition is authored in
`tools/data_src/types.yaml` and compiled to `data/types.json` by `emit_frontend`
(so humans edit YAML, the frontend gets JSON).

```bash
# All parsed maps
uv run python -m aion2.tools.maps.emit_frontend

# A single map
uv run python -m aion2.tools.maps.emit_frontend --map World_L_A
```

Coverage from the current parse:

| subtype            | category   | raw source |
|--------------------|------------|------------|
| `monolithMaterial` | collection | `MapData.json` `SpawnInfoList` (GodFragment EnvObj) |
| `village`          | location   | `Subzone.json` IconType `EIconType::Village` |
| `battlefield`      | location   | `Subzone.json` IconType `EIconType::Battlefield` |
| `teleport`         | location   | `SpawnInfoList` spawns of EnvObj `Usage == TeleportArtifact` |
| `seal`             | location   | `SpawnInfoList` spawns of EnvObj `Usage == EnterDungeon` whose `UsageValue` is a `Dungeon.json` row with `DungeonType == Seal` + `LinkedMap == <map>` (name from the dungeon `Title`) |
| `hiddenCubeLight`  | collection | `SpawnInfoList` spawns of EnvObj `Category == EEnvObjCategory::HiddenCubeLight` (Elyos) |
| `hiddenCubeDark`   | collection | `SpawnInfoList` spawns of EnvObj `Category == EEnvObjCategory::HiddenCubeDark` (Asmodian) |

NOT yet derivable (omitted): `occupation`. The `GarrisonTerritory` subzones
exist (`Subzone.json` `DisplayName` keys `STR_Subzone_GarrisonTerritory_L1_*`)
but the legacy curated occupation names do not join cleanly to those keys, and
those subzones already partly surface as `village`/`battlefield`. A definitive
occupation-objective table (capturable-fort list with positions + display
names) is still needed.

`types.json` is compiled from `tools/data_src/types.yaml` (icon/canComplete
mapping, hand-authored). Its locales (category/subtype display names) are built
from the curated `frontend/public/locales/<lng>/types.yaml`, with the
`hiddenCube` split into `hiddenCubeLight` (Elyos) / `hiddenCubeDark` (Asmodian).

Region borders are now REAL subzone polygons: `extract.py` reads each subzone's
boundary vertices from `MapData.json` `SubzoneVolumeInfoMap` and transforms them
world→pixel with the same `WorldMapTransform` used for marker `px` (emitted as
`pxBorders`); `emit_frontend.build_regions` turns those into `RegionInstance.borders`
so outlines align with the markers.
