// High-frequency map cursor position kept OUT of React state so that mousemove
// does not re-render GameMapView (and the whole Leaflet layer tree). Only the
// status bar subscribes via useSyncExternalStore.
export type CursorPos = { x: number; y: number } | null;

let pos: CursorPos = null;
const subscribers = new Set<() => void>();

export const cursorStore = {
  set(x: number, y: number) {
    pos = { x, y };
    subscribers.forEach((fn) => fn());
  },
  clear() {
    if (pos === null) return;
    pos = null;
    subscribers.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  },
  // Stable reference between updates (required by useSyncExternalStore).
  getSnapshot(): CursorPos {
    return pos;
  },
};
