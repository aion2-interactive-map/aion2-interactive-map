import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "auto" | "light" | "dark" | "abyss";

const STORAGE_KEY = "aion2.theme";

type ThemeHint = Exclude<Theme, "auto"> | null;

type ThemeContextValue = {
  realTheme: Exclude<Theme, "auto">;
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Map page (or any page) can set this
  themeHint: ThemeHint;
  setThemeHint: (hint: ThemeHint) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): Exclude<Theme, "auto"> {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function loadInitialTheme(): Theme {
  if (typeof window === "undefined") return "auto";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "abyss") return stored;
  return "auto";
}

function applyTheme(theme: Exclude<Theme, "auto">) {
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

function resolveRealTheme(theme: Theme, hint: ThemeHint): Exclude<Theme, "auto"> {
  if (theme === "light" || theme === "dark" || theme === "abyss") return theme;
  if (hint === "light" || hint === "dark" || hint === "abyss") return hint;
  return getSystemTheme();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => loadInitialTheme());
  const [themeHint, setThemeHint] = useState<ThemeHint>(null);

  const realTheme = useMemo(() => resolveRealTheme(theme, themeHint), [theme, themeHint]);

  useEffect(() => {
    // persist user selection ("auto" is stored as well if you want; currently we store theme string)
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    applyTheme(realTheme);
  }, [realTheme]);

  // Optional: if you want auto mode to react to system theme changes live
  useEffect(() => {
    if (theme !== "auto") return;
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      // trigger recompute by changing a no-op state: simplest is to update themeHint to itself
      setThemeHint((h) => h);
    };

    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ realTheme, theme, setTheme, themeHint, setThemeHint }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a <ThemeProvider>");
  return ctx;
}
