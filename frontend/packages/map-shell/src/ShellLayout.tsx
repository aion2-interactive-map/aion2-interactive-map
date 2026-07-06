import type { ReactNode } from "react"
import { cn } from "@gamemap/ui"

export interface ShellLayoutProps {
  /** Full-height sidebar on the left (e.g. <ShellSidebar/>). */
  sidebar: ReactNode
  /** Top bar for the content area, sitting to the right of the sidebar. */
  topBar: ReactNode
  /** Main content, below the top bar. */
  children: ReactNode
  className?: string
}

/**
 * App shell layout: a full-height sidebar on the left, and a content column
 * (top bar + main) filling the rest. The top bar therefore starts at the right
 * edge of the sidebar; when the sidebar collapses to zero width, the top bar
 * and main content extend to the left edge of the page.
 */
export function ShellLayout({ sidebar, topBar, children, className }: ShellLayoutProps) {
  return (
    <div className={cn("flex h-screen w-screen overflow-hidden", className)}>
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {topBar}
        {children}
      </div>
    </div>
  )
}
