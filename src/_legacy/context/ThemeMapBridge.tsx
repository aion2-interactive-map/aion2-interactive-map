import { useEffect } from "react";
import { useGameMap } from "@/context/GameMapContext";
import { useTheme, type Theme } from "@/context/ThemeContext";

type ThemeHint = Exclude<Theme, "auto"> | null;

export function ThemeMapBridge() {
  const { selectedMap } = useGameMap();
  const { setThemeHint } = useTheme();

  useEffect(() => {
    const hint: ThemeHint =
      selectedMap?.type === "light" || selectedMap?.type === "dark" || selectedMap?.type === "abyss"
        ? selectedMap.type
        : null;

    setThemeHint(hint);
  }, [selectedMap?.type, setThemeHint]);

  return null;
}
