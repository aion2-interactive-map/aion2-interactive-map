import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearch } from '@tanstack/react-router'
import { ShellTopBar, ThemeToggle } from '@gamemap/map-shell'
import { Button } from '@gamemap/ui'
import { LANGUAGES, LANGUAGE_LABELS } from '../../i18n'
import {
  comboKey,
  favKey,
  loadBreeding,
  makeEngine,
  queryFormulas,
  type BreedingData,
  type Combo,
  type NameMap,
} from '../../lib/breeding'
import { PalPicker } from './PalPicker'
import { RecipeCard, buildRecipeMeta } from './RecipeCard'

// Cap on rendered cards; a target-only query can match >1000 parent pairs. Set
// above the default browse list (~365: every Pal + special combos) so that view
// is never truncated.
const RENDER_CAP = 500

const FAV_STORAGE_KEY = 'palworld.breeding.favs'

export default function BreedingPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en-US'

  // Prefill Parent A / Parent B / Child from ?a=&b=&c= (e.g. opened from a
  // Paldeck page). Read once to seed state; invalid ids are dropped after load.
  const search = useSearch({ from: '/breeding' })

  const [payload, setPayload] = useState<{ data: BreedingData; names: NameMap } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [aSel, setASel] = useState<string | null>(search.a ?? null)
  const [bSel, setBSel] = useState<string | null>(search.b ?? null)
  const [cSel, setCSel] = useState<string | null>(search.c ?? null)
  const [favs, setFavs] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(FAV_STORAGE_KEY)
      return new Set(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify([...favs]))
    } catch { /* no storage */ }
  }, [favs])

  const toggleFav = useCallback((key: string) => {
    setFavs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    loadBreeding(lng)
      .then((p) => {
        if (!cancelled) setPayload(p)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setLoadError(t('loadError'))
      })
    return () => {
      cancelled = true
    }
  }, [lng, t])

  // Drop any prefilled selection that isn't a real roster Pal.
  useEffect(() => {
    if (!payload) return
    const ids = new Set(payload.data.pals.map((p) => p.id))
    const clean = (v: string | null) => (v && !ids.has(v) ? null : v)
    setASel(clean)
    setBSel(clean)
    setCSel(clean)
  }, [payload])

  const engine = useMemo(() => (payload ? makeEngine(payload.data) : null), [payload])

  const meta = useMemo(() => buildRecipeMeta(payload?.data.pals ?? []), [payload])

  const result = useMemo(() => {
    if (!payload || !engine) return { list: [] as Combo[], total: 0, browsingSpecial: false }
    return queryFormulas(engine, payload.data, { a: aSel, b: bSel, c: cSel })
  }, [payload, engine, aSel, bSel, cSel])

  const hasFilter = aSel != null || bSel != null || cSel != null

  // Same filter + sort as everything else, but favourites float to the top
  // (stable partition preserves the sorted order within each group).
  const ordered = useMemo(() => {
    if (favs.size === 0) return result.list
    const fav: Combo[] = []
    const rest: Combo[] = []
    for (const f of result.list) (favs.has(favKey(f)) ? fav : rest).push(f)
    return [...fav, ...rest]
  }, [result.list, favs])
  const shown = ordered.slice(0, RENDER_CAP)

  const pickerLabels = {
    anyPal: t('breeding.anyPal'),
    searchPal: t('breeding.searchPal'),
    noPalFound: t('breeding.noPalFound'),
  }

  const topBar = (
    <ShellTopBar
      classNames={{ root: 'border-b border-border bg-card text-card-foreground' }}
      leftSlot={
        <>
          <Link to="/" className="text-sm text-foreground/70 hover:text-foreground">
            {t('breeding.navMap')}
          </Link>
          <span className="text-sm font-semibold">{t('breeding.title')}</span>
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
        <div className="mx-auto w-full max-w-4xl px-4 py-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <PalPicker
              label={t('breeding.parentA')}
              pals={payload?.data.pals ?? []}
              names={payload?.names ?? {}}
              value={aSel}
              onChange={setASel}
              labels={pickerLabels}
            />
            <PalPicker
              label={t('breeding.parentB')}
              pals={payload?.data.pals ?? []}
              names={payload?.names ?? {}}
              value={bSel}
              onChange={setBSel}
              labels={pickerLabels}
            />
            <PalPicker
              label={t('breeding.child')}
              pals={payload?.data.pals ?? []}
              names={payload?.names ?? {}}
              value={cSel}
              onChange={setCSel}
              labels={pickerLabels}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {result.browsingSpecial
                ? t('breeding.showingSpecial')
                : t('breeding.combinations', { count: result.total })}
            </span>
            {hasFilter ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setASel(null)
                  setBSel(null)
                  setCSel(null)
                }}
              >
                {t('breeding.clear')}
              </Button>
            ) : null}
          </div>

          {loadError ? (
            <div className="mt-8 text-center text-destructive">{loadError}</div>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
                {shown.map((f) => {
                  const fk = favKey(f)
                  return (
                    <RecipeCard
                      key={comboKey(f)}
                      f={f}
                      names={payload?.names ?? {}}
                      meta={meta}
                      uniqueLabel={t('breeding.unique')}
                      fav={{ isFav: favs.has(fk), onToggle: () => toggleFav(fk), label: t('breeding.favorite') }}
                    />
                  )
                })}
              </div>
              {result.total > shown.length ? (
                <div className="mt-3 text-center text-sm text-muted-foreground">
                  {t('breeding.more', { count: result.total - shown.length })}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
