import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TopNav } from '../../components/TopNav'
import {
  loadItems,
  loadBuildings,
  loadTech,
  type ItemsBundle,
  type BuildingsBundle,
  type TechBundle,
  type TechEntry,
} from '../../lib/catalog'
import {
  CatalogSection,
  CatalogPageLoading,
  ItemLink,
  BuildingLink,
} from '../catalog/components'

interface Bundles {
  items: ItemsBundle
  buildings: BuildingsBundle
  tech: TechBundle
}

export default function TechnologyPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en-US'

  const [b, setB] = useState<Bundles | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    Promise.all([loadItems(lng), loadBuildings(lng), loadTech(lng)])
      .then(([items, buildings, tech]) => {
        if (!cancelled) setB({ items, buildings, tech })
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setLoadError(t('loadError'))
      })
    return () => {
      cancelled = true
    }
  }, [lng, t])

  const levels = useMemo(() => {
    if (!b) return []
    const byLevel = new Map<number, TechEntry[]>()
    for (const tech of b.tech.techs) {
      const arr = byLevel.get(tech.level)
      if (arr) arr.push(tech)
      else byLevel.set(tech.level, [tech])
    }
    return [...byLevel.entries()]
      .sort((a, c) => a[0] - c[0])
      .map(([level, techs]) => ({
        level,
        techs: techs.sort((a, c) => {
          if (a.isBoss !== c.isBoss) return a.isBoss ? -1 : 1
          const an = b.tech.text[a.id]?.name ?? a.id
          const cn = b.tech.text[c.id]?.name ?? c.id
          return an.localeCompare(cn)
        }),
      }))
  }, [b])

  let body: React.ReactNode
  if (loadError) {
    body = <div className="text-center text-destructive">{loadError}</div>
  } else if (!b) {
    body = <CatalogPageLoading />
  } else {
    const iname = (id: string) => b.items.text[id]?.name ?? id
    const bname = (id: string) => b.buildings.text[id]?.name ?? id

    body = (
      <div className="space-y-4">
        {levels.map(({ level, techs }) => (
          <div
            key={level}
            className="grid grid-cols-1 gap-3 md:grid-cols-[5rem_minmax(0,1fr)] md:items-start"
          >
            <div className="md:sticky md:top-2">
              <div className="text-sm font-bold tabular-nums whitespace-nowrap">
                {t('tech.level', { level })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {techs.map((tech) => (
                <TechCard
                  key={tech.id}
                  tech={tech}
                  name={b.tech.text[tech.id]?.name ?? tech.id}
                  description={b.tech.text[tech.id]?.description}
                  buildings={b.buildings}
                  iname={iname}
                  bname={bname}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopNav active="/technology" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          <h1 className="mb-4 text-2xl font-bold">{t('tech.title')}</h1>
          {body}
        </div>
      </div>
    </div>
  )
}

function TechCard({
  tech,
  name,
  description,
  buildings,
  iname,
  bname,
}: {
  tech: TechEntry
  name: string
  description?: string
  buildings: BuildingsBundle
  iname: (id: string) => string
  bname: (id: string) => string
}) {
  const { t } = useTranslation()
  return (
    <CatalogSection className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight">{name}</h3>
        <div className="flex shrink-0 items-center gap-1">
          {tech.isBoss ? (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              {t('tech.boss')}
            </span>
          ) : null}
          {tech.cost ? (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {t('tech.cost', { count: tech.cost })}
            </span>
          ) : null}
        </div>
      </div>

      {description ? (
        <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line line-clamp-3">
          {description}
        </p>
      ) : null}

      {tech.requireBoss ? (
        <div className="text-[11px] text-muted-foreground">
          {t('tech.requiresBoss', { boss: tech.requireBoss })}
        </div>
      ) : null}

      {tech.unlockItems.length ? (
        <div>
          <div className="mb-1 text-[11px] text-muted-foreground">{t('tech.unlocksItems')}</div>
          <div className="flex flex-wrap gap-1.5">
            {tech.unlockItems.map((id) => (
              <ItemLink key={id} id={id} name={iname(id)} />
            ))}
          </div>
        </div>
      ) : null}

      {tech.unlockBuildings.length ? (
        <div>
          <div className="mb-1 text-[11px] text-muted-foreground">{t('tech.unlocksBuildings')}</div>
          <div className="flex flex-wrap gap-1.5">
            {tech.unlockBuildings.map((id) => (
              <BuildingLink key={id} id={id} name={bname(id)} icon={buildings.byId.get(id)?.icon} />
            ))}
          </div>
        </div>
      ) : null}
    </CatalogSection>
  )
}
