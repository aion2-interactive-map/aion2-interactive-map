# @gamemap/map-engine

Game-agnostic Leaflet map engine: the composed interactive map view
(`GameMapView`), the bare tile layer for embeds (`GameMapTiles`), and the
primitives they are built from (coordinate helpers, pin-icon factory, cursor
store, theme tokens). Everything app-specific — asset URLs, i18n strings,
theming, popup content — is **injected via props**; the engine reads no app
context.

The package ships **TypeScript source** (`exports` point at `src/`); the
consuming app's bundler compiles it. There is no build step here.

## Install / wire-up

Workspace dependency plus the peer deps the app already owns:

- **peerDependencies:** `react` ^19, `react-dom` ^19, `leaflet` ^1.9,
  `react-leaflet` ^5 — the app controls the versions; the engine never pins
  its own copies.
- **dependencies:** `@gamemap/data-contract` (data types), `lucide-react`
  (badge glyphs rendered into pin icons).

The app must import two stylesheets **once** (e.g. in its root layout):

```ts
import "leaflet/dist/leaflet.css";
import "@gamemap/map-engine/engine.css";
```

`engine.css` styles the engine-rendered chrome (map shell, zoom control,
status bar, context menu, tooltip/popup skin). The engine is **Tailwind-free**
— no utility classes, no `@apply`; all engine styling lives in that static
stylesheet or inline styles driven by `MapTheme`.

Importing `@gamemap/map-engine` has one side effect: it registers the smooth
wheel-zoom handler on `L.Map` and augments Leaflet's `MapOptions` with
`smoothWheelZoom` / `smoothSensitivity`.

## Coordinate convention

The parsed dataset (markers, regions) and the map tiles are in **image-pixel
space: `y` increases DOWNWARD**, matching the map PNG. Leaflet `CRS.Simple`
treats latitude as increasing upward, so placing data on the tile canvas
requires exactly **one** vertical flip — and it lives in `coords.ts`, nowhere
else:

```
lat = mapHeight - y        lng = x
y   = mapHeight - lat      x   = lng          (mapHeight = tileHeight * tilesCountY)
```

Helpers: `mapHeightOf(map)`, `dataToLatLng(map, x, y)`,
`dataToLatLngTuple(map, x, y)`, `latLngToData(map, lat, lng)`. Route every
data↔Leaflet conversion through them so the flip is never duplicated
(double-flip) or omitted.

## Components

### `GameMapView` (the composed map)

Renders the full map: tiles (+ optional watermark), region fills/borders,
markers with LOD tiers, selection popup, context menu, zoom control, cursor
status bar. All inputs arrive through `GameMapViewProps`:

| Prop | Type | Notes |
| --- | --- | --- |
| `map` | `GameMapMeta?` | Map to render; `undefined` shows the `noMapSelected` empty state. |
| `markers` | `EngineMarker[]` | Pre-localized, subtype-resolved markers (see below). |
| `regions` | `RegionInstance[]` | Region polygons of the current map. |
| `visibleSubtypes` | `Set<string>?` | Subtype filter; `undefined` = filter not initialized → all hidden (selection overrides). |
| `visibleRegions` | `Set<string>?` | Region-fill filter; `undefined` = show all. |
| `showLabels` | `boolean` | Permanent marker-name tooltips. |
| `showBorders` | `boolean` | Region border polylines. |
| `lodEnabled` | `boolean` | Gate higher-tier markers behind zoom thresholds. |
| `selectedMarkerId` | `string \| null` | Currently selected marker. |
| `selectedPosition` | `{x, y} \| null` | Fly-to target (search / deep-link), DATA image space. |
| `onToggleMarker` | `(id: string \| null) => void` | Marker/background click, popup close; `null` deselects. |
| `subzoneAt` | `(x, y) => string` | DATA-space point → localized subzone name for the status bar. |
| `flyToDuration` | `number` | Fly-to animation duration (seconds). |
| `mapRef` | `RefObject<MapRef>` | Escape hatch to the Leaflet `L.Map` instance (`MapRef = L.Map \| null`). |
| `assets` | `MapAssets` | Asset-URL resolver — **required, no default** (see below). |
| `theme` | `MapTheme?` | Color tokens for engine chrome; defaults to `DEFAULT_MAP_THEME` (AION2 Lanhu palette). |
| `renderPopupContent` | `(marker: EngineMarker) => ReactNode` | App-side popup body (links, actions, wiki refs...). |
| `labels` | `GameMapViewLabels?` | Engine-rendered UI strings (i18n stays app-side): `copyPosition`, `noMapSelected`, `zoomIn`, `zoomOut`, optional `footerText`. |
| `exposeTestHandle` | `boolean?` | Dev/e2e only: publishes the Leaflet map on `window.__leafletMap`. |

