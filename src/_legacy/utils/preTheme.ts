// src/utils/preTheme.ts
export function applyTheme() {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem("theme");
  const root = document.documentElement;

  let theme: "light" | "dark" = "light";

  if (stored === "dark" || stored === "light") {
    theme = stored;
  } else {
    // fallback to system
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}
