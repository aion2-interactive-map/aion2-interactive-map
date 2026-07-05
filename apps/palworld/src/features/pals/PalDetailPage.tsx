import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from '@tanstack/react-router'
import { ShellTopBar, ThemeToggle } from '@gamemap/map-shell'
import { LANGUAGES, LANGUAGE_LABELS } from '../../i18n'
import {
  loadPals,
  fillPassiveDesc,
  resolveCharacterNames,
  type PalsBundle,
  type PalEntry,
  type WorkType,
} from '../../lib/pals'
import { comboKey, loadBreeding, makeEngine, queryFormulas, type BreedingData, type NameMap } from '../../lib/breeding'
import { RecipeCard, buildRecipeMeta } from '../breeding/RecipeCard'
import { palIconUrl } from '../../lib/assets'
import { formatPalId } from '../../lib/palId'
import {
  PalSection,
  InfoRows,
  StatRow,
  PalPageLoading,
  PalNotFound,
  ElementBadge,
  WorkSuitability,
  ActiveSkillRow,
  PassiveRow,
  DropRow,
  PalSpawnMap,
} from './components'

// Curated stat rows, in display order. Labels come from i18n (`pal.stat.*`).
const STAT_KEYS = [
  'hp',
  'meleeAttack',
  'shotAttack',
  'defense',
  'craftSpeed',
  'stamina',
  'foodAmount',
  'captureRate',
  'price',
] as const

function BreedingLinks({
  pal,
  data,
  names,
}: {
  pal: PalEntry
  data: BreedingData
  names: NameMap
}) {
  const { t } = useTranslation()
  const { parents, meta } = useMemo(() => {
    const engine = makeEngine(data)
    const { list } = queryFormulas(engine, data, { a: null, b: null, c: pal.id })
    return { parents: list.slice(0, 12), meta: buildRecipeMeta(data.pals) }
  }, [data, pal.id])

  if (parents.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('pal.noBreeding')}</p>
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">{t('pal.bredFrom')}</div>
      <div className="grid grid-cols-1 gap-2">
        {parents.map((f) => (
          <RecipeCard key={comboKey(f)} f={f} names={names} meta={meta} uniqueLabel={t('breeding.unique')} />
        ))}
      </div>
      <Link
        to="/breeding"
        search={{ c: pal.id }}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-primary hover:underline"
      >
        {t('pal.openBreeding')}
      </Link>
    </div>
  )
}

