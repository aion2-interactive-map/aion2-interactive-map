import { Link } from '@tanstack/react-router'
import { Sparkles, Star, Zap } from 'lucide-react'
import { cn } from '@gamemap/ui'
import type { BreedingPal, Combo, Gender, NameMap } from '../../lib/breeding'
import { palIconUrl } from '../../lib/breeding'
import { formatPalId } from '../../lib/palId'

// Per-Pal display metadata used by a recipe card (icon, Paldeck id, breeding
// power, legendary flag), keyed by Pal id.
export interface RecipeMetaEntry {
  icon?: string
  zukanIndex: number
  zukanIndexSuffix: string
  rank: number
  legendary?: boolean
}
export type RecipeMeta = Map<string, RecipeMetaEntry>

export function buildRecipeMeta(pals: BreedingPal[]): RecipeMeta {
  return new Map(
    pals.map((p) => [
      p.id,
      {
        icon: p.icon,
        zukanIndex: p.zukanIndex,
        zukanIndexSuffix: p.zukanIndexSuffix,
        rank: p.rank,
        legendary: p.legendary,
      },
    ]),
  )
}

// Gold ring + glow marking a legendary Pal's icon (self-bred only).
const LEGENDARY_ICON = 'ring-2 ring-amber-400 shadow-[0_0_6px_1px_rgba(251,191,36,0.55)]'

function GenderMark({ g }: { g?: Gender }) {
  if (!g) return null
  return (
    <span
      className={g === 'M' ? 'font-semibold text-sky-500' : 'font-semibold text-pink-500'}
      title={g === 'M' ? 'Male' : 'Female'}
    >
      {g === 'M' ? '♂' : '♀'}
    </span>
  )
}

function PalChip({
  id,
  names,
  meta,
  gender,
  emphasis,
}: {
  id: string
  names: NameMap
  meta: RecipeMeta
  gender?: Gender
  emphasis?: boolean
}) {
  const m = meta.get(id)
  const pid = m ? formatPalId(m.zukanIndex, m.zukanIndexSuffix) : undefined
  return (
    <Link
      to="/pals/$id"
      params={{ id }}
      className="group flex min-w-0 items-center gap-1.5"
    >
      {m?.icon ? (
        <img
          src={palIconUrl(m.icon)}
          alt=""
          loading="lazy"
          className={cn(
            'size-7 shrink-0 rounded-full bg-black/5 object-contain dark:bg-white/10',
            m.legendary && LEGENDARY_ICON,
          )}
        />
      ) : null}
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={cn(
            'truncate decoration-primary/40 underline-offset-2 group-hover:text-primary group-hover:underline',
            emphasis && 'font-semibold',
          )}
        >
          {names[id] ?? id}
          <GenderMark g={gender} />
        </span>
        <span className="flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground">
          {pid ? (
            <span>
              {pid.text}
              {pid.accent ? <span className="text-primary">{pid.accent}</span> : null}
            </span>
          ) : null}
          {m ? (
            <span className="inline-flex items-center gap-0.5">
              <Zap className="size-2.5 shrink-0" />
              {m.rank}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  )
}

export interface RecipeCardProps {
  f: Combo
  names: NameMap
  meta: RecipeMeta
  uniqueLabel: string
  /** When provided, renders a favourite-toggle star. */
  fav?: { isFav: boolean; onToggle: () => void; label: string }
}

/**
 * One breeding recipe `A + B = C`. Width-flexible (the parent grid controls
 * column count) so the same card serves the wide calculator and the narrower
 * Paldeck breeding section. The star is only rendered when `fav` is given.
 */
export function RecipeCard({ f, names, meta, uniqueLabel, fav }: RecipeCardProps) {
  return (
    <div
      className={cn(
        'relative grid items-center gap-1.5 rounded-lg border px-3 py-2 text-sm',
        fav ? 'grid-cols-[1fr_auto_1fr_auto_1fr_auto]' : 'grid-cols-[1fr_auto_1fr_auto_1fr]',
        f.unique
          ? 'border-amber-400/70 bg-amber-400/10 ring-1 ring-amber-400/30'
          : 'border-border bg-card',
      )}
    >
      {f.unique ? (
        <span
          className={cn(
            'absolute -top-2 inline-flex items-center gap-1 rounded-full border border-amber-400/70 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300',
            fav ? 'right-8' : 'right-2',
          )}
          title={uniqueLabel}
        >
          <Sparkles className="size-3" />
          {uniqueLabel}
        </span>
      ) : null}
      <PalChip id={f.a} names={names} meta={meta} gender={f.ag} />
      <span className="text-muted-foreground">+</span>
      <PalChip id={f.b} names={names} meta={meta} gender={f.bg} />
      <span className="text-muted-foreground">=</span>
      <PalChip id={f.c} names={names} meta={meta} emphasis />
      {fav ? (
        <button
          type="button"
          onClick={fav.onToggle}
          aria-label={fav.label}
          aria-pressed={fav.isFav}
          title={fav.label}
          className="ml-1 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Star className={cn('size-4', fav.isFav && 'fill-amber-400 text-amber-400')} />
        </button>
      ) : null}
    </div>
  )
}
