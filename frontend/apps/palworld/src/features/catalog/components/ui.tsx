import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@gamemap/ui'
import { buildingIconUrl } from '../../../lib/catalog'
import { palIconUrl } from '../../../lib/assets'

/** A titled panel — the catalog encyclopedias' section container. */
export function CatalogSection({
  title,
  children,
  className,
  testId,
}: {
  title?: string
  children: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm',
        className,
      )}
      data-testid={testId}
    >
      {title ? <h2 className="mb-3 text-sm font-semibold">{title}</h2> : null}
      {children}
    </section>
  )
}

export function InfoRows({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-border/60 text-sm">{children}</dl>
}

/** A label/value pair; used for property tables. */
export function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(6rem,auto)_minmax(0,1fr)] gap-3 py-1.5 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium tabular-nums break-words">{value}</dd>
    </div>
  )
}

export function CatalogPageLoading() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4" role="status" aria-label={t('catalogLoading')}>
      <div className="h-7 w-56 animate-pulse rounded bg-secondary" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-secondary" />
      <div className="h-4 w-2/3 max-w-md animate-pulse rounded bg-secondary" />
      <div className="h-64 w-full animate-pulse rounded-md bg-secondary" />
    </div>
  )
}

export function CatalogNotFound({
  message,
  to,
  backLabel,
}: {
  message: string
  to: '/items' | '/buildings'
  backLabel: string
}) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">{message}</p>
      <Link to={to} className="text-sm text-primary hover:underline">
        {backLabel}
      </Link>
    </div>
  )
}

/** Rarity → border accent, mirroring Palworld's tier colors. */
export function rarityBorderClass(rarity: number): string {
  if (rarity >= 7) return 'border-orange-400/70'
  if (rarity >= 5) return 'border-purple-400/70'
  if (rarity >= 3) return 'border-sky-400/70'
  if (rarity >= 1) return 'border-emerald-400/70'
  return 'border-border'
}

const CHIP =
  'inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2 py-1 text-sm transition hover:border-primary/60 hover:bg-accent'

/** Cross-link chip to an item detail page. */
export function ItemLink({ id, name }: { id: string; name: string }) {
  return (
    <Link to="/items/$id" params={{ id }} className={CHIP}>
      {name}
    </Link>
  )
}

/** Cross-link chip to a building detail page (icon + name). */
export function BuildingLink({ id, name, icon }: { id: string; name: string; icon?: string }) {
  return (
    <Link to="/buildings/$id" params={{ id }} className={CHIP}>
      {icon ? <BuildingGlyph icon={icon} /> : null}
      {name}
    </Link>
  )
}

/** Cross-link chip to a pal detail page (icon + name). */
export function PalLink({ id, name, icon }: { id: string; name: string; icon?: string }) {
  return (
    <Link to="/pals/$id" params={{ id }} className={CHIP}>
      {icon ? (
        <img src={palIconUrl(icon)} alt="" loading="lazy" className="size-5 shrink-0 object-contain" />
      ) : null}
      {name}
    </Link>
  )
}

/** A build/craft material: item link + required count. */
export function MaterialRow({ id, name, count }: { id: string; name: string; count: number }) {
  return (
    <Link
      to="/items/$id"
      params={{ id }}
      className="flex items-center gap-2 py-1.5 text-sm transition first:pt-0 last:pb-0 hover:text-primary"
    >
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">×{count}</span>
    </Link>
  )
}

/** A building icon that removes itself if the asset is missing. */
export function BuildingGlyph({ icon, size = 20 }: { icon: string; size?: number }) {
  const [ok, setOk] = useState(true)
  if (!ok) return null
  return (
    <img
      src={buildingIconUrl(icon)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setOk(false)}
      className="shrink-0 object-contain"
    />
  )
}
