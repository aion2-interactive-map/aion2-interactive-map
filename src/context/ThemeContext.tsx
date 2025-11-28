// src/hooks/useTheme.ts
import {
  useEffect,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {useGameMap} from "@/context/GameMapContext.tsx";
import type {GameMapMeta} from "@/types/game.ts";

export type Theme = "auto" | "light" | "dark" | "abyss";

const STORAGE_KEY = "aion2.theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Detect system theme
function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// Get initial theme from localStorage OR system
function loadInitialTheme(): Theme {
  if (typeof window === "undefined") return "auto";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "abyss") return stored;

  // return getSystemTheme();
  return "auto";
}

// Apply theme to <html>
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("abyss");
  } else if (theme === "abyss") {
    root.classList.add("abyss");
    root.classList.remove("dark");
  } else {
    root.classList.remove("dark", "abyss");
  }
}

function getRealTheme(theme: Theme, selectedMap?: GameMapMeta) {
  if (theme === "light" || theme === "dark" || theme === "abyss") {
    return theme;
  }
  if (selectedMap?.type === "light" || selectedMap?.type === "dark" || selectedMap?.type === "abyss") {
    return selectedMap.type;
  } else {
    return getSystemTheme();
  }
}

// 🟢 New: Provider that holds the *same* logic your hook used before
export function ThemeProvider({children}: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => loadInitialTheme());
  const [realTheme, setRealTheme] = useState<Theme>(() => getRealTheme(loadInitialTheme()));
  const {selectedMap} = useGameMap();

  // Apply on mount & when theme changes
  useEffect(() => {
    applyTheme(realTheme);
  }, [realTheme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    setRealTheme(getRealTheme(theme, selectedMap));
  }, [theme, selectedMap]);


  return (
    <ThemeContext.Provider value={{theme, setTheme}}>
      {children}
    </ThemeContext.Provider>
  );
}

// 🟢 Hook API stays the same externally
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a <ThemeProvider>");
  }
  return ctx;
}
