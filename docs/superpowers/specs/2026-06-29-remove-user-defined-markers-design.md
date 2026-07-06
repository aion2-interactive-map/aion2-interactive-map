# Remove user-defined markers (frontend) + flag user-uploaded marker type (backend)

Date: 2026-06-29
Status: Design approved (pending spec review)

## Goal

Remove the **user-defined marker** feature from the active frontend, and **flag**
(not remove) the backend's **user-uploaded marker type** for later removal once the
frontend change has shipped.

- **Frontend:** clean, full removal — leave nothing user-marker-related behind in
  active `src/`.
- **Backend:** flag only (no behavior change) — TODO comments at the precise spots
  plus a central tracking doc. The rest of the user-contribution surface is preserved.

## Context & definitions

"User-defined markers" in the active frontend = the **local, click-to-create personal
markers** persisted to `localStorage` (key prefix `aion2.userMarkers.v1.`). A "pick
mode" turns the cursor into a crosshair; clicking the map calls `createMarker`, which
stores a marker of `type: "local"` and renders it via `UserMarker`. A sidebar toggle
("Show custom markers") controls their visibility.

Notable findings from investigation:

- **`pickMode` is never set to `true` anywhere in active `src/`** (only `useState(false)`
  and `setPickMode(false)` in the context-menu cancel path). The create flow is therefore
  already unreachable; this change excises orphaned wiring plus the visible toggle and the
  `localStorage` render path.
- The frontend `UserMarkerInstance.type` union includes `"feedback"` and `"uploaded"`,
  but those variants are **not wired up** in the active frontend (no backend calls, no
  render path). They disappear with the type under clean removal.
- In the **backend**, the string `"uploaded"` never appears. The "user-uploaded marker
  type" is represented solely by the generic free-string `Marker.type` column. The
  separate `MarkerFeedback.type` field is an unrelated enum (`create`/`update`) and is
  **preserved**.

## Scope decisions (resolved)

1. **Frontend depth:** clean full removal (including the `UserMarkerInstance` /
   `UserMarkerLocalType` types).
2. **Backend:** flag only — and only the **user-uploaded marker type** (`Marker.type`).
   Preserve feedback, user marker progress, comments, contributors, translations, and
   image uploads.
3. **Flag form:** TODO comments in code **plus** a central tracking doc.
4. **`src/_legacy/**`:** **out of scope** — untouched (dead code already slated for
   wholesale Phase-2 removal).
5. **Tracking doc location:** root workspace `docs/deprecations/user-uploaded-marker-type.md`.

## Frontend changes (active `src/` only)

### Files deleted entirely

- `frontend/src/context/UserMarkersContext.tsx`
- `frontend/src/features/map/canvas/UserMarker.tsx`
- `frontend/src/features/map/canvas/MapClickPicker.tsx`
- `frontend/src/features/map/canvas/MapCursorController.tsx`
  — **Design choice:** delete rather than simplify. It existed only to set the crosshair
  cursor in `pickMode`; Leaflet's default `.leaflet-grab` already provides the pan cursor,
  so nothing needs to replace it.

### Files edited (surgical)

- `frontend/src/routes/__root.tsx` — remove the `UserMarkersProvider` import and its
  wrapper element.
- `frontend/src/features/map/canvas/GameMapView.tsx`
  - remove the `useUserMarkers()` destructure (≈ line 149) and related imports (≈ line 13);
  - remove the `<MapCursorController/>` and `<MapClickPicker .../>` renders (≈ 347–348);
  - remove the user-marker render block (≈ 371–375, `!hideUserMarkers ? userMarkers.filter(type==="local")...`);
  - replace the wrapper-div cursor branch (≈ line 313) `cursor: pickMode ? "crosshair" : "default"`
    with `cursor: "default"`;
  - keep `<MapContextMenu/>` (it powers copy-position) but stop passing the `createMarker` prop.
- `frontend/src/features/map/canvas/MapContextMenu.tsx` — remove the `useUserMarkers`
  import and the `pickMode` cancel branch (≈ 29–32). Keep all copy-position behavior.