#### `EngineMarker`

`MarkerInstance` (from the data contract) extended with what the app resolves
before handing markers to the engine — so the engine never touches i18n or the
marker-type taxonomy:

- `localizedName: string` — may be `""`; consumers fall back
  `localizedName || name || subtypeLabel`.
- `localizedDescription?: string`
- `subtypeLabel: string` — localized subtype display name (last-resort label).
- `subtypeMeta?: MarkerTypeSubtype` — icon/scale/color/completion options;
  `undefined` when the subtype is missing from the taxonomy.
- `completed?: boolean` — drives icon dim/swap.

#### `MapAssets`

URL resolution is injected; the engine never builds URLs:

- `tileUrl(map, x, y)` — tile at grid indices; `(0, 0)` is the top-left tile,
  `y` increases downward. The tile layer rejects out-of-grid indices itself,
  so implementations only see valid indices.
- `markerIconUrl(icon, map)` — marker game-icon URL; `icon` may be
  `""`/`undefined`, implementations pick the fallback. `map` allows per-map
  variants (e.g. AION2 swaps Light→Dark icons on dark maps).
- `watermarkUrl?` — optional tiled watermark; omit to disable the layer.

#### `MapTheme`

`PinTheme` (`pinDiscBg`, `pinBorder`, `pinDot`, `completedAccent`) plus chrome
tokens (`zoomGlyph`, `statusPillBg`). Defaults: `DEFAULT_PIN_THEME`,
`DEFAULT_MAP_THEME`.

### `GameMapTiles` (bare tile layer, for embeds)

For lightweight embeds (e.g. a wiki page map) that render their own
`MapContainer` without the full chrome:

```tsx
<GameMapTiles selectedMap={map} assets={assets} />
```

Owns the grid math (Leaflet tile coords → game tile grid, out-of-grid
rejection via `noWrap` + empty URL) and delegates URL construction to
`assets.tileUrl` / `assets.watermarkUrl`.

### Primitives

- `createPinIcon(innerIcon, iconScale, completed, options?)` — cached
  `L.DivIcon` factory (variants `image` / `circular` / `pin`, selection
  emphasis, fragment badges, `PinTheme`). Icons are built once per distinct
  appearance and shared, so mounting thousands of markers stays cheap.
- `cursorStore` — cursor position kept out of React state
  (`useSyncExternalStore`-compatible) so mousemove never re-renders the map.
- `coords` helpers — see above.

## Dependency rules (`pnpm check:engine`)

The engine must stay portable across games and hosts. Forbidden inside
`packages/map-engine/src` (enforced by the root `pnpm check:engine` grep):

- `react-i18next` — strings come in via `labels` / pre-localized markers.
- `@tanstack/react-router` — navigation is app-side (`renderPopupContent`).
- `import.meta.env` — no build-time env; configuration comes via props.
- `localStorage` — no persistence; the app owns settings.
- `@/` — no app path aliases.
- Hard-coded `"UI/"` asset paths — all URLs go through `MapAssets`.

Also: no Tailwind classes (engine chrome is styled by `engine.css`), and no
app imports of any kind — the only workspace dependency is
`@gamemap/data-contract`.

## Implementing a new game

1. **Implement `MapAssets`** — `tileUrl` from your tile grid layout,
   `markerIconUrl` from your icon resources, optional `watermarkUrl`.
2. **Provide data** matching `@gamemap/data-contract` (`maps.json`, `types.json`,
   `markers/<Map>.json`, `regions/<Map>.json`) in image-pixel space (y-down).
3. **Build `EngineMarker[]` in your adapter** — localize names, resolve each
   marker's `subtypeMeta`/`subtypeLabel` from your taxonomy, attach
   `completed` from your user state.
4. **Optionally** pass a `MapTheme` (defaults are AION2-flavored) and `labels`
   (defaults are English-ish placeholders — always pass real strings in
   production).
5. **Render** `<GameMapView …/>` with your filters/selection state, and import
   `engine.css` + `leaflet.css` once. Use `GameMapTiles` for embeds.
