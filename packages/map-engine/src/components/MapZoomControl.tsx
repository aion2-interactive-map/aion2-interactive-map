import React from "react";
import { useMap } from "react-leaflet";

/**
 * Lanhu-style map controls (design "1天族"), pinned top-left inside the map:
 *  - a small vertical pill with + / − zoom buttons
 *    (light bg, injected glyph color, rounded, subtle shadow)
 *
 * Replaces the default Leaflet zoom UI (MapContainer must set
 * `zoomControl={false}`).
 */
type Props = {
  glyphColor: string;
  zoomInLabel: string;
  zoomOutLabel: string;
};

const MapZoomControl: React.FC<Props> = ({
  glyphColor,
  zoomInLabel,
  zoomOutLabel,
}) => {
  const map = useMap();

  return (
    <div className="gm-zoom">
      {/* + / − zoom pill */}
      <div className="gm-zoom-pill">
        <button
          type="button"
          aria-label={zoomInLabel}
          onClick={() => map.zoomIn()}
          className="gm-zoom-btn"
          style={{ color: glyphColor }}
        >
          +
        </button>
        <div className="gm-zoom-divider" />
        <button
          type="button"
          aria-label={zoomOutLabel}
          onClick={() => map.zoomOut()}
          className="gm-zoom-btn"
          style={{ color: glyphColor }}
        >
          −
        </button>
      </div>
    </div>
  );
};

export default MapZoomControl;
