// AION2 engine theme. Today identical to the engine defaults (the defaults
// ARE the AION2 Lanhu palette); kept as an explicit app-side object so the
// app owns its colors once other games diverge. Module-level singleton for
// reference stability.
import { DEFAULT_MAP_THEME, type MapTheme } from "@gamemap/map-engine";

export const aionTheme: MapTheme = { ...DEFAULT_MAP_THEME };
