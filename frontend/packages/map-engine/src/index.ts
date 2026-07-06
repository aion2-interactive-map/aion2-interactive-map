// @gamemap/map-engine — game-agnostic Leaflet map primitives + components.
//
// NOTE: the engine is Tailwind-free; its component chrome (map shell, zoom
// control, status bar, context menu) is styled by the static stylesheet
// `@gamemap/map-engine/engine.css`, which the consuming app must import once
// (alongside `leaflet/dist/leaflet.css`).
export * from "./coords.ts";
export * from "./markerIcons.tsx";
export * from "./cursorStore.ts";
export * from "./theme.ts";
export * from "./engineTypes.ts";

// The composed map view (the app provides everything via GameMapViewProps)
// and the bare tile layer (for lightweight embeds without the full chrome).
export { default as GameMapView } from "./components/GameMapView.tsx";
export { default as GameMapTiles } from "./components/GameMapTiles.tsx";

// Side effect: registers the smooth wheel-zoom handler on L.Map and augments
// Leaflet's MapOptions (smoothWheelZoom / smoothSensitivity) for consumers.
import "./leaflet-smooth-wheel-zoom.ts";
