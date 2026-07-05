import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ShellTopBar, ThemeToggle } from '@gamemap/map-shell'
import { Input } from '@gamemap/ui'
import { LANGUAGES, LANGUAGE_LABELS } from '../../i18n'
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

  const topBar = (
    <ShellTopBar
      classNames={{ root: 'border-b border-border bg-card text-card-foreground' }}
      leftSlot={
        <>
          <Link to="/" className="text-sm text-foreground/70 hover:text-foreground">
            {t('breeding.navMap')}
          </Link>
          <span className="text-sm font-semibold">{t('pal.title')}</span>
          <Link to="/breeding" className="text-sm text-foreground/70 hover:text-foreground">
            {t('breeding.navBreeding')}
          </Link>
        </>
      }
      languageSwitcher={{
        languages: LANGUAGES.map((code) => ({ code, label: LANGUAGE_LABELS[code] })),
        current: lng,
        onChange: (code) => void i18n.changeLanguage(code),
        menuLabel: 'language',
      }}
      rightExtras={
        <ThemeToggle labels={{ auto: t('themeAuto'), light: t('themeLight'), dark: t('themeDark') }} />
      }
    />
  )

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {topBar}
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
