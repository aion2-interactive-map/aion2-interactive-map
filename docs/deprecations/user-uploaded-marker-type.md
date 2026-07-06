# Deprecation: user-uploaded marker type (`markers.type`)

Status: **flagged, not yet removed**
Flagged: 2026-06-29

## What

The "user-uploaded marker type" — represented in the backend solely by the generic
free-string column `markers.type` (`Marker.type`). On the frontend this was the
`type: "uploaded"` variant of user-created markers.

## Why

The frontend **user-defined marker** feature has been removed (local/click-to-create
personal markers, the `UserMarkerInstance` type, and the `"uploaded"`/`"feedback"`
variants in the UI). The string `"uploaded"` never appears in backend logic, and with
the frontend gone `markers.type` has no remaining producer or consumer.

It is **flagged only** for now (no behavior change) so the column can be dropped in a
deliberate follow-up once we've confirmed nothing in the wild still depends on it.

## Flagged locations (backend repo)

- `aion2/backend/models/marker.py` — `Marker.type` column.
- `aion2/backend/schemas/marker.py` — `MarkerRead.type`, `MarkerCreate.type`,
  `MarkerUpdate.type`.
- `alembic/versions/15e8acb1c571_add_type_in_marker.py` — module docstring note (the
  revision's `upgrade`/`downgrade` are intentionally left unchanged).

## NOT part of this deprecation (must stay)

- `MarkerFeedback.type` — an unrelated enum (`create` / `update`) for the feedback flow.
- The whole user-contribution surface is preserved: marker feedback, user marker
  progress, comments, contributors, translations, and image uploads.

## Removal precondition / steps (later)

1. Confirm the frontend removal has shipped and no client sends or reads `markers.type`.
2. Remove the flagged `type` fields from the schemas and the `Marker` model.
3. Add a new Alembic migration that `op.drop_column('markers', 'type')` (do **not** edit
   `15e8acb1c571`).
4. Delete this doc.
