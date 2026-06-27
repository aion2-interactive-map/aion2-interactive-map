import React, { useSyncExternalStore } from "react";
import { cursorStore } from "@/features/map/canvas/cursorStore";

const ICP = "沪ICP备2025152827号-1";

/**
 * Lanhu bottom status bar: grey band with white text — live cursor coords +
 * hovered region name on the left, ICP record on the right. Subscribes to the
 * cursor store directly so only THIS component re-renders on mousemove.
 */
const MapStatusBar: React.FC<{ regionLabel?: string }> = ({ regionLabel }) => {
  const pos = useSyncExternalStore(
    cursorStore.subscribe,
    cursorStore.getSnapshot,
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex items-center justify-between gap-4 px-4 py-1.5 text-[13px] text-white bg-[rgba(216,216,216,1)]/90">
      <div className="flex items-center gap-3 truncate">
        <span className="tabular-nums">
          {pos ? `x:${Math.round(pos.x)},y:${Math.round(pos.y)}` : "x:--,y:--"}
        </span>
        {regionLabel && <span className="truncate">{regionLabel}</span>}
      </div>
      <span className="shrink-0 text-white/90">{ICP}</span>
    </div>
  );
};

export default MapStatusBar;
