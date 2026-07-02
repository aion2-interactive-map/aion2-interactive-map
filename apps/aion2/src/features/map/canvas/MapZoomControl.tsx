import React from "react";
import { useMap } from "react-leaflet";

/**
 * Lanhu-style map controls (design "1天族"), pinned top-left inside the map:
 *  - a small vertical pill with + / − zoom buttons
 *    (light bg, #3D3D3D glyphs, rounded, subtle shadow)
 *
 * Replaces the default Leaflet zoom UI (MapContainer must set
 * `zoomControl={false}`).
 */
const GLYPH = "#3D3D3D";

const MapZoomControl: React.FC = () => {
  const map = useMap();

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
    </div>
  );
};

export default MapZoomControl;
