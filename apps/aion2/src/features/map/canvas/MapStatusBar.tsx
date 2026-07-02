import React, { useSyncExternalStore } from "react";
import { cursorStore } from "@gamemap/map-engine";
import { useSubzoneLookup } from "@/features/map/useSubzoneLookup";

const ICP = "沪ICP备2025152827号-1";

// Lanhu "1天族" footer: white text on the bottom-left of the map. The ICP record
// floats directly on the map (with a dark text-shadow); below it, the live
// cursor coords + the subzone under the cursor sit on a translucent grey pill.
// Both lines are left-aligned to the pill's left edge. Geometry follows the
// board (layout = logical px ×2).
const TEXT_SHADOW = "0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.6)";

const MapStatusBar: React.FC = () => {
  const pos = useSyncExternalStore(
    cursorStore.subscribe,
    cursorStore.getSnapshot,
  );
  const subzoneAt = useSubzoneLookup();
  const subzone = pos ? subzoneAt(pos.x, pos.y) : "";

  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] select-none">
      <div className="absolute bottom-[22px] left-5 flex flex-col items-start gap-[18px] text-white">
        <span
          className="text-[11px] leading-none text-white/80"
          style={{ textShadow: TEXT_SHADOW }}
        >
          {ICP}
        </span>
        <div
          data-testid="map-coords"
          className="flex items-baseline gap-2.5 rounded-[12px] bg-[rgba(216,216,216,0.7)] px-3 py-1.5 text-sm leading-none"
          style={{ textShadow: TEXT_SHADOW }}
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
