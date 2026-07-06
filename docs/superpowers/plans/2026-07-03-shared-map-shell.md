# Shared Map Shell (@gamemap/ui + @gamemap/map-shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract aion2's topbar/sidebar/filter chrome into two shared workspace packages (`@gamemap/ui` primitives, `@gamemap/map-shell` chrome) so palworld consumes the same components, with aion2 visually unchanged.

**Architecture:** `packages/ui` holds aion2's 15 shadcn primitives + `cn()` moved verbatim; `packages/map-shell` holds `ShellTopBar`, `ShellSidebar`, `FilterPanel` built with map-engine-style purity (props-injection only — no i18n/router/env/localStorage/fetch, enforced by a new `check:shell` grep gate) and skinned via per-part `classNames` overrides merged with `cn()`. aion2 keeps its exact look through thin wrappers; palworld deletes its bespoke `TopBar`/`Sidebar` and consumes directly.

**Tech Stack:** React 19, pnpm workspace (source-only packages, `exports: {".": "./src/index.ts"}`), Tailwind v4 (`@source` scanning), radix-ui/cva/clsx/tailwind-merge, vitest (node env), Playwright e2e.

**Spec:** `E:/aion2-map/docs/superpowers/specs/2026-07-03-shared-map-shell-design.md`

---

## Working context (read first)

