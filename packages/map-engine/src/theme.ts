// Theme tokens for the engine-rendered chrome. Defaults reproduce the AION2
// Lanhu design ("1天族") so the engine renders sensibly without a theme prop.

/** Colors used by `createPinIcon` (marker pins + completion/fragment badges). */
export interface PinTheme {
  /** Fallback "pin" variant: dark translucent outer disc background. */
  pinDiscBg: string;
  /** Fallback "pin" variant: hairline border around the disc. */
  pinBorder: string;
  /** Fallback "pin" variant: default inner-dot color (subtype color overrides). */
  pinDot: string;
  /** Completed tick + fragment air/water chevron badge color. */
  completedAccent: string;
}

/** Full engine theme: pin colors plus the map chrome (zoom control, status bar). */
export interface MapTheme extends PinTheme {
  /** Zoom-control +/− glyph color. */
  zoomGlyph: string;
  /** Cursor-coordinates pill background in the status bar. */
  statusPillBg: string;
}

export const DEFAULT_PIN_THEME: PinTheme = {
  pinDiscBg: "rgba(0,0,0,0.6)", // 圆形 17 background
  pinBorder: "rgba(255,255,255,1)", // 0.5px hairline
  pinDot: "#2E97FF", // 圆形 18 inner dot (rgba 46,150,255)
  completedAccent: "#22c55e",
};

export const DEFAULT_MAP_THEME: MapTheme = {
  ...DEFAULT_PIN_THEME,
  zoomGlyph: "#3D3D3D",
  statusPillBg: "rgba(216,216,216,0.7)",
};
