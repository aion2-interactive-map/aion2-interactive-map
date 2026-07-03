import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type Theme = "auto" | "light" | "dark"

/**
 * Persistence adapter injected by the app. The shell must stay storage-free
 * (no browser storage) so persistence lives with the host app.
 */
export type ThemeStorage = {
  get: () => Theme | null
  set: (theme: Theme) => void
}

type ThemeContextValue = {
  theme: Theme
  realTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function systemTheme(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export function ThemeProvider({
  children,
  defaultTheme = "auto",
  storage,
}: {
  children: ReactNode
  defaultTheme?: Theme
  storage?: ThemeStorage
}) {
  const [theme, setThemeState] = useState<Theme>(() => storage?.get() ?? defaultTheme)
  const [sys, setSys] = useState<"light" | "dark">(() => systemTheme())

  const realTheme = useMemo<"light" | "dark">(
    () => (theme === "auto" ? sys : theme),
    [theme, sys],
  )

  useEffect(() => {
    applyTheme(realTheme)
  }, [realTheme])

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => setSys(mq.matches ? "dark" : "light")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t)
      storage?.set(t)
    },
    [storage],
  )

  const value = useMemo(
    () => ({ theme, realTheme, setTheme }),
    [theme, realTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a <ThemeProvider>")
  return ctx
}
