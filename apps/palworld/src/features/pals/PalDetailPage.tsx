import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { TopNav } from '../../components/TopNav'
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

// Join per-rank values with " / ", but collapse to a single value when every rank
// is identical (e.g. 100 / 100 / 100 / 100 / 100 → 100).
function joinRanks(vals: readonly (number | string)[]): string {
  return vals.every((v) => v === vals[0]) ? String(vals[0]) : vals.join(' / ')
}

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
  const [page, setPage] = useState(0)
  const { parents, meta } = useMemo(() => {
    const engine = makeEngine(data)
    const { list } = queryFormulas(engine, data, { a: null, b: null, c: pal.id })
    return { parents: list, meta: buildRecipeMeta(data.pals) }
  }, [data, pal.id])

  // Back to the first page whenever the pal changes.
  useEffect(() => {
    setPage(0)
  }, [pal.id])

  if (parents.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('pal.noBreeding')}</p>
  }
  // This pal's own breeding power (CombiRank). Every recipe here produces this
  // same pal, so the result chip is dropped and the power shown once up top.
  const rank = meta.get(pal.id)?.rank
  const PAGE_SIZE = 10
  const pageCount = Math.ceil(parents.length / PAGE_SIZE)
  // Clamp: `page` state can lag a pal change for one render before the effect resets it.
  const curPage = Math.min(page, pageCount - 1)
  const shown = parents.slice(curPage * PAGE_SIZE, curPage * PAGE_SIZE + PAGE_SIZE)
  return (
    <div className="space-y-2">
      {rank != null ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{t('breeding.breedingPower')}:</span>
          <span className="inline-flex items-center gap-0.5 tabular-nums text-foreground">
            <Zap className="size-3 shrink-0" />
            {rank}
          </span>
        </div>
      ) : null}
      <div className="text-xs text-muted-foreground">
        {t('pal.bredFrom')}:{' '}
        <span className="tabular-nums text-foreground">
          {t('breeding.combinations', { count: parents.length })}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {shown.map((f) => (
          <RecipeCard key={comboKey(f)} f={f} names={names} meta={meta} uniqueLabel={t('breeding.unique')} hideResult />
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
      {pageCount > 1 ? (
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setPage(Math.max(0, curPage - 1))}
            disabled={curPage === 0}
            aria-label={t('breeding.prevPage')}
            className="rounded p-1 hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="tabular-nums">
            {curPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(pageCount - 1, curPage + 1))}
            disabled={curPage >= pageCount - 1}
            aria-label={t('breeding.nextPage')}
            className="rounded p-1 hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}
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
    // Highlight every suitability at the pal's top level (not just the game's
    // single BestWorkSuitability), so ties all read as "best".
    const maxWorkLevel = workEntries[0]?.[1] ?? 0
    const partnerName = text?.partnerSkill?.name
    const ps = pal.partnerSkill
    const partnerDesc =
      resolveCharacterNames(text?.partnerSkill?.desc, bundle.text) ||
      (ps.wazaId ? resolveCharacterNames(bundle.skills[ps.wazaId]?.description, bundle.text) : '')
    const unlockItemName = ps.unlockItem ? bundle.items[ps.unlockItem] ?? ps.unlockItem : ''

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
                {unlockItemName ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t('pal.unlockItem')}:{' '}
                    <Link
                      to="/items/$id"
                      params={{ id: ps.unlockItem! }}
                      className="text-primary hover:underline"
                    >
                      {unlockItemName}
                    </Link>
                  </div>
                ) : null}
                {partnerDesc ? (
                  <p className="mt-1 text-sm text-muted-foreground">{partnerDesc}</p>
                ) : null}
                {ps.effects?.length ? (
                  <ul className="mt-2 space-y-1">
                    {ps.effects.map((e, i) => (
                      <li
                        key={`${e.type}-${e.target}-${i}`}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span>
                          {bundle.partnerEffects[e.type] ?? e.type}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {bundle.partnerTargets[e.target] ?? e.target}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {joinRanks(e.values)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {ps.action ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {ps.effectTimeByRank?.length ? (
                      <li className="flex items-baseline justify-between gap-3">
                        <span className="text-muted-foreground">{t('pal.effectTime')}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {joinRanks(ps.effectTimeByRank)}
                        </span>
                      </li>
                    ) : ps.action.effectTime > 0 ? (
                      <li className="flex items-baseline justify-between gap-3">
                        <span className="text-muted-foreground">{t('pal.effectTime')}</span>
                        <span className="shrink-0 tabular-nums">{ps.action.effectTime}s</span>
                      </li>
                    ) : null}
                    {ps.coolTimeByRank?.length ? (
                      <li className="flex items-baseline justify-between gap-3">
                        <span className="text-muted-foreground">{t('pal.cooldown')}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {joinRanks(ps.coolTimeByRank)}
                        </span>
                      </li>
                    ) : ps.action.coolTime > 0 ? (
                      <li className="flex items-baseline justify-between gap-3">
                        <span className="text-muted-foreground">{t('pal.cooldown')}</span>
                        <span className="shrink-0 tabular-nums">{ps.action.coolTime}s</span>
                      </li>
                    ) : null}
                    {ps.action.execCost > 0 ? (
                      <li className="flex items-baseline justify-between gap-3">
                        <span className="text-muted-foreground">{t('pal.cost')}</span>
                        <span className="shrink-0 tabular-nums">{ps.action.execCost}</span>
                      </li>
                    ) : null}
                    {ps.action.toggle ? (
                      <li className="text-xs text-muted-foreground">{t('pal.toggle')}</li>
                    ) : null}
                  </ul>
                ) : null}
                {ps.rankValues?.length ? (
                  <div className="mt-2 text-xs tabular-nums text-muted-foreground">
                    {t('pal.rankScaling')}: {joinRanks(ps.rankValues)}
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

            <PalSection title={t('pal.section.spawns')}>
              <PalSpawnMap palId={pal.id} palIcon={pal.icon} palName={text?.name ?? pal.id} className="aspect-square" />
            </PalSection>
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
                      highlight={lvl === maxWorkLevel}
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
                      id={d.item}
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
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopNav active="/pals" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">{body}</div>
      </div>
    </div>
  )
}
