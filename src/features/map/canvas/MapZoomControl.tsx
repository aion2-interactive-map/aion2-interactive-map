import React from "react";
import { useMap } from "react-leaflet";

/**
 * Lanhu-style map controls (design "1天族"), pinned top-left inside the map:
 *  - a small vertical pill with + / − zoom buttons
 *    (light bg, #3D3D3D glyphs, rounded, subtle shadow)
 *  - two small circular buttons below: reset view (fit) and zoom-to-default.
 *
 * Replaces the default Leaflet zoom UI (MapContainer must set
 * `zoomControl={false}`).
 */
const GLYPH = "#3D3D3D";

const MapZoomControl: React.FC = () => {
  const map = useMap();

  const resetView = () => {
    // Re-fit the full map bounds, falling back to the configured min zoom.
    const bounds = map.options.maxBounds ?? map.getBounds();
    if (bounds) {
      map.fitBounds(bounds);
    } else {
      map.setZoom(map.getMinZoom());
    }
  };

  const zoomDefault = () => {
    map.setView(map.getCenter(), 0);
  };

  return (
    <div className="absolute left-3 top-3 z-[1000] flex flex-col items-center gap-2">
      {/* + / − zoom pill */}
      <div className="flex flex-col overflow-hidden rounded-lg bg-white/95 shadow-md ring-1 ring-black/5">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => map.zoomIn()}
          className="flex h-8 w-8 items-center justify-center text-lg leading-none hover:bg-black/5"
          style={{ color: GLYPH }}
        >
          +
        </button>
        <div className="h-px w-full bg-black/10" />
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => map.zoomOut()}
          className="flex h-8 w-8 items-center justify-center text-lg leading-none hover:bg-black/5"
          style={{ color: GLYPH }}
        >
          −
        </button>
      </div>

      {/* circular zoom-to buttons */}
      <button
        type="button"
        aria-label="Reset view"
        onClick={resetView}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-md ring-1 ring-black/5 hover:bg-black/5"
        style={{ color: GLYPH }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 9V5a2 2 0 0 1 2-2h4" />
          <path d="M21 9V5a2 2 0 0 0-2-2h-4" />
          <path d="M3 15v4a2 2 0 0 0 2 2h4" />
          <path d="M21 15v4a2 2 0 0 1-2 2h-4" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Zoom to default"
        onClick={zoomDefault}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-md ring-1 ring-black/5 hover:bg-black/5"
        style={{ color: GLYPH }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </div>
  );
};

export default MapZoomControl;
