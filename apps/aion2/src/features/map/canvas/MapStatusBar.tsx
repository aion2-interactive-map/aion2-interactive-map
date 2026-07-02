import React, { useSyncExternalStore } from "react";
import { cursorStore } from "@gamemap/map-engine";

type Props = {
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

const MapStatusBar: React.FC<Props> = ({ subzoneAt, footerText, pillBg }) => {
  const pos = useSyncExternalStore(
    cursorStore.subscribe,
    cursorStore.getSnapshot,
  );
  const subzone = pos ? subzoneAt(pos.x, pos.y) : "";

  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] select-none">
      <div className="absolute bottom-[22px] left-5 flex flex-col items-start gap-[18px] text-white">
        {footerText && (
          <span
            className="text-[11px] leading-none text-white/80"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {footerText}
          </span>
        )}
        <div
          data-testid="map-coords"
          className="flex items-baseline gap-2.5 rounded-[12px] px-3 py-1.5 text-sm leading-none"
          style={{ textShadow: TEXT_SHADOW, backgroundColor: pillBg }}
        >
          <span className="tabular-nums">
            {pos ? `x:${Math.round(pos.x)},y:${Math.round(pos.y)}` : "x:--,y:--"}
          </span>
          {subzone && <span className="truncate">{subzone}</span>}
        </div>
      </div>
    </div>
  );
};

export default MapStatusBar;