- `frontend/src/features/map/sidebar/MarkerTypes.tsx` — remove the `useUserMarkers()`
  line (≈ 85) and the "Show custom markers" button block (≈ 156–163).
- `frontend/src/features/map/canvas/markerIcons.tsx` — remove `USER_MARKER_LOCAL_ICON_MAP`
  and `getUserMarkerLocalIcon` (≈ 178–196). Leave game-marker icon code intact.
- `frontend/src/types/game.ts` — remove `UserMarkerInstance` and `UserMarkerLocalType`
  (≈ 91–113).
- `frontend/src/lib/constants.ts` — remove `USER_MARKERS_STORAGE_PREFIX` (≈ line 6).

### Locales

Remove keys that are exclusively user-marker-related, each only after confirming there is
no remaining reference in active `src/`:

- `frontend/public/locales/en/common.yaml` — `menu.showCustomMarkers`, `markerActions.remove`.
- `frontend/public/locales/zh-CN/common.yaml` — `menu.showCustomMarkers`,
  `menu.hideUserMarkers`, `markerActions.remove`.
- `frontend/public/locales/zh-TW/common.yaml` — `menu.showCustomMarkers`,
  `markerActions.remove` (and `menu.hideUserMarkers` if present).

Leave the rest of any `markerActions:` block intact (other keys may be referenced by
`_legacy`, which is out of scope; unused YAML keys are harmless).

### Explicitly NOT changed

- `frontend/src/_legacy/**` — untouched.
- Game-data marker rendering, region borders, marker progress/completion, copy-position
  context menu — all unaffected.

## Backend changes (flag only — no behavior change)

Add a TODO comment at each spot. Suggested wording:

```
# TODO(remove): user-uploaded marker type — pending frontend removal of user-defined
# markers. See docs/deprecations/user-uploaded-marker-type.md. Do NOT remove yet.
```

Spots:

- `backend/aion2/backend/models/marker.py:35` — the `type` column on `Marker`.
- `backend/aion2/backend/schemas/marker.py` — `MarkerRead.type` (≈ 36),
  `MarkerCreate.type` (≈ 52), `MarkerUpdate.type` (≈ 67).
- `backend/alembic/versions/15e8acb1c571_add_type_in_marker.py` — note in the module
  docstring (do not alter `upgrade`/`downgrade`; history must stay runnable).

**Preserved untouched:** `MarkerFeedback` (model/schema/endpoints/migrations),
`UserMarkerProgress`, `MarkerComment`, `MarkerContributor`, `MarkerImage` uploads,
`MarkerTranslation`.

### Tracking doc

Create `docs/deprecations/user-uploaded-marker-type.md` (root workspace) containing:

- What is being deprecated (the `Marker.type` "uploaded" concept) and why (frontend
  user-defined markers removed; `Marker.type` has no remaining producer/consumer).
- The exact code locations flagged (the list above).
- Removal precondition: frontend removal shipped and confirmed; verify no client still
  sends/reads `Marker.type` before dropping the column (requires a follow-up Alembic
  migration).
- Explicit note that `MarkerFeedback.type` is unrelated and must NOT be removed.

## Verification

**Frontend:**
- `tsc --noEmit` (or `vite build`) passes — proves no dangling imports/types.
- Lint passes (no unused imports/vars left behind).
- `grep` over active `src/` (excluding `_legacy`) returns zero matches for
  `UserMarker`, `useUserMarkers`, `pickMode`, `USER_MARKERS_STORAGE_PREFIX`,
  `showCustomMarkers`, `hideUserMarkers`, `getUserMarkerLocalIcon`.
- App loads; map renders game markers; sidebar no longer shows "Show custom markers";
  copy-position context menu still works.

**Backend:**
- Comment-only change: app imports/starts unchanged; existing tests pass with no
  modification. The tracking doc exists and lists the flagged spots.

## Out of scope / follow-ups

- Actually dropping `Marker.type` (new Alembic migration) — deferred until the removal
  precondition in the tracking doc is met.
- Wholesale removal of `src/_legacy/**` — separate Phase-2 cleanup.
