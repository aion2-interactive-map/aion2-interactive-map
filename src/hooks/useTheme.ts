// src/hooks/useTheme.ts
import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

// Detect system theme
function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// Get initial theme from localStorage OR system
function loadInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  return getSystemTheme();
}

// Apply theme to <html>
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => loadInitialTheme());

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
