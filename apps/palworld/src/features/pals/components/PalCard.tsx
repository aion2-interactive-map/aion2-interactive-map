import { Link } from '@tanstack/react-router'
import { palIconUrl } from '../../../lib/assets'
import { formatPalId } from '../../../lib/palId'
import type { PalEntry } from '../../../lib/pals'

/** A roster tile for the `/pals` grid: icon, Paldeck id, name. Links to detail. */
export function PalCard({ pal, name }: { pal: PalEntry; name: string }) {
  const pid = formatPalId(pal.zukanIndex, pal.zukanIndexSuffix)
  return (
    <Link
      to="/pals/$id"
      params={{ id: pal.id }}
      className="group flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center shadow-sm transition hover:border-primary/60 hover:bg-accent"
      data-testid="pal-card"
    >
      <img
        src={palIconUrl(pal.icon)}
        alt=""
        loading="lazy"
        className="size-16 shrink-0 object-contain"
      />
      {pid ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {pid.text}
          {pid.accent ? <span className="text-primary">{pid.accent}</span> : null}
        </span>
      ) : null}
      <span className="line-clamp-2 text-xs font-medium leading-tight">{name}</span>
    </Link>
  )
}