- **Workspace:** `E:/aion2-map/frontend/.claude/worktrees/multi-game-map-platform`, branch `worktree-shared-shell` (created off `bc9ecc29`). Run everything from this directory. Do NOT touch `E:/aion2-map/frontend` (user's live checkout) or the sibling repos `E:/aion2-map/data` / `E:/aion2-map/resource`.
- **Ports:** NEVER use 5173 (user's live dev server). aion2 e2e must run with `E2E_PORT=5199` (its playwright config defaults to 5173 with `reuseExistingServer: true` — running without the env var would hijack the user's server). palworld e2e defaults to 5188 (fine). Dev-verification server: 5177.
- **No push. No `--no-verify`.** Commits stay local on `worktree-shared-shell`.
- **Known e2e failure:** aion2 `wiki.spec.ts:20` fails deterministically from external data-repo drift. Gate = **23 passed + exactly that 1 failure**.
- **Shell cwd resets between Bash calls** — use absolute paths or `cd` inside a single command.
- Package managers: `pnpm` at the workspace root.

---

### Task 1: Extract `packages/ui` (@gamemap/ui) and rewire aion2

Moves are `git mv` + import rewrites + dependency moves; this must land as **one atomic commit** (aion2 does not compile mid-task).

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/src/index.ts`
- Move (git mv): `apps/aion2/src/components/ui/*.tsx` (15 files) → `packages/ui/src/`; `apps/aion2/src/lib/utils.ts` → `packages/ui/src/utils.ts`
- Modify: moved primitives' imports; `apps/aion2/package.json`; `apps/aion2/src/index.css`; 7 aion2 app files (import rewrites, listed below)

- [ ] **Step 1: Create `packages/ui/package.json`**

```json
{
  "name": "@gamemap/ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.18"
  },
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "check": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-slot": "^1.3.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "lucide-react": "^1.21.0",
    "radix-ui": "^1.6.0",
    "tailwind-merge": "^3.4.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "typescript": "~5.9.3"
  }
}
```

- [ ] **Step 2: Create `packages/ui/tsconfig.json`** — copy `packages/map-engine/tsconfig.json` verbatim (same compiler options, `"include": ["src"]`).

- [ ] **Step 3: Move the primitives with git mv**

```bash
mkdir -p packages/ui/src
for f in accordion alert-dialog button card checkbox command dialog dropdown-menu input popover scroll-area select separator switch tooltip; do
  git mv "apps/aion2/src/components/ui/$f.tsx" "packages/ui/src/$f.tsx"
done
git mv apps/aion2/src/lib/utils.ts packages/ui/src/utils.ts
```

`apps/aion2/src/lib/utils.ts` contains ONLY `cn()`; nothing is left behind. Remove the now-empty `apps/aion2/src/components/ui/` directory if git leaves it.

- [ ] **Step 4: Fix imports inside the moved files**

In every one of the 15 moved primitives: `import { cn } from "@/lib/utils"` → `import { cn } from "./utils"`.

Cross-primitive imports become relative:
- `packages/ui/src/alert-dialog.tsx`: `from "@/components/ui/button"` → `from "./button"`
- `packages/ui/src/dialog.tsx`: `from "@/components/ui/button"` → `from "./button"`
- `packages/ui/src/command.tsx`: `from "@/components/ui/dialog"` → `from "./dialog"`

Verify no `@/` remains: `grep -rn "@/" packages/ui/src` → no output.

- [ ] **Step 5: Create the barrel `packages/ui/src/index.ts`**

```ts
export * from "./accordion"
export * from "./alert-dialog"
export * from "./button"
export * from "./card"
export * from "./checkbox"
export * from "./command"
export * from "./dialog"
export * from "./dropdown-menu"
export * from "./input"
export * from "./popover"
export * from "./scroll-area"
export * from "./select"
export * from "./separator"
export * from "./switch"
export * from "./tooltip"
export { cn } from "./utils"
```

(shadcn export names are all prefixed — `export *` is collision-free.)

- [ ] **Step 6: Move dependencies in `apps/aion2/package.json`**

REMOVE from aion2 `dependencies` (verified used only by the moved files): `radix-ui`, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `cmdk`, `tailwind-merge`. KEEP `lucide-react` (used broadly by app code). ADD:

```json
"@gamemap/ui": "workspace:*"
```

- [ ] **Step 7: Rewrite aion2 app imports**

Transformation rule: every import from `@/components/ui/<anything>` and every `import { cn } from "@/lib/utils"` becomes an import from `"@gamemap/ui"` (consolidate multiple into one grouped import per file; imported names are unchanged). Exactly these 7 files (grep-verified complete list):

1. `apps/aion2/src/components/TopNavbar.tsx` (button, dropdown-menu, popover)
2. `apps/aion2/src/features/map/popup/MarkerPopupContent.tsx` (ui imports + cn)
3. `apps/aion2/src/features/map/sidebar/MarkerTypes.tsx` (accordion, tooltip, alert-dialog, cn)
4. `apps/aion2/src/features/map/sidebar/SelectMap.tsx`
5. `apps/aion2/src/features/map/sidebar/Sidebar.tsx` (scroll-area)
6. `apps/aion2/src/features/wiki/TypeHub.tsx`
7. `apps/aion2/src/features/map/search/SearchPanel.tsx` (cn only)

Worked example (TopNavbar.tsx): the three imports from `@/components/ui/button`, `@/components/ui/dropdown-menu`, `@/components/ui/popover` become:

```ts
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gamemap/ui";
```

Verify completeness: `grep -rn "components/ui\|@/lib/utils" apps/aion2/src` → no output.

- [ ] **Step 8: Add Tailwind `@source` for the package**

In `apps/aion2/src/index.css`, directly after the existing `@plugin` line, add:

```css
@source "../../../packages/ui/src";
```

(The map-shell `@source` is added in Task 5 when that package exists — Tailwind v4 errors on missing `@source` paths.)

- [ ] **Step 9: Install and verify**

```bash
pnpm install
pnpm --filter @gamemap/ui check
pnpm build
```

Expected: install links the workspace package; both checks pass; aion2 production build succeeds.

- [ ] **Step 10: Commit (single atomic commit)**

```bash
git add -A
git commit -m "feat(ui): extract @gamemap/ui shared primitives from aion2"
```

---

### Task 2: `packages/map-shell` scaffold, purity gate, filter logic (TDD)

**Files:**
- Create: `packages/map-shell/package.json`, `packages/map-shell/tsconfig.json`, `packages/map-shell/src/filter-logic.ts`, `packages/map-shell/src/filter-logic.test.ts`, `packages/map-shell/src/index.ts`
- Modify: root `package.json` (add `check:shell` script)

- [ ] **Step 1: Create `packages/map-shell/package.json`**

```json
{
  "name": "@gamemap/map-shell",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.18"
  },
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "check": "tsc --noEmit"
  },
  "dependencies": {
    "@gamemap/ui": "workspace:*",
    "lucide-react": "^1.21.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "typescript": "~5.9.3"
  }
}
```

- [ ] **Step 2: Create `packages/map-shell/tsconfig.json`** — copy `packages/map-engine/tsconfig.json` verbatim.

- [ ] **Step 3: Add the `check:shell` script to the root `package.json`**, next to `check:engine`, mirroring its exact grep style but with this path and pattern:

```json
"check:shell": "grep -rn --include=*.ts --include=*.tsx -P \"i18next|useTranslation|react-router|import\\.meta\\.env|localStorage|fetch\\(|@/\" packages/map-shell/src && exit 1 || exit 0"
```

(If `check:engine` uses different flag spelling, match it exactly — the pattern and directory above are what matter. Note the `@/` ban: shell files may only import react, lucide-react, `@gamemap/ui`, and siblings.)

- [ ] **Step 4: Write the failing test `packages/map-shell/src/filter-logic.test.ts`**

```ts
import { describe, expect, it } from "vitest"
import { deriveEyeState, syncExpanded } from "./filter-logic"

describe("deriveEyeState", () => {
  it("returns none for an empty subtype list", () => {
    expect(deriveEyeState([])).toBe("none")
  })
  it("returns none when no subtype is active", () => {
    expect(deriveEyeState([{ active: false }, { active: false }])).toBe("none")
  })
  it("returns some when only part is active", () => {
    expect(deriveEyeState([{ active: true }, { active: false }])).toBe("some")
  })
  it("returns all when every subtype is active", () => {
    expect(deriveEyeState([{ active: true }, { active: true }])).toBe("all")
  })
})

describe("syncExpanded", () => {
  it("appends category ids not yet known", () => {
    expect(syncExpanded([], ["a", "b"])).toEqual(["a", "b"])
    expect(syncExpanded(["a"], ["a", "b", "c"])).toEqual(["a", "b", "c"])
  })
  it("returns the same array reference when nothing changed", () => {
    const prev = ["a", "b"]
    expect(syncExpanded(prev, ["a", "b"])).toBe(prev)
    expect(syncExpanded(prev, ["a"])).toBe(prev)
  })
  it("re-adds a user-collapsed id when it reappears as new (donor bug-compatible)", () => {
    // Donor behavior: collapsing "a" removes it from prev; if the renderable
    // set still contains "a", the sync effect re-appends it. Replicate exactly.
    expect(syncExpanded(["b"], ["a", "b"])).toEqual(["b", "a"])
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `pnpm test -- filter-logic`
Expected: FAIL — cannot resolve `./filter-logic`.

- [ ] **Step 6: Implement `packages/map-shell/src/filter-logic.ts`**

```ts
export type EyeState = "all" | "some" | "none"

export function deriveEyeState(subtypes: { active: boolean }[]): EyeState {
  if (subtypes.length === 0) return "none"
  const activeCount = subtypes.filter((s) => s.active).length
  if (activeCount === subtypes.length) return "all"
  return activeCount > 0 ? "some" : "none"
}

export function syncExpanded(prev: string[], categoryIds: string[]): string[] {
  const known = new Set(prev)
  const next = [...prev]
  for (const id of categoryIds) {
    if (!known.has(id)) next.push(id)
  }
  return next.length === prev.length ? prev : next
}
```

- [ ] **Step 7: Create the barrel `packages/map-shell/src/index.ts`** (extended in Tasks 3–4):

```ts
export { deriveEyeState, syncExpanded, type EyeState } from "./filter-logic"
```

- [ ] **Step 8: Run tests and gates**

```bash
pnpm install
pnpm test -- filter-logic
pnpm check:shell
pnpm --filter @gamemap/map-shell check
```

Expected: 7 tests pass; `check:shell` exits 0 silently; tsc clean.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(map-shell): package scaffold, purity gate, filter logic helpers"
```

---

### Task 3: ShellTopBar and ShellSidebar

**Files:**
- Create: `packages/map-shell/src/ShellTopBar.tsx`, `packages/map-shell/src/ShellSidebar.tsx`
- Modify: `packages/map-shell/src/index.ts`

- [ ] **Step 1: Create `packages/map-shell/src/ShellTopBar.tsx`**

Structure/classes replicate aion2's `TopNavbar.tsx` markup exactly (ghost icon buttons, `z-[2000]` menus, testids `lang-menu`/`lang-<code>`/`theme-menu`/`theme-<value>`).

```tsx
import type { ReactNode } from "react"
import { CheckIcon, Languages, Settings } from "lucide-react"
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@gamemap/ui"

export interface ShellTopBarProps {
  leftSlot?: ReactNode
  rightExtras?: ReactNode
  languageSwitcher?: {
    languages: { code: string; label: string }[]
    current: string
    onChange: (code: string) => void
    menuLabel: string
  }
  themeSwitcher?: {
    options: { value: string; label: string }[]
    current: string
    onChange: (value: string) => void
    menuLabel: string
  }
  classNames?: {
    root?: string
    left?: string
    right?: string
    trigger?: string
    menu?: string
  }
}

export function ShellTopBar({
  leftSlot,
  rightExtras,
  languageSwitcher,
  themeSwitcher,
  classNames,
}: ShellTopBarProps) {
  return (
    <header className={cn("flex h-12 shrink-0 items-center gap-6 px-4", classNames?.root)}>
      {leftSlot && (
        <div className={cn("flex items-center gap-6", classNames?.left)}>{leftSlot}</div>
      )}
      <div className={cn("ml-auto flex items-center gap-1", classNames?.right)}>
        {languageSwitcher && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="lang-menu"
                aria-label={languageSwitcher.menuLabel}
                title={languageSwitcher.menuLabel}
                className={classNames?.trigger}
              >
                <Languages className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn("z-[2000]", classNames?.menu)}>
              {languageSwitcher.languages.map(({ code, label }) => (
                <DropdownMenuItem
                  key={code}
                  data-testid={`lang-${code}`}
                  onSelect={() => languageSwitcher.onChange(code)}
                >
                  <span className="flex-1">{label}</span>
                  {languageSwitcher.current === code && <CheckIcon className="size-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {themeSwitcher && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="theme-menu"
                aria-label={themeSwitcher.menuLabel}
                title={themeSwitcher.menuLabel}
                className={classNames?.trigger}
              >
                <Settings className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn("z-[2000]", classNames?.menu)}>
              {themeSwitcher.options.map(({ value, label }) => (
                <DropdownMenuItem
                  key={value}
                  data-testid={`theme-${value}`}
                  onSelect={() => themeSwitcher.onChange(value)}
                >
                  <span className="flex-1">{label}</span>
                  {themeSwitcher.current === value && <CheckIcon className="size-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {rightExtras}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create `packages/map-shell/src/ShellSidebar.tsx`**

Structure/classes replicate aion2's `Sidebar.tsx` (346px default, collapse-to-0 with `transition-all duration-300`, edge button testid `sidebar-toggle` at `top-[100px]` with chevron + tiny label). The built-in map selector renders when `mapSelector` is given with ≥2 maps and no `mapSelectorSlot`; entries keep testid `map-tab-<MapId>`.

```tsx
import { useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn, ScrollArea } from "@gamemap/ui"

export interface ShellSidebarProps {
  width?: number
  defaultCollapsed?: boolean
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  collapseLabel: string
  expandLabel: string
  backgroundSlot?: ReactNode
  headerSlot?: ReactNode
  mapSelector?: {
    maps: { id: string; label: string; icon?: ReactNode }[]
    activeMapId: string
    onSelectMap: (id: string) => void
  }
  mapSelectorSlot?: ReactNode
  children?: ReactNode
  classNames?: {
    root?: string
    scrollArea?: string
    collapseButton?: string
    content?: string
  }
}

export function ShellSidebar({
  width = 346,
  defaultCollapsed = false,
  collapsed: collapsedProp,
  onCollapsedChange,
  collapseLabel,
  expandLabel,
  backgroundSlot,
  headerSlot,
  mapSelector,
  mapSelectorSlot,
  children,
  classNames,
}: ShellSidebarProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultCollapsed)
  const collapsed = collapsedProp ?? uncontrolled
  const toggle = () => {
    const next = !collapsed
    setUncontrolled(next)
    onCollapsedChange?.(next)
  }
  const showMapSelector = mapSelector !== undefined && mapSelector.maps.length >= 2

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col transition-all duration-300",
        classNames?.root,
      )}
      style={{ width: collapsed ? 0 : width, maxWidth: width }}
    >
      {backgroundSlot}
      <ScrollArea className={cn("h-full flex-1", classNames?.scrollArea)}>
        {!collapsed && (
          <div className={cn("flex flex-col px-0 pb-4", classNames?.content)}>
            {headerSlot}
            {mapSelectorSlot ??
              (showMapSelector && (
                <nav className="mb-3 flex flex-wrap gap-1">
                  {mapSelector.maps.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      data-testid={`map-tab-${m.id}`}
                      aria-pressed={m.id === mapSelector.activeMapId}
                      onClick={() => mapSelector.onSelectMap(m.id)}
                      className={cn(
                        "flex items-center gap-1 rounded px-3 py-1 text-sm transition-colors",
                        m.id === mapSelector.activeMapId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground hover:bg-accent",
                      )}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </nav>
              ))}
            {children}
          </div>
        )}
      </ScrollArea>
      <button
        type="button"
        data-testid="sidebar-toggle"
        onClick={toggle}
        aria-label={collapsed ? expandLabel : collapseLabel}
        className={cn(
          "absolute top-[100px] right-0 z-[20000] flex h-12 w-8 translate-x-full select-none flex-col items-center justify-center rounded-r-md rounded-l-none",
          classNames?.collapseButton,
        )}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        <span className="mt-0.5 whitespace-normal px-0.5 text-center text-[10px] leading-tight">
          {collapsed ? expandLabel : collapseLabel}
        </span>
      </button>
    </aside>
  )
}
```

- [ ] **Step 3: Extend the barrel `packages/map-shell/src/index.ts`**

```ts
export { ShellTopBar, type ShellTopBarProps } from "./ShellTopBar"
export { ShellSidebar, type ShellSidebarProps } from "./ShellSidebar"
export { deriveEyeState, syncExpanded, type EyeState } from "./filter-logic"
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter @gamemap/map-shell check
pnpm check:shell
```

Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(map-shell): ShellTopBar and ShellSidebar"
```

---

### Task 4: FilterPanel

**Files:**
- Create: `packages/map-shell/src/FilterPanel.tsx`, `packages/map-shell/src/FilterPanel.test.tsx`
- Modify: `packages/map-shell/src/index.ts`, `packages/map-shell/package.json` (devDep), root `vitest.config.ts` (include `.tsx` tests)

- [ ] **Step 1: Create `packages/map-shell/src/FilterPanel.tsx`**

Structure/classes replicate aion2's `MarkerTypes.tsx` (2-col grids, accordion `border-b-0` items, tri-state eye with tooltip, `subtype-toggle-<id>` testids). Neutral defaults use `bg-primary text-primary-foreground` / `bg-muted text-foreground`; app skins override via `classNames`. The `cn()` apply order (`BASE`, state default, `subtypeButton`, then `subtypeButtonActive` when active) lets an inactive skin *and* an active skin coexist — tailwind-merge keeps the last conflicting class.

Note: `classNames.controlButtonActive` and `classNames.categoryEyeToggle` are additions beyond the spec's classNames list (needed to skin active controls and the eye's text color); the spec's `interface` list is otherwise implemented verbatim. `aria-pressed` is emitted on controls only when `active` is defined (donor parity for `show-names-toggle`/`lod-toggle`; the borders button gains a harmless `aria-pressed`).

```tsx
import { useEffect, useState, type MouseEvent, type ReactNode } from "react"
import { Eye, EyeOff } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gamemap/ui"
import { deriveEyeState, syncExpanded } from "./filter-logic"

export interface FilterSubtype {
  id: string
  label: string
  active: boolean
  icon?: ReactNode
  badge?: string
}

export interface FilterCategory {
  id: string
  label: string
  icon?: ReactNode
  subtypes: FilterSubtype[]
}

export interface FilterControl {
  id: string
  label: string
  onClick: () => void
  active?: boolean
  testId?: string
}

export interface FilterPanelClassNames {
  root?: string
  controls?: string
  controlButton?: string
  controlButtonActive?: string
  category?: string
  categoryHeader?: string
  categoryEyeToggle?: string
  subtypeGrid?: string
  subtypeButton?: string
  subtypeButtonActive?: string
}

export interface FilterPanelProps {
  categories: FilterCategory[]
  onToggleSubtype: (id: string) => void
  onSetCategory?: (categoryId: string, visible: boolean) => void
  categoryToggleLabels?: { show: string; hide: string }
  controls?: FilterControl[]
  classNames?: FilterPanelClassNames
}

const BUTTON_BASE =
  "flex h-[30px] w-full items-center gap-2 rounded-sm px-2 text-sm font-normal leading-[14px] transition-colors"
const BUTTON_ACTIVE_DEFAULT = "bg-primary text-primary-foreground"
const BUTTON_INACTIVE_DEFAULT = "bg-muted text-foreground"

export function FilterPanel({
  categories,
  onToggleSubtype,
  onSetCategory,
  categoryToggleLabels,
  controls,
  classNames,
}: FilterPanelProps) {
  // All categories expanded by default. Data loads async, so the category set
  // grows over time; keep the expanded set in sync as categories appear while
  // preserving user collapses (same semantics as the aion2 donor).
  const [expanded, setExpanded] = useState<string[]>([])
  const idsKey = categories.map((c) => c.id).join("|")
  useEffect(() => {
    setExpanded((prev) => syncExpanded(prev, categories.map((c) => c.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  return (
    <div className={cn("flex w-full flex-col", classNames?.root)}>
      {controls && controls.length > 0 && (
        <div className={cn("grid grid-cols-2 gap-x-2.5 gap-y-2", classNames?.controls)}>
          {controls.map((control) => {
            const active = control.active === true
            return (
              <button
                key={control.id}
                type="button"
                data-testid={control.testId}
                aria-pressed={control.active}
                onClick={control.onClick}
                className={cn(
                  BUTTON_BASE,
                  active ? BUTTON_ACTIVE_DEFAULT : BUTTON_INACTIVE_DEFAULT,
                  classNames?.controlButton,
                  active && classNames?.controlButtonActive,
                )}
              >
                {control.label}
              </button>
            )
          })}
        </div>
      )}

      <Accordion type="multiple" value={expanded} onValueChange={setExpanded} className="w-full">
        {categories.map((category) => {
          const eyeState = deriveEyeState(category.subtypes)
          const tooltipText =
            eyeState === "all"
              ? (categoryToggleLabels?.hide ?? "")
              : (categoryToggleLabels?.show ?? "")
          const toggleCategory = (e: MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            onSetCategory?.(category.id, eyeState !== "all")
          }

          return (
            <AccordionItem
              key={category.id}
              value={category.id}
              className={cn("border-b-0", classNames?.category)}
            >
              <AccordionTrigger
                className={cn(
                  "cursor-default items-center gap-1 px-0 pt-3 pb-0 hover:no-underline [&>svg]:translate-y-0",
                  classNames?.categoryHeader,
                )}
              >
                <div className="my-2 flex w-full items-center justify-between gap-2 px-0">
                  <div className="flex items-center gap-2">
                    {category.icon && (
                      <span className="flex h-4 w-4 items-center justify-center">
                        {category.icon}
                      </span>
                    )}
                    <span className="text-sm font-medium leading-[14px]">{category.label}</span>
                  </div>

                  {onSetCategory && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={toggleCategory}
                            aria-label={tooltipText}
                            className={cn(
                              "shrink-0 rounded-sm p-1 transition-opacity hover:bg-black/5 dark:hover:bg-white/10",
                              eyeState === "none" && "opacity-40",
                              classNames?.categoryEyeToggle,
                            )}
                          >
                            {eyeState === "all" ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{tooltipText}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="pt-0 pb-0">
                <div className={cn("grid grid-cols-2 gap-x-2.5 gap-y-2", classNames?.subtypeGrid)}>
                  {category.subtypes.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      data-testid={`subtype-toggle-${sub.id}`}
                      aria-pressed={sub.active}
                      onClick={() => onToggleSubtype(sub.id)}
                      className={cn(
                        BUTTON_BASE,
                        sub.active ? BUTTON_ACTIVE_DEFAULT : BUTTON_INACTIVE_DEFAULT,
                        classNames?.subtypeButton,
                        sub.active && classNames?.subtypeButtonActive,
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="flex min-w-0 items-center gap-1">
                          {sub.icon}
                          <span className="truncate text-left">{sub.label}</span>
                        </span>
                        {sub.badge !== undefined && (
                          <span className="ml-2 shrink-0 text-xs">{sub.badge}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
```

- [ ] **Step 2: Extend the barrel `packages/map-shell/src/index.ts`** (full final content):

```ts
export { ShellTopBar, type ShellTopBarProps } from "./ShellTopBar"
export { ShellSidebar, type ShellSidebarProps } from "./ShellSidebar"
export {
  FilterPanel,
  type FilterPanelProps,
  type FilterPanelClassNames,
  type FilterCategory,
  type FilterSubtype,
  type FilterControl,
} from "./FilterPanel"
export { deriveEyeState, syncExpanded, type EyeState } from "./filter-logic"
```

- [ ] **Step 3: Enable component testing**

Add to `packages/map-shell/package.json` `devDependencies` (jsdom already exists at the workspace root):

```json
"@testing-library/react": "^16.3.0"
```

In root `vitest.config.ts`, change the first include glob so `.tsx` tests are picked up:

```ts
include: ["packages/**/src/**/*.test.{ts,tsx}", "packages/**/test/**/*.test.ts"],
```

Then `pnpm install`.

- [ ] **Step 4: Write `packages/map-shell/src/FilterPanel.test.tsx`** (spec §5: dispatch + classNames-merge unit tests; per-file jsdom env — root vitest stays node):

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FilterPanel } from "./FilterPanel"

afterEach(cleanup)

const categories = [
  {
    id: "cat1",
    label: "Category 1",
    subtypes: [
      { id: "sub1", label: "Sub 1", active: true },
      { id: "sub2", label: "Sub 2", active: false },
    ],
  },
]

describe("FilterPanel", () => {
  it("dispatches onToggleSubtype with the subtype id", () => {
    const onToggle = vi.fn()
    const { getByTestId } = render(
      <FilterPanel categories={categories} onToggleSubtype={onToggle} />,
    )
    fireEvent.click(getByTestId("subtype-toggle-sub2"))
    expect(onToggle).toHaveBeenCalledWith("sub2")
  })

  it("dispatches onSetCategory(id, true) from the eye toggle when only part is active", () => {
    const onSet = vi.fn()
    const { getByLabelText } = render(
      <FilterPanel
        categories={categories}
        onToggleSubtype={() => {}}
        onSetCategory={onSet}
        categoryToggleLabels={{ show: "Show category", hide: "Hide category" }}
      />,
    )
    fireEvent.click(getByLabelText("Show category"))
    expect(onSet).toHaveBeenCalledWith("cat1", true)
  })

  it("merges classNames on the subtype button with the active skin last", () => {
    const { getByTestId } = render(
      <FilterPanel
        categories={categories}
        onToggleSubtype={() => {}}
        classNames={{ subtypeButton: "bg-skin", subtypeButtonActive: "bg-skin-active" }}
      />,
    )
    // tailwind-merge keeps the last conflicting bg-* class:
    const active = getByTestId("subtype-toggle-sub1").className
    expect(active).toContain("bg-skin-active")
    expect(active).not.toContain("bg-primary")
    const inactive = getByTestId("subtype-toggle-sub2").className
    expect(inactive).toContain("bg-skin")
    expect(inactive).not.toContain("bg-muted")
  })
})
```

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: filter-logic (7) + FilterPanel (3) all pass.

- [ ] **Step 6: Verify gates**

```bash
pnpm --filter @gamemap/map-shell check
pnpm check:shell
```

Expected: both clean (the test file lives in `src/` but contains none of the banned patterns; `@testing-library` does not match the `@/` ban because the grep pattern is `@/`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(map-shell): FilterPanel"
```

---

### Task 5: Migrate aion2 to the shell (pixel-faithful wrappers)

**Files:**
- Modify: `apps/aion2/package.json` (add dep), `apps/aion2/src/index.css` (add `@source`), `apps/aion2/src/components/TopNavbar.tsx`, `apps/aion2/src/features/map/sidebar/Sidebar.tsx`, `apps/aion2/src/features/map/sidebar/MarkerTypes.tsx`

All testids, i18n keys, contexts, and visual classes are preserved. CSS-var skins go through Tailwind arbitrary values **with explicit hints** so tailwind-merge classifies them correctly: `bg-[color:var(--color-sidebar-button)]`, `bg-[color:var(--color-sidebar-collapse)]`, `bg-[image:var(--background-image-sidebar)]`.

- [ ] **Step 1: Add the dependency and @source**

In `apps/aion2/package.json` dependencies add `"@gamemap/map-shell": "workspace:*"`, then run `pnpm install`.
In `apps/aion2/src/index.css`, after the `@source` line from Task 1, add:

```css
@source "../../../packages/map-shell/src";
```

- [ ] **Step 2: Rewrite `apps/aion2/src/components/TopNavbar.tsx`** (full replacement):

```tsx
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShellTopBar } from "@gamemap/map-shell";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@gamemap/ui";
import { useTheme, type Theme } from "@/context/ThemeContext";
import i18n, { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from "@/i18n";

// "abyss" is disabled for now — kept in the Theme type + CSS for easy re-enable,
// but not offered in the switcher.
const THEME_OPTIONS: Theme[] = ["auto", "light", "dark"];

// Old-version archive entry, shown while the new version is being rebuilt
// (the nav tabs 首页/职业BD/… are hidden until those pages are ported).
const ARCHIVE_URL = "https://archive.tc-imba.com/";

export default function TopNavbar() {
  const { t } = useTranslation(["common", "wiki"]);
  const { theme, setTheme } = useTheme();
  const currentLng = i18n.resolvedLanguage ?? i18n.language;

  return (
    <ShellTopBar
      classNames={{
        root: "bg-topnavbar text-foreground",
        right: "text-[#3D3D3D] dark:text-white/85",
      }}
      leftSlot={
        <>
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-[#2E97FF] select-none"
          >
            AION2
          </Link>
          <Link
            to="/wiki"
            className="text-sm text-foreground/80 hover:text-foreground"
          >
            {t("wiki:nav.wiki")}
          </Link>
          <div className="text-sm text-[#3D3D3D] dark:text-white/80">
            已更新第四赛季新地图，全新版本重制中，旧版入口：
            <a
              href={ARCHIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2E97FF] hover:underline"
            >
              {ARCHIVE_URL}
            </a>
          </div>
        </>
      }
      languageSwitcher={{
        languages: SUPPORTED_LANGUAGES.map((lng) => ({
          code: lng,
          label: LANGUAGE_LABELS[lng],
        })),
        current: currentLng,
        onChange: (code) => void i18n.changeLanguage(code),
        menuLabel: t("common:menu.switchLanguage", "Switch language"),
      }}
      themeSwitcher={{
        options: THEME_OPTIONS.map((value) => ({
          value,
          label: t(`common:theme.${value}`),
        })),
        current: theme,
        onChange: (value) => setTheme(value as Theme),
        menuLabel: t("common:menu.switchTheme", "Switch theme"),
      }}
      rightExtras={
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="contact-menu"
              aria-label={t("common:menu.contact", "Contact us")}
              title={t("common:menu.contact", "Contact us")}
            >
              <Mail className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="max-h-[70vh] w-[300px] overflow-y-auto"
          >
            <div className="mb-2 text-base font-semibold">
              {t("common:rightSidebar.contact.title", "Communication & Contact")}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none break-words text-sm [&_a]:text-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {t("common:rightSidebar.contact.content")}
              </ReactMarkdown>
            </div>
          </PopoverContent>
        </Popover>
      }
    />
  );
}
```

- [ ] **Step 3: Rewrite `apps/aion2/src/features/map/sidebar/Sidebar.tsx`** (full replacement):

```tsx
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { ShellSidebar } from "@gamemap/map-shell";
import { useTheme } from "@/context/ThemeContext";
import { useGameMap } from "@/context/GameMapContext";
import { getStaticUrl } from "@/lib/url";
import Logo from "./Logo";
import SelectMap from "./SelectMap";
import MarkerTypes from "./MarkerTypes";

export default function Sidebar() {
  const { t } = useTranslation(["common"]);
  const { realTheme } = useTheme();
  const { selectedMap } = useGameMap();

  const isLight = realTheme === "light";
  const bgUrl = getStaticUrl(
    isLight ? "images/Sidebar_Light.webp" : "images/Sidebar_Dark.webp",
  );

  return (
    <ShellSidebar
      collapseLabel={t("common:menu.collapse", "Collapse")}
      expandLabel={t("common:menu.expand", "Expand")}
      classNames={{
        root: "text-foreground bg-[image:var(--background-image-sidebar)]",
        collapseButton: "text-[#3D3D3D] bg-[color:var(--color-sidebar-collapse)]",
      }}
      backgroundSlot={
        <div
          className="pointer-events-none absolute inset-0 bg-no-repeat opacity-70"
          style={{
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: "346px auto",
            backgroundPosition: "top left",
          }}
        />
      }
      headerSlot={<Logo />}
      mapSelectorSlot={<SelectMap />}
    >
      {selectedMap && (
        <div className="w-full">
          {/* Static section header — no longer collapsible. */}
          <div className="flex items-center gap-2 px-4 py-4">
            <span className="flex h-4 w-4 items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 fill-primary text-primary" />
            </span>
            <span className="truncate text-base font-bold leading-[16px]">
              {t("common:menu.markerTypes", "Marker Types")}
            </span>
          </div>
          <MarkerTypes />
        </div>
      )}
    </ShellSidebar>
  );
}
```

(Default `width` 346 = donor's `SIDEBAR_WIDTH`; the donor's inline `backgroundImage` style is replaced by the `bg-[image:…]` class on root.)

- [ ] **Step 4: Rewrite `apps/aion2/src/features/map/sidebar/MarkerTypes.tsx`** (full replacement):

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FilterPanel, type FilterCategory, type FilterControl } from "@gamemap/map-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@gamemap/ui";
import { getCategoryIcon } from "@/features/map/categoryIcons";
import { useGameMap } from "@/context/GameMapContext";
import { useGameData } from "@/context/GameDataContext";
import { useMarkers } from "@/context/MarkersContext";
import { parseIconUrl } from "@/lib/url";

// Old getCommonButtonProps colours: inactive = var(--color-sidebar-button) bg,
// #3D3D3D text (#C2C2C2 dark); active = primary blue (light) / violet (dark).
const BUTTON_SKIN = "bg-[color:var(--color-sidebar-button)] text-[#3D3D3D] dark:text-[#C2C2C2]";
const BUTTON_SKIN_ACTIVE = "bg-primary text-white dark:bg-[#7E52C1] dark:text-white";

export default function MarkerTypes() {
  const { types, selectedMap } = useGameMap();
  const {
    handleShowAllSubtypes,
    handleHideAllSubtypes,
    visibleSubtypes,
    handleToggleSubtype,
    showBorders,
    handleToggleBorders,
    lodEnabled,
    setLodEnabled,
  } = useGameData();
  const { clearMarkerCompleted, showLabels, setShowLabels, subtypeCounts, completedCounts } =
    useMarkers();
  const { t } = useTranslation(["common", "types"]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Categories that have at least one subtype with a non-zero count.
  const renderableCategories = types.filter((category) =>
    category.subtypes.some((s) => (subtypeCounts[s.name] ?? 0) > 0),
  );

  const filterCategories: FilterCategory[] = renderableCategories.map((category) => {
    const CatIcon = getCategoryIcon(category.name);
    return {
      id: category.name,
      label: t(`types:categories.${category.name}.name`, category.name),
      icon: <CatIcon className="h-3.5 w-3.5" />,
      subtypes: category.subtypes
        .filter((sub) => (subtypeCounts[sub.name] ?? 0) > 0)
        .map((sub) => {
          const total = subtypeCounts[sub.name] ?? 0;
          const completed = completedCounts[sub.name] ?? 0;
          const iconName = sub.icon || category.icon || "";
          const iconSize = (sub.iconScale || 1.0) * 20;
          return {
            id: sub.name,
            label: t(`types:subtypes.${sub.name}.name`, sub.name),
            active: visibleSubtypes?.has(sub.name) ?? false,
            badge: sub.canComplete === true ? `${completed}/${total}` : String(total),
            icon:
              iconName && selectedMap ? (
                <div className="relative flex h-5 w-5 items-center justify-center overflow-visible">
                  <img
                    src={parseIconUrl(iconName, selectedMap)}
                    alt=""
                    className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
                    style={{ width: iconSize, height: iconSize }}
                  />
                </div>
              ) : undefined,
          };
        }),
    };
  });

  const onSetCategory = (categoryId: string, visible: boolean) => {
    const category = types.find((c) => c.name === categoryId);
    if (!category) return;
    const subtypeKeys = category.subtypes
      .map((s) => s.name)
      .filter((k) => (subtypeCounts[k] ?? 0) > 0);
    for (const k of subtypeKeys) {
      const isVisible = visibleSubtypes?.has(k) ?? false;
      if (visible && !isVisible) handleToggleSubtype(k);
      if (!visible && isVisible) handleToggleSubtype(k);
    }
  };

  const controls: FilterControl[] = [
    {
      id: "show-all",
      label: t("common:menu.showAllMarkers", "Show all"),
      onClick: handleShowAllSubtypes,
    },
    {
      id: "hide-all",
      label: t("common:menu.hideAllMarkers", "Hide all"),
      onClick: handleHideAllSubtypes,
    },
    {
      id: "show-names",
      label: t("common:menu.showMarkerNames", "Show marker names"),
      onClick: () => setShowLabels(!showLabels),
      active: showLabels,
      testId: "show-names-toggle",
    },
    {
      id: "clear-completed",
      label: t("common:menu.clearMarkerCompleted", "Clear completed"),
      onClick: () => setConfirmOpen(true),
    },
    {
      id: "borders",
      label: t("common:menu.showBorders", "Show region borders"),
      onClick: handleToggleBorders,
      active: showBorders,
    },
    {
      id: "lod",
      label: t("common:menu.lodToggle", "Auto detail by zoom"),
      onClick: () => setLodEnabled(!lodEnabled),
      active: lodEnabled,
      testId: "lod-toggle",
    },
  ];

  return (
    <div className="flex w-full flex-col px-4 pb-4">
      <FilterPanel
        categories={filterCategories}
        onToggleSubtype={handleToggleSubtype}
        onSetCategory={onSetCategory}
        categoryToggleLabels={{
          show: t("common:menu.showCategory", "Show all in this category"),
          hide: t("common:menu.hideCategory", "Hide all in this category"),
        }}
        controls={controls}
        classNames={{
          controlButton: BUTTON_SKIN,
          controlButtonActive: BUTTON_SKIN_ACTIVE,
          subtypeButton: BUTTON_SKIN,
          subtypeButtonActive: BUTTON_SKIN_ACTIVE,
          categoryEyeToggle: "text-[#3D3D3D] dark:text-[#C2C2C2]",
        }}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common:menu.clearMarkerCompleted", "Clear completed")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "common:menu.clearMarkerCompletedBody",
                "Do you want to clear all completed marker in this map?",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:ui.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearMarkerCompleted()}>
              {t("common:ui.confirm", "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 5: Verify build + e2e**

```bash
pnpm build
E2E_PORT=5199 pnpm e2e
```

Expected: build clean; **23 passed + only the known `wiki.spec.ts:20` failure**. If any other test fails, fix before committing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(aion2): topbar/sidebar/filters via @gamemap/map-shell"
```

**Controller note (not the implementer subagent):** visual parity screenshots (light/dark, sidebar expanded/collapsed, both dropdown menus open) are captured on port 5177 BEFORE Task 1 and compared after this task.

---

### Task 6: Migrate palworld to the shell

**Files:**
- Modify: `apps/palworld/package.json`, `apps/palworld/src/index.css` (full rewrite), `apps/palworld/src/i18n.ts` (add `collapse`/`expand` ×16), `apps/palworld/src/App.tsx` (recompose), `apps/palworld/e2e/smoke.spec.ts` (2 tests)
- Delete: `apps/palworld/src/components/TopBar.tsx`, `apps/palworld/src/components/Sidebar.tsx`

- [ ] **Step 1: Add dependencies**

In `apps/palworld/package.json` dependencies add:

```json
"@gamemap/map-shell": "workspace:*",
"@gamemap/ui": "workspace:*"
```

Then `pnpm install`.

- [ ] **Step 2: Rewrite `apps/palworld/src/index.css`** (full replacement — shadcn tokens are required by @gamemap/ui; the `@custom-variant dark` line makes `dark:` classes never apply, deterministically, since palworld sets no `.dark` class):

```css
@import "tailwindcss";
@source "../../../packages/ui/src";
@source "../../../packages/map-shell/src";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: #171717;
  --foreground: #f5f5f5;
  --card: #262626;
  --card-foreground: #f5f5f5;
  --popover: #262626;
  --popover-foreground: #f5f5f5;
  --primary: #d97706;
  --primary-foreground: #ffffff;
  --secondary: #404040;
  --secondary-foreground: #f5f5f5;
  --muted: #404040;
  --muted-foreground: #a3a3a3;
  --accent: #404040;
  --accent-foreground: #f5f5f5;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: rgba(255, 255, 255, 0.12);
  --input: #404040;
  --ring: #d97706;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

(If the current file contains anything besides `@import "tailwindcss";`, preserve those extra rules at the end.)

- [ ] **Step 3: Add `collapse`/`expand` keys to `apps/palworld/src/i18n.ts`**

Add both keys to each of the 16 language `translation` objects (after `zoomOut`):

| lng | collapse | expand |
|---|---|---|
| en-US | Collapse | Expand |
| de-DE | Einklappen | Ausklappen |
| es-ES | Contraer | Expandir |
| es-MX | Contraer | Expandir |
| fr-FR | Réduire | Développer |
| id-ID | Ciutkan | Perluas |
| it-IT | Comprimi | Espandi |
| ko-KR | 접기 | 펼치기 |
| pl-PL | Zwiń | Rozwiń |
| pt-BR | Recolher | Expandir |
| ru-RU | Свернуть | Развернуть |
| th-TH | ย่อ | ขยาย |
| tr-TR | Daralt | Genişlet |
| vi-VN | Thu gọn | Mở rộng |
| zh-CN | 收起 | 展开 |
| zh-TW | 收起 | 展開 |

- [ ] **Step 4: Delete the bespoke chrome**

```bash
git rm apps/palworld/src/components/TopBar.tsx apps/palworld/src/components/Sidebar.tsx
```

- [ ] **Step 5: Rewrite `apps/palworld/src/App.tsx`** (full replacement):

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameMapView, type EngineMarker, type MapRef } from '@gamemap/map-engine'
import { FilterPanel, ShellSidebar, ShellTopBar, type FilterCategory } from '@gamemap/map-shell'
import type { MarkerTypeSubtype } from '@gamemap/data-contract'
import {
  loadStatic, loadMarkers,
  type MapMeta, type Taxonomy, type TypesLocale, type MapsLocale, type MarkerRow, type MarkerLocale
} from './lib/data'
import { palworldAssets } from './lib/assets'
import { palworldTheme } from './theme'
import { LANGUAGES, LANGUAGE_LABELS } from './i18n'

export default function App() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en-US'
  const mapRef = useRef<MapRef>(null)
  // Track whether visible-subtypes have been initialized at least once
  const visibleInitialized = useRef(false)

  const [staticData, setStaticData] = useState<{
    maps: MapMeta[]; types: Taxonomy; mapsL10n: MapsLocale; typesL10n: TypesLocale
  } | null>(null)
  const [mapId, setMapId] = useState('MainWorld')
  const [markerData, setMarkerData] = useState<{ markers: MarkerRow[]; l10n: MarkerLocale } | null>(null)
  const [visible, setVisible] = useState<Set<string>>(new Set())
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    loadStatic(lng)
      .then((d) => {
        if (cancelled) return
        setStaticData(d)
        // Only initialize visible set once; preserve user-set empty (Hide all)
        if (!visibleInitialized.current) {
          visibleInitialized.current = true
          setVisible(new Set(d.types.subtypes.map((s) => s.id)))
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setLoadError(t('loadError'))
      })
    return () => { cancelled = true }
  }, [lng, t])

  // Clear selection on map switch
  useEffect(() => {
    setMarkerData(null)
    setSelectedMarkerId(null)
    let cancelled = false
    loadMarkers(mapId, lng)
      .then((d) => {
        if (cancelled) return
        setMarkerData(d)
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setLoadError(t('loadError'))
      })
    return () => { cancelled = true }
  }, [mapId, lng, t])

  const map = staticData?.maps.find((m) => m.id === mapId) ?? undefined

  const subtypeMetaMap = useMemo(() => {
    if (!staticData) return new Map<string, MarkerTypeSubtype>()
    return new Map(staticData.types.subtypes.map((s) => [s.id, s]))
  }, [staticData])

  const engineMarkers: EngineMarker[] = useMemo(() => {
    if (!staticData || !markerData) return []
    return markerData.markers.map((m) => {
      const loc = markerData.l10n[m.id]
      const subLabel = staticData.typesL10n.subtypes[m.subtype]?.name ?? m.subtype
      const subtypeMeta = subtypeMetaMap.get(m.subtype)
      return {
        id: m.id,
        subtype: m.subtype,
        category: m.category,
        x: m.x,
        y: m.y,
        icon: m.icon,
        indexInSubtype: m.indexInSubtype,
        images: [] as string[],
        contributors: [] as string[],
        localizedName: loc?.name ?? subLabel,
        localizedDescription: loc?.description,
        subtypeLabel: subLabel,
        subtypeMeta,
        completed: false,
      }
    })
  }, [staticData, markerData, subtypeMetaMap])

  const onToggle = useCallback((id: string) => {
    setVisible((v) => {
      const next = new Set(v)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const onSetCategory = useCallback((categoryId: string, show: boolean) => {
    setVisible((v) => {
      if (!staticData) return v
      const next = new Set(v)
      for (const s of staticData.types.subtypes) {
        if (s.category !== categoryId) continue
        if (show) next.add(s.id); else next.delete(s.id)
      }
      return next
    })
  }, [staticData])

  const filterCategories: FilterCategory[] = useMemo(() => {
    if (!staticData) return []
    return staticData.types.categories.map((cat) => ({
      id: cat.id,
      label: staticData.typesL10n.categories[cat.id]?.name ?? cat.id,
      subtypes: staticData.types.subtypes
        .filter((s) => s.category === cat.id)
        .map((s) => ({
          id: s.id,
          label: staticData.typesL10n.subtypes[s.id]?.name ?? s.id,
          active: visible.has(s.id),
        })),
    }))
  }, [staticData, visible])

  const onToggleMarker = useCallback((id: string | null) => {
    setSelectedMarkerId((cur) => (cur === id ? null : id))
  }, [])

  const subzoneAt = useCallback(() => '', [])

  const labels = useMemo(() => ({
    copyPosition: t('copyPosition'),
    noMapSelected: t('noMapSelected'),
    zoomIn: t('zoomIn'),
    zoomOut: t('zoomOut'),
  }), [t])

  const renderPopupContent = useCallback((marker: EngineMarker) => (
    <div className="max-w-60">
      <div className="font-semibold">{marker.localizedName}</div>
      {marker.localizedDescription && (
        <div className="mt-1 whitespace-pre-line text-xs text-neutral-300">{marker.localizedDescription}</div>
      )}
    </div>
  ), [])

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-900 text-red-400">
        {loadError}
      </div>
    )
  }

  if (!staticData) return <div className="flex h-screen items-center justify-center bg-neutral-900 text-neutral-400">Loading…</div>

  return (
    <div className="flex h-screen flex-col bg-neutral-900">
      <ShellTopBar
        classNames={{ root: 'border-b border-neutral-700 bg-neutral-900 text-neutral-100' }}
        leftSlot={<h1 className="text-sm font-semibold">{t('title')}</h1>}
        languageSwitcher={{
          languages: LANGUAGES.map((code) => ({ code, label: LANGUAGE_LABELS[code] })),
          current: lng,
          onChange: (code) => void i18n.changeLanguage(code),
          menuLabel: 'language',
        }}
      />
      <div className="flex min-h-0 flex-1">
        <ShellSidebar
          width={256}
          collapseLabel={t('collapse')}
          expandLabel={t('expand')}
          classNames={{
            root: 'border-r border-neutral-700 bg-neutral-900 text-sm text-neutral-100',
            collapseButton: 'bg-neutral-800 text-neutral-100',
            content: 'px-3 pt-3',
          }}
          mapSelector={{
            maps: staticData.maps.map((m) => ({
              id: m.id,
              label: staticData.mapsL10n[m.id]?.shortName ?? staticData.mapsL10n[m.id]?.name ?? m.id,
            })),
            activeMapId: mapId,
            onSelectMap: setMapId,
          }}
        >
          <FilterPanel
            categories={filterCategories}
            onToggleSubtype={onToggle}
            onSetCategory={onSetCategory}
            categoryToggleLabels={{ show: t('showAll'), hide: t('hideAll') }}
            controls={[
              {
                id: 'show-all',
                label: t('showAll'),
                onClick: () => setVisible(new Set(staticData.types.subtypes.map((s) => s.id))),
              },
              { id: 'hide-all', label: t('hideAll'), onClick: () => setVisible(new Set()) },
            ]}
            classNames={{
              controlButton: 'bg-neutral-800 text-neutral-100',
              subtypeButton: 'bg-neutral-800 text-neutral-100',
              subtypeButtonActive: 'bg-amber-600 text-white',
            }}
          />
        </ShellSidebar>
        <main className="relative flex min-w-0 flex-1 overflow-hidden">
          <GameMapView
            mapRef={mapRef}
            map={map}
            markers={engineMarkers}
            regions={[]}
            visibleSubtypes={visible}
            showLabels={false}
            showBorders={false}
            lodEnabled={false}
            selectedMarkerId={selectedMarkerId}
            selectedPosition={null}
            onToggleMarker={onToggleMarker}
            subzoneAt={subzoneAt}
            flyToDuration={0.5}
            assets={palworldAssets}
            theme={palworldTheme}
            exposeTestHandle={import.meta.env.DEV}
            renderPopupContent={renderPopupContent}
            labels={labels}
          />
        </main>
      </div>
    </div>
  )
}
```

(The `LanguageDetector` in i18n.ts persists language choices exactly as before; the topbar `<select>` → dropdown is the accepted UI change. `mapsL10n` label fallback chain is unchanged.)

- [ ] **Step 6: Update `apps/palworld/e2e/smoke.spec.ts`** (two edits):

Test 3 — the subtype toggle is now an `aria-pressed` button, not a checkbox. Replace:

```ts
  // The testid is on the <input type="checkbox"> directly — uncheck works.
  await page.getByTestId('subtype-toggle-fastTravel').uncheck()
```

with:

```ts
  // The testid is on an aria-pressed toggle button — click to hide.
  await page.getByTestId('subtype-toggle-fastTravel').click()
```

Test 4 — the language `<select>` is now the shared dropdown. Replace:

```ts
  await page.getByLabel('language').selectOption('ko-KR')
```

with:

```ts
  await page.getByTestId('lang-menu').click()
  await page.getByTestId('lang-ko-KR').click()
```

Test 5 needs no change — `map-tab-WorldTree` is preserved on the sidebar map selector.

- [ ] **Step 7: Verify build + e2e**

```bash
pnpm build:palworld
pnpm e2e:palworld
```

Expected: build clean; **5 passed**.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(palworld): shared shell chrome (topbar, sidebar, filter panel)"
```

---

### Task 7: Final gates (no commit)

- [ ] **Step 1: Run every gate from the workspace root**

```bash
pnpm check:shell
pnpm check:engine
pnpm test
pnpm build
pnpm build:palworld
pnpm e2e:palworld
E2E_PORT=5199 pnpm e2e
```

Expected: both grep gates silent-clean; vitest all green; both builds clean; palworld 5 passed; aion2 23 passed + only the known `wiki.spec.ts:20` wiki-drift failure.

- [ ] **Step 2: Duplication check**

`grep -rn "DropdownMenu\|ScrollArea\|AccordionItem" apps/palworld/src apps/aion2/src/components apps/aion2/src/features/map/sidebar` — no primitive implementations remain in apps; only imports from `@gamemap/ui` / `@gamemap/map-shell`.

- [ ] **Step 3: Report** — hand back to the controller for visual parity comparison and superpowers:finishing-a-development-branch (auto mode: keep branch `worktree-shared-shell` as-is, no push, keep worktree).
