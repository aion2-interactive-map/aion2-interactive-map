import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@gamemap/ui'
import { TopNav } from '../../components/TopNav'
import { loadBuildings, type BuildingsBundle } from '../../lib/catalog'
import { buildingTypeLabel } from '../catalog/labels'
import { BuildingGlyph, CatalogPageLoading } from '../catalog/components'

export default function BuildingListPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en-US'

  const [bundle, setBundle] = useState<BuildingsBundle | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    loadBuildings(lng)
      .then((b) => {
        if (!cancelled) setBundle(b)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setLoadError(t('loadError'))
      })
    return () => {
      cancelled = true
    }
  }, [lng, t])

  const categories = useMemo(() => {
    if (!bundle) return []
    const set = new Set(bundle.buildings.map((b) => b.typeA))
    return [...set].sort((a, b) => buildingTypeLabel(a).localeCompare(buildingTypeLabel(b)))
  }, [bundle])

  const list = useMemo(() => {
    if (!bundle) return []
    const q = query.trim().toLowerCase()
    return bundle.buildings
      .filter((b) => cat === 'all' || b.typeA === cat)
      .filter((b) => !q || (bundle.text[b.id]?.name ?? b.id).toLowerCase().includes(q))
      .sort((a, b) => (bundle.text[a.id]?.name ?? a.id).localeCompare(bundle.text[b.id]?.name ?? b.id))
  }, [bundle, query, cat])

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopNav active="/buildings" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('building.searchPlaceholder')}
              className="max-w-sm"
            />
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('building.all')}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {buildingTypeLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {bundle ? (
              <span className="text-sm text-muted-foreground">
                {t('building.count', { count: list.length })}
              </span>
            ) : null}
          </div>

          {loadError ? (
            <div className="mt-8 text-center text-destructive">{loadError}</div>
          ) : !bundle ? (
            <CatalogPageLoading />
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {list.map((b) => (
                <Link
                  key={b.id}
                  to="/buildings/$id"
                  params={{ id: b.id }}
                  data-testid="building-card"
                  className="group flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center shadow-sm transition hover:border-primary/60 hover:bg-accent"
                >
                  {b.icon ? (
                    <BuildingGlyph icon={b.icon} size={48} />
                  ) : (
                    <div className="size-12" />
                  )}
                  <span className="line-clamp-2 text-xs font-medium leading-tight">
                    {bundle.text[b.id]?.name ?? b.id}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