export default function PalDetailPage() {
  const { id } = useParams({ from: '/pals/$id' })
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en-US'

  const [bundle, setBundle] = useState<PalsBundle | null>(null)
  const [breeding, setBreeding] = useState<{ data: BreedingData; names: NameMap } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    Promise.all([loadPals(lng), loadBreeding(lng)])
      .then(([b, br]) => {
        if (cancelled) return
        setBundle(b)
        setBreeding(br)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setLoadError(t('loadError'))
      })
    return () => {
      cancelled = true
    }
  }, [lng, t])

  const topBar = (
    <ShellTopBar
      classNames={{ root: 'border-b border-border bg-card text-card-foreground' }}
      leftSlot={
        <>
          <Link to="/" className="text-sm text-foreground/70 hover:text-foreground">
            {t('breeding.navMap')}
          </Link>
          <Link to="/pals" className="text-sm text-foreground/70 hover:text-foreground">
            {t('pal.title')}
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

  const pal = bundle?.byId.get(id)

  let body: React.ReactNode
  if (loadError) {
    body = <div className="text-center text-destructive">{loadError}</div>
  } else if (!bundle) {
    body = <PalPageLoading />
  } else if (!pal) {
    body = <PalNotFound id={id} />
  } else {
    const text = bundle.text[pal.id]
    const pid = formatPalId(pal.zukanIndex, pal.zukanIndexSuffix)
    const workEntries = (Object.entries(pal.work) as [WorkType, number][])
      .filter(([, lvl]) => lvl > 0)
      .sort((a, b) => b[1] - a[1])
    const partnerName = text?.partnerSkill?.name
    const partnerDesc = resolveCharacterNames(text?.partnerSkill?.desc, bundle.text)

    body = (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <img
            src={palIconUrl(pal.icon)}
            alt=""
            className="size-20 shrink-0 object-contain"
          />
          <div className="min-w-0">
            {pid ? (
              <div className="text-sm tabular-nums text-muted-foreground">
                {pid.text}
                {pid.accent ? <span className="text-primary">{pid.accent}</span> : null}
              </div>
            ) : null}
            <h1 className="text-2xl font-bold">{text?.name ?? pal.id}</h1>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {pal.elements.map((e) => (
                <ElementBadge key={e} element={e} label={bundle.enums.elements[e] ?? e} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main column */}
          <div className="space-y-6 md:order-1">
            {text?.description ? (
              <PalSection title={t('pal.section.description')}>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {resolveCharacterNames(text.description, bundle.text)}
                </p>
              </PalSection>
            ) : null}

            {partnerName ? (
              <PalSection title={t('pal.section.partnerSkill')}>
                <div className="text-sm font-medium">{partnerName}</div>
                {partnerDesc ? (
                  <p className="mt-1 text-sm text-muted-foreground">{partnerDesc}</p>
                ) : null}
                {pal.partnerSkill.rankValues?.length ? (
                  <div className="mt-2 text-xs tabular-nums text-muted-foreground">
                    {t('pal.rankScaling')}: {pal.partnerSkill.rankValues.join(' / ')}
                  </div>
                ) : null}
                <div className="mt-2 text-xs text-muted-foreground">{t('pal.condensation')}</div>
              </PalSection>
            ) : null}

            {pal.activeSkills.length ? (
              <PalSection title={t('pal.section.activeSkills')}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-1 pr-2 text-center font-medium">{t('pal.lv')}</th>
                      <th className="pb-1 pr-2 font-medium">{t('pal.skill')}</th>
                      <th className="pb-1 pr-2 text-right font-medium">{t('pal.power')}</th>
                      <th className="pb-1 text-right font-medium">{t('pal.cooldown')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pal.activeSkills.map((s) => (
                      <ActiveSkillRow
                        key={`${s.wazaId}-${s.level}`}
                        skill={s}
                        name={bundle.skills[s.wazaId]?.name ?? s.wazaId}
                        description={resolveCharacterNames(bundle.skills[s.wazaId]?.description, bundle.text)}
                      />
                    ))}
                  </tbody>
                </table>
              </PalSection>
            ) : null}

            {pal.passives.length ? (
              <PalSection title={t('pal.section.passives')}>
                <div className="divide-y divide-border/60">
                  {pal.passives.map((pidStr) => (
                    <PassiveRow
                      key={pidStr}
                      name={bundle.passiveText[pidStr]?.name ?? pidStr}
                      description={fillPassiveDesc(
                        bundle.passiveText[pidStr]?.description,
                        bundle.passivesById.get(pidStr),
                      )}
                    />
                  ))}
                </div>
              </PalSection>
            ) : null}

            {pal.drops.length ? (
              <PalSection title={t('pal.section.drops')}>
                <div className="divide-y divide-border/60">
                  {pal.drops.map((d) => (
                    <DropRow
                      key={d.item}
                      name={bundle.items[d.item] ?? d.item}
                      rate={d.rate}
                      min={d.min}
                      max={d.max}
                    />
                  ))}
                </div>
              </PalSection>
            ) : null}

            {breeding ? (
              <PalSection title={t('pal.section.breeding')}>
                <BreedingLinks pal={pal} data={breeding.data} names={breeding.names} />
              </PalSection>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 md:order-2">
            <PalSection title={t('pal.section.stats')}>
              <InfoRows>
                {STAT_KEYS.map((k) => (
                  <StatRow key={k} label={t(`pal.stat.${k}`)} value={pal.stats[k]} />
                ))}
              </InfoRows>
            </PalSection>

            {workEntries.length ? (
              <PalSection title={t('pal.section.work')}>
                <div className="space-y-1.5">
                  {workEntries.map(([w, lvl]) => (
                    <WorkSuitability
                      key={w}
                      work={w}
                      level={lvl}
                      label={bundle.enums.work[w] ?? w}
                      highlight={w === pal.bestWork}
                    />
                  ))}
                </div>
              </PalSection>
            ) : null}

            <PalSection title={t('pal.section.spawns')}>
              <PalSpawnMap palId={pal.id} palIcon={pal.icon} className="h-64" />
            </PalSection>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {topBar}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">{body}</div>
      </div>
    </div>
  )
}
