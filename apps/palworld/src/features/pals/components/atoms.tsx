import { useState } from 'react'
import { cn } from '@gamemap/ui'
import { elementIconUrl, workIconUrl } from '../../../lib/assets'
import type { ActiveSkill, Element, WorkType } from '../../../lib/pals'

/** An <img> that removes itself if the asset is missing (e.g. OilExtraction
 *  has no work icon), letting an adjacent text label stand in. */
function IconImg({
  src,
  alt,
  size,
  className,
}: {
  src: string
  alt: string
  size: number
  className?: string
}) {
  const [ok, setOk] = useState(true)
  if (!ok) return null
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setOk(false)}
      className={cn('shrink-0 object-contain', className)}
    />
  )
}

/** Element icon + name pill. */
export function ElementBadge({
  element,
  label,
  size = 18,
}: {
  element: Element
  label: string
  size?: number
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      <IconImg src={elementIconUrl(element)} alt="" size={size} />
      {label}
    </span>
  )
}

/** Work-suitability icon + localized name + level badge. Falls back to the
 *  label alone when the work type has no icon (OilExtraction). */
export function WorkSuitability({
  work,
  level,
  label,
  description,
  highlight,
}: {
  work: WorkType
  level: number
  label: string
  description?: string
  highlight?: boolean
}) {
  return (
    <div
      title={description}
      className={cn(
        'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm',
        highlight
          ? 'border-primary/60 bg-primary/10'
          : 'border-border bg-secondary/40',
      )}
    >
      <IconImg src={workIconUrl(work)} alt="" size={22} />
      <span className="min-w-0 truncate">{label}</span>
      <span className="ml-auto shrink-0 rounded bg-background/70 px-1.5 py-0.5 text-xs font-semibold tabular-nums">
        Lv{level}
      </span>
    </div>
  )
}

/** One row of the active-skill table. Render inside a <tbody>. */
export function ActiveSkillRow({
  skill,
  name,
  description,
  categoryLabel,
}: {
  skill: ActiveSkill
  name: string
  description?: string
  categoryLabel?: string
}) {
  return (
    <tr className="border-t border-border/60 align-top">
      <td className="py-2 pr-2 text-center tabular-nums text-muted-foreground">{skill.level}</td>
      <td className="py-2 pr-2">
        <div className="flex items-center gap-1.5 font-medium">
          <IconImg src={elementIconUrl(skill.element as Element)} alt="" size={16} />
          {name}
        </div>
        {description ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
        ) : null}
        {categoryLabel ? (
          <div className="mt-0.5 text-[11px] text-muted-foreground/80">{categoryLabel}</div>
        ) : null}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums">{skill.power || '—'}</td>
      <td className="py-2 text-right tabular-nums text-muted-foreground">{skill.coolTime}s</td>
    </tr>
  )
}

/** Innate passive skill: name + effect description. */
export function PassiveRow({ name, description }: { name: string; description?: string }) {
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <div className="text-sm font-medium">{name}</div>
      {description ? (
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      ) : null}
    </div>
  )
}

/** A kill-drop item: name + drop rate + quantity range. */
export function DropRow({
  name,
  rate,
  min,
  max,
}: {
  name: string
  rate: number
  min: number
  max: number
}) {
  const qty = min === max ? `${min}` : `${min}–${max}`
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm first:pt-0 last:pb-0">
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">×{qty}</span>
      <span className="w-14 shrink-0 text-right tabular-nums">{rate}%</span>
    </div>
  )
}
