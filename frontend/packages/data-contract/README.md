# @gamemap/data-contract

Game-agnostic contract for the parsed map dataset that a game's `tools`
pipeline emits into a `data/` repo and the frontend consumes over HTTP.
It contains the TypeScript types, matching zod schemas, and a Node CLI that
validates a real `data/` checkout against the contract.

Dependency rule: this package depends on **zod only** — no React, no Leaflet,
no app imports.

## Exports

- `@gamemap/data-contract` (browser-safe):
  - Types: `GameMapMeta`, `MarkerTypeCategory`, `MarkerTypeSubtype`,
    `MarkerEntityRef`, `MarkerInstance`, `RegionInstance`, `MapsFile`,
    `TypesFile`, `RawMarkersFile`, `RawRegionsFile`, `CONTRACT_VERSION`.
  - Schemas (zod, one per type): `gameMapMetaSchema`, `markerTypeCategorySchema`,
    `markerTypeSubtypeSchema`, `markerEntityRefSchema`, `markerInstanceSchema`,
    `regionInstanceSchema`, `mapsFileSchema`, `typesFileSchema`,
    `rawMarkersFileSchema`, `rawRegionsFileSchema`.
    Each schema is pinned to its interface with a `satisfies z.ZodType<T>`
    drift guard. Schemas are non-strict: data files may carry extra fields
    (e.g. `order` on maps/categories/subtypes, `z` on markers) that the
    contract does not assert.
- `@gamemap/data-contract/validate` (Node-only, uses `node:fs`):
  `validateDataRepo(dir)` → `ValidationIssue[]`.

## Data repo layout (validated)

```
<data>/
  maps.json                    # MapsFile
  types.json                   # TypesFile
  markers/<Map>.json           # RawMarkersFile, one per map
  regions/<Map>.json           # RawRegionsFile, one per map
  locales/<lng>/
    maps.json                  # generated i18n namespace "maps"
    types.json                 # generated i18n namespace "types"
    markers/<Map>.json         # generated i18n namespace "markers/<Map>"
    regions/<Map>.json         # generated i18n namespace "regions/<Map>"
```

The frontend loads the generated locale namespaces from
`<dataBase>/locales/<lng>/<ns>.json` where `<ns>` may be nested
(`markers/<Map>`, `regions/<Map>`); see `apps/aion2/src/i18n.ts`. The
validator checks that every language directory mirrors the root: `maps.json`,
`types.json`, and one `markers/` + `regions/` file per map file at the root.
Game-specific extras (e.g. AION2's `wiki/` namespaces) are not part of the
contract and are ignored.

## Coordinate convention

Marker `x`/`y` and region `borders` are in **image-pixel space of the map
tiles**: origin at the top-left, `y` increases DOWNWARD. The world→pixel
transform happens upstream in the `tools` pipeline; this contract only ever
sees pixel coordinates. Consumers rendering with Leaflet `CRS.Simple`
(y up) must flip once: `lat = mapHeight - y`, `lng = x`.

## Validating a data repo

From the workspace root (Node ≥ 22.18 runs the `.ts` sources directly via
type stripping — no build step):

```bash
pnpm validate-data E:/aion2-map/data   # exit 0 = valid, 1 = issues listed
```

Typecheck this package (the app's `tsc -b` covers only the browser entry):

```bash
pnpm --filter @gamemap/data-contract run check
```

## Changelog

### v1 (`CONTRACT_VERSION = 1`)

- Initial contract, extracted verbatim from `apps/aion2/src/types/game.ts`:
  `GameMapMeta`, `MarkerTypeSubtype`, `MarkerTypeCategory`, `MarkerEntityRef`,
  `MarkerInstance`, `RegionInstance`, `MapsFile`, `TypesFile`,
  `RawMarkersFile`, `RawRegionsFile`.
- Loosening vs. the original app interface: `MarkerTypeSubtype.category` is
  now **optional** — the emitted `types.json` never contains it (verified
  against the real data repo); the app assigns it at load time from the
  parent category.
