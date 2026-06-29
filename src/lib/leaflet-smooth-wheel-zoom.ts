import L from "leaflet";

/**
 * Smooth, continuous mouse-wheel / trackpad zoom for Leaflet.
 *
 * Leaflet's built-in scroll-wheel zoom is discrete: each wheel burst is
 * debounced into a single animated jump, so scrolling looks/feels steppy and
 * rapid scrolls queue competing animations. This handler replaces it with a
 * per-frame interpolation (requestAnimationFrame) toward a wheel-accumulated
 * target zoom, producing a continuous glide that zooms toward the cursor.
 *
 * Requires `zoomSnap: 0` on the map so the final zoom isn't snapped back to a
 * step.
 *
 * react-leaflet usage: import this module once for its side effect, then
 * configure it through props on `<MapContainer>` (react-leaflet forwards
 * unrecognised props straight into the Leaflet map options, and these fields
 * are added to Leaflet's `MapOptions` by the `declare module` below, so they
 * type-check as props):
 *
 *   import "@/lib/leaflet-smooth-wheel-zoom";
 *   <MapContainer
 *     scrollWheelZoom={false}   // disable the built-in (discrete) handler
 *     smoothWheelZoom={true}    // enable this one
 *     smoothSensitivity={4}     // higher = faster zoom per scroll
 *   />
 *
 * Note: react-leaflet reads map options once at creation — changing the props
 * later does not re-configure the live map (same as `zoom`/`center`).
 *
 * Adapted from mutsuyuki/Leaflet.SmoothWheelZoom
 * (https://github.com/mutsuyuki/Leaflet.SmoothWheelZoom) — MIT-licensed per the
 * repo's LICENSE file (the upstream .js carries no inline header) — following
 * the react-leaflet prop-based integration of
 * github.com/AdrianKlm/react-leaflet-smooth-wheel-zoom. It relies on a few
 * Leaflet private methods (`_stop`, `_move`, `_moveStart`, `_moveEnd`,
 * `_limitZoom`, `_panAnim`, `_container`); verified against Leaflet 1.9.x —
 * re-check on a Leaflet major upgrade.
 */

declare module "leaflet" {
  interface MapOptions {
    /** Enable the smooth wheel-zoom handler. `"center"` zooms toward the map
     *  center instead of the cursor. Defaults to true once this module loads. */
    smoothWheelZoom?: boolean | "center";
    /** Zoom speed multiplier for the smooth handler (higher = faster). */
    smoothSensitivity?: number;
  }
}

// Leaflet's public types don't expose the private map internals this handler
// needs; `m` is the live L.Map cast to a loose shape for those accesses.
/* eslint-disable @typescript-eslint/no-explicit-any */
const SmoothWheelZoom = L.Handler.extend({
  addHooks(this: any) {
    L.DomEvent.on(this._map._container, "wheel", this._onWheelScroll, this);
  },

  removeHooks(this: any) {
    L.DomEvent.off(this._map._container, "wheel", this._onWheelScroll, this);
  },

  _onWheelScroll(this: any, e: WheelEvent) {
    if (!this._isWheeling) this._onWheelStart(e);
    this._onWheeling(e);
  },

  _onWheelStart(this: any, e: WheelEvent) {
    const map = this._map;
    this._isWheeling = true;
    this._wheelMousePosition = map.mouseEventToContainerPoint(e);
    this._centerPoint = map.getSize()._divideBy(2);
    this._startLatLng = map.containerPointToLatLng(this._centerPoint);
    this._wheelStartLatLng = map.containerPointToLatLng(this._wheelMousePosition);
    this._moved = false;
    map._stop();
    if (map._panAnim) map._panAnim.stop();
    this._goalZoom = map.getZoom();
    this._prevCenter = map.getCenter();
    this._prevZoom = map.getZoom();
    this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this));
  },

  _onWheeling(this: any, e: WheelEvent) {
    const map = this._map;
    const sensitivity = map.options.smoothSensitivity ?? 1;
    this._goalZoom =
      this._goalZoom + L.DomEvent.getWheelDelta(e) * 0.003 * sensitivity;
    if (this._goalZoom < map.getMinZoom() || this._goalZoom > map.getMaxZoom()) {
      this._goalZoom = map._limitZoom(this._goalZoom);
    }
    this._wheelMousePosition = map.mouseEventToContainerPoint(e);

    clearTimeout(this._timeoutId);
    this._timeoutId = setTimeout(this._onWheelEnd.bind(this), 200);

    L.DomEvent.preventDefault(e);
    L.DomEvent.stopPropagation(e);
  },

  _onWheelEnd(this: any) {
    this._isWheeling = false;
    cancelAnimationFrame(this._zoomAnimationId);
    this._map._moveEnd(true);
  },

  _updateWheelZoom(this: any) {
    const map = this._map;

    // Bail (and stop the loop) if something else moved the map under us.
    if (
      !map.getCenter().equals(this._prevCenter) ||
      map.getZoom() !== this._prevZoom
    ) {
      return;
    }

    this._zoom = map.getZoom() + (this._goalZoom - map.getZoom()) * 0.3;
    this._zoom = Math.floor(this._zoom * 100) / 100;

    const delta = this._wheelMousePosition.subtract(this._centerPoint);
    if (delta.x !== 0 || delta.y !== 0) {
      if (map.options.smoothWheelZoom === "center") {
        this._center = this._startLatLng;
      } else {
        this._center = map.unproject(
          map.project(this._wheelStartLatLng, this._zoom).subtract(delta),
          this._zoom,
        );
      }

      if (!this._moved) {
        map._moveStart(true, false);
        this._moved = true;
      }

      map._move(this._center, this._zoom);
      this._prevCenter = map.getCenter();
      this._prevZoom = map.getZoom();
    }

    this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this));
  },
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// Register safe defaults so the handler works even if a consumer omits the
// props; per-map `<MapContainer>` props (smoothWheelZoom / smoothSensitivity)
// override these. Callers still set `scrollWheelZoom: false` to avoid running
// both the built-in and smooth handlers.
L.Map.mergeOptions({ smoothWheelZoom: true, smoothSensitivity: 1 });
L.Map.addInitHook("addHandler", "smoothWheelZoom", SmoothWheelZoom);
