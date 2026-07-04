import React, { useSyncExternalStore } from "react";
import { cursorStore } from "../cursorStore.ts";

type Props = {
  displayCoords: (x: number, y: number) => { x: number; y: number };
  /** `(x, y)` DATA-space → localized subzone name (app-side lookup). */
  subzoneAt: (x: number, y: number) => string;
  footerText?: string;
  pillBg: string;
};

// Lanhu footer: white text on the bottom-left of the map. Optional injected
// footer text floats directly on the map (with a dark text-shadow); below it,
// the live cursor coords + subzone sit on a translucent themed pill. Both lines
// are left-aligned to the pill's left edge.
const TEXT_SHADOW = "0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.6)";

const MapStatusBar: React.FC<Props> = ({
  displayCoords,
  subzoneAt,
  footerText,
  pillBg,
}) => {
  const pos = useSyncExternalStore(
    cursorStore.subscribe,
    cursorStore.getSnapshot,
  );
  const subzone = pos ? subzoneAt(pos.x, pos.y) : "";

  const d = pos ? displayCoords(pos.x, pos.y) : null;

  return (
    <div className="gm-statusbar">
      <div className="gm-statusbar-stack">
        {footerText && (
          <span
            className="gm-statusbar-footer"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {footerText}
          </span>
        )}
        <div
          data-testid="map-coords"
          className="gm-statusbar-pill"
          style={{ textShadow: TEXT_SHADOW, backgroundColor: pillBg }}
        >
          <span className="gm-statusbar-coords">
          {d ? `x:${Math.round(d.x)},y:${Math.round(d.y)}` : "x:--,y:--"}
          </span>
          {subzone && <span className="gm-statusbar-subzone">{subzone}</span>}
        </div>
      </div>
    </div>
  );
};

export default MapStatusBar;
