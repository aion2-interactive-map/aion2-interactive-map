import { cn } from "@gamemap/ui"

/**
 * A short id shown as a monospace chip, e.g. a Paldeck number "No.037".
 * `accent` is an optional trailing segment (e.g. the variant suffix "B")
 * rendered in a distinct color. This component is the single place that
 * defines how an id label looks across the shell (sidebar, popup, ...).
 */
export type IdLabelValue = {
  /** Main text, e.g. "No.037". */
  text: string
  /** Optional trailing segment rendered in the accent color, e.g. "B". */
  accent?: string
}

export type IdLabelProps = {
  value: IdLabelValue
  /** Extra classes for the chip (e.g. to enlarge it in a popup). */
  className?: string
  /** Overrides the accent color (defaults to the theme primary). */
  accentClassName?: string
}

export function IdLabel({ value, className, accentClassName }: IdLabelProps) {
  return (
    <span
      className={cn(
        "shrink-0 rounded bg-muted px-1 text-[11px] font-mono tabular-nums text-muted-foreground",
        className,
      )}
    >
      {value.text}
      {value.accent ? (
        <span className={cn("text-primary", accentClassName)}>{value.accent}</span>
      ) : null}
    </span>
  )
}
