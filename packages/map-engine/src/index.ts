// @gamemap/map-engine — game-agnostic Leaflet map primitives.
export * from "./coords.ts";
export * from "./markerIcons.tsx";
export * from "./cursorStore.ts";
export * from "./theme.ts";
// Side effect: registers the smooth wheel-zoom handler on L.Map and augments
// Leaflet's MapOptions (smoothWheelZoom / smoothSensitivity) for consumers.
import "./leaflet-smooth-wheel-zoom.ts";
