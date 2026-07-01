import { useEffect } from "react";
import { useGameMap } from "@/context/GameMapContext";
import { useTheme, type Theme } from "@/context/ThemeContext";

type ThemeHint = Exclude<Theme, "auto"> | null;

/**
 * Drives the "auto" theme from the selected map:
 * light maps → light (day) mode, dark maps → dark mode.
 * The "abyss" theme is disabled in ThemeContext, so abyss maps fall back to dark.
 * Renders nothing; must live inside both ThemeProvider and GameMapProvider.
 */
export function ThemeMapBridge() {
  const { selectedMap } = useGameMap();
  const { setThemeHint } = useTheme();

  useEffect(() => {
    let hint: ThemeHint;
    switch (selectedMap?.type) {
      case "light":
        hint = "light";
        break;
      case "dark":
      case "abyss":
        hint = "dark";
        break;
      default:
        hint = null;
    }
    setThemeHint(hint);
  }, [selectedMap?.type, setThemeHint]);

  return null;
}
