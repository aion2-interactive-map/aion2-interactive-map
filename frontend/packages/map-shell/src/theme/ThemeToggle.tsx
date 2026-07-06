import { Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@gamemap/ui"
import { useTheme, type Theme } from "./ThemeProvider"

const ORDER: Theme[] = ["auto", "light", "dark"]

export type ThemeToggleLabels = { auto: string; light: string; dark: string }

export type ThemeToggleProps = {
  labels: ThemeToggleLabels
  className?: string
}

export function ThemeToggle({ labels, className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
  const Icon = theme === "auto" ? Monitor : theme === "light" ? Sun : Moon
  const label = theme === "auto" ? labels.auto : theme === "light" ? labels.light : labels.dark
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-accent/20 hover:text-foreground",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}
