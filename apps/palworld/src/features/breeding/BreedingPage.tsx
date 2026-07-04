import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Sparkles, Star } from 'lucide-react'
import { ShellTopBar, ThemeToggle } from '@gamemap/map-shell'
import { Button, cn } from '@gamemap/ui'
import { LANGUAGES, LANGUAGE_LABELS } from '../../i18n'
import {
  comboKey,
  favKey,
  loadBreeding,
  makeEngine,
  palIconUrl,
  queryFormulas,
  type BreedingData,
  type Combo,
  type Gender,
  type NameMap,
} from '../../lib/breeding'
import { formatPalId } from '../../lib/palId'
import { PalPicker } from './PalPicker'

// Cap on rendered cards; a target-only query can match >1000 parent pairs. Set
// above the default browse list (~365: every Pal + special combos) so that view
// is never truncated.
const RENDER_CAP = 500

const FAV_STORAGE_KEY = 'palworld.breeding.favs'

type ZukanMap = Map<string, { zukanIndex: number; zukanIndexSuffix: string }>

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
  iconById,
  zukanById,
  gender,
  emphasis,
}: {
  id: string
  names: NameMap
  iconById: Map<string, string>
  zukanById: ZukanMap
  gender?: Gender
  emphasis?: boolean
}) {
  const icon = iconById.get(id)
  const z = zukanById.get(id)
  const pid = z ? formatPalId(z.zukanIndex, z.zukanIndexSuffix) : undefined
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {icon ? (
        <img
          src={palIconUrl(icon)}
          alt=""
          loading="lazy"
          className="size-7 shrink-0 rounded-full bg-black/5 object-contain dark:bg-white/10"
        />
      ) : null}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={emphasis ? 'truncate font-semibold' : 'truncate'}>
          {names[id] ?? id}
          <GenderMark g={gender} />
        </span>
        {pid ? (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {pid.text}
            {pid.accent ? <span className="text-primary">{pid.accent}</span> : null}
          </span>
        ) : null}
      </span>
    </span>
  )
}

function FormulaCard({
  f,
  names,
  iconById,
  zukanById,
  uniqueLabel,
  isFav,
  onToggleFav,
  favLabel,
}: {
  f: Combo
  names: NameMap
  iconById: Map<string, string>
  zukanById: ZukanMap
  uniqueLabel: string
  isFav: boolean
  onToggleFav: () => void
  favLabel: string
}) {
  return (
    <div
      className={cn(
        'relative grid grid-cols-[1fr_auto_1fr_auto_1fr_auto] items-center gap-1.5 rounded-lg border px-3 py-2 text-sm',
        f.unique
          ? 'border-amber-400/70 bg-amber-400/10 ring-1 ring-amber-400/30'
          : 'border-border bg-card',
      )}
    >
      {f.unique ? (
        <span
          className="absolute -top-2 right-8 inline-flex items-center gap-1 rounded-full border border-amber-400/70 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          title={uniqueLabel}
        >
          <Sparkles className="size-3" />
          {uniqueLabel}
        </span>
      ) : null}
      <PalChip id={f.a} names={names} iconById={iconById} zukanById={zukanById} gender={f.ag} />
      <span className="text-muted-foreground">+</span>
      <PalChip id={f.b} names={names} iconById={iconById} zukanById={zukanById} gender={f.bg} />
      <span className="text-muted-foreground">=</span>
      <PalChip id={f.c} names={names} iconById={iconById} zukanById={zukanById} emphasis />
      <button
        type="button"
        onClick={onToggleFav}
        aria-label={favLabel}
        aria-pressed={isFav}
        title={favLabel}
        className="ml-1 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Star className={cn('size-4', isFav && 'fill-amber-400 text-amber-400')} />
      </button>
    </div>
  )
}

export default function BreedingPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en-US'

  const [payload, setPayload] = useState<{ data: BreedingData; names: NameMap } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [aSel, setASel] = useState<string | null>(null)
  const [bSel, setBSel] = useState<string | null>(null)
  const [cSel, setCSel] = useState<string | null>(null)
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

  const engine = useMemo(() => (payload ? makeEngine(payload.data) : null), [payload])

  const iconById = useMemo(
    () => new Map((payload?.data.pals ?? []).map((p) => [p.id, p.icon])),
    [payload],
  )
  const zukanById: ZukanMap = useMemo(
    () =>
      new Map(
        (payload?.data.pals ?? []).map((p) => [
          p.id,
          { zukanIndex: p.zukanIndex, zukanIndexSuffix: p.zukanIndexSuffix },
        ]),
      ),
    [payload],
  )

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
                    <FormulaCard
                      key={comboKey(f)}
                      f={f}
                      names={payload?.names ?? {}}
                      iconById={iconById}
                      zukanById={zukanById}
                      uniqueLabel={t('breeding.unique')}
                      isFav={favs.has(fk)}
                      onToggleFav={() => toggleFav(fk)}
                      favLabel={t('breeding.favorite')}
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
