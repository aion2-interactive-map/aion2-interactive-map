import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@gamemap/ui'

/** A titled panel — the encyclopedia's section container. */
export function PalSection({
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

/** A label/value pair; used for stats and header facts. */
export function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(6rem,auto)_minmax(0,1fr)] gap-3 py-1.5 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium tabular-nums break-words">{value}</dd>
    </div>
  )
}

export function PalPageLoading() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4" role="status" aria-label={t('pal.loading')}>
      <div className="h-7 w-56 animate-pulse rounded bg-secondary" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-secondary" />
      <div className="h-4 w-2/3 max-w-md animate-pulse rounded bg-secondary" />
      <div className="h-64 w-full animate-pulse rounded-md bg-secondary" />
    </div>
  )
}

export function PalNotFound({ id }: { id: string }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">{t('pal.notFound', { id })}</p>
      <Link to="/pals" className="text-sm text-primary hover:underline">
        {t('pal.backToList')}
      </Link>
    </div>
  )
}
