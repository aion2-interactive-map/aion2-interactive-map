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
import { loadItems, type ItemsBundle } from '../../lib/catalog'
import { itemTypeLabel } from '../catalog/labels'
import { CatalogPageLoading, rarityBorderClass } from '../catalog/components'

export default function ItemListPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en-US'

  const [bundle, setBundle] = useState<ItemsBundle | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    loadItems(lng)
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

  // Distinct categories (TypeA) present, sorted by localized label.
  const categories = useMemo(() => {
    if (!bundle) return []
    const set = new Set(bundle.items.map((i) => i.typeA))
    return [...set].sort((a, b) =>
      itemTypeLabel(a, bundle.typeLabels).localeCompare(itemTypeLabel(b, bundle.typeLabels)),
    )
  }, [bundle])

  const list = useMemo(() => {
    if (!bundle) return []
    const q = query.trim().toLowerCase()
    return bundle.items
      .filter((i) => cat === 'all' || i.typeA === cat)
      .filter((i) => !q || (bundle.text[i.id]?.name ?? i.id).toLowerCase().includes(q))
      .sort((a, b) => (bundle.text[a.id]?.name ?? a.id).localeCompare(bundle.text[b.id]?.name ?? b.id))
  }, [bundle, query, cat])

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopNav active="/items" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('item.searchPlaceholder')}
              className="max-w-sm"
            />
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('item.all')}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {itemTypeLabel(c, bundle?.typeLabels)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {bundle ? (
              <span className="text-sm text-muted-foreground">
                {t('item.count', { count: list.length })}
              </span>
            ) : null}
          </div>

          {loadError ? (
            <div className="mt-8 text-center text-destructive">{loadError}</div>
          ) : !bundle ? (
            <CatalogPageLoading />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {list.map((i) => (
                <Link
                  key={i.id}
                  to="/items/$id"
                  params={{ id: i.id }}
                  data-testid="item-card"
                  className={`group flex flex-col gap-1 rounded-lg border-l-4 border border-border bg-card p-3 shadow-sm transition hover:border-primary/60 hover:bg-accent ${rarityBorderClass(i.rarity)}`}
                >
                  <span className="line-clamp-2 text-sm font-medium leading-tight">
                    {bundle.text[i.id]?.name ?? i.id}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{itemTypeLabel(i.typeA, bundle.typeLabels)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
