import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@gamemap/ui'
import { TopNav } from '../../components/TopNav'
import { loadPals, type PalsBundle } from '../../lib/pals'
import { PalCard, PalPageLoading } from './components'

export default function PalListPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en-US'

  const [bundle, setBundle] = useState<PalsBundle | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    loadPals(lng)
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

  const roster = useMemo(() => {
    if (!bundle) return []
    const sorted = [...bundle.pals].sort(
      (a, b) => a.zukanIndex - b.zukanIndex || a.zukanIndexSuffix.localeCompare(b.zukanIndexSuffix),
    )
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    const digits = q.replace(/^no\.?/, '').replace(/^0+/, '')
    return sorted.filter((p) => {
      const name = (bundle.text[p.id]?.name ?? p.id).toLowerCase()
      if (name.includes(q)) return true
      if (/^\d+$/.test(digits) && String(p.zukanIndex) === digits) return true
      return false
    })
  }, [bundle, query])

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopNav active="/pals" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          <div className="mb-4 flex items-center gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('pal.searchPlaceholder')}
              className="max-w-sm"
            />
            {bundle ? (
              <span className="text-sm text-muted-foreground">
                {t('pal.count', { count: roster.length })}
              </span>
            ) : null}
          </div>

          {loadError ? (
            <div className="mt-8 text-center text-destructive">{loadError}</div>
          ) : !bundle ? (
            <PalPageLoading />
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {roster.map((p) => (
                <PalCard key={p.id} pal={p} name={bundle.text[p.id]?.name ?? p.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
