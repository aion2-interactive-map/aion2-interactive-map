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
