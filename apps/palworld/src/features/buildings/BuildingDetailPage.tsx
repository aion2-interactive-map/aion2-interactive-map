import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from '@tanstack/react-router'
import { TopNav } from '../../components/TopNav'
import {
  loadItems,
  loadBuildings,
  loadTech,
  buildingIconUrl,
  type ItemsBundle,
  type BuildingsBundle,
  type TechBundle,
} from '../../lib/catalog'
import { buildingTypeLabel } from '../catalog/labels'
import {
  CatalogSection,
  InfoRows,
  StatRow,
  CatalogPageLoading,
  CatalogNotFound,
  MaterialRow,
} from '../catalog/components'

interface Bundles {
  items: ItemsBundle
  buildings: BuildingsBundle
  tech: TechBundle
}

export default function BuildingDetailPage() {
  const { id } = useParams({ from: '/buildings/$id' })
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

  let body: React.ReactNode
  if (loadError) {
    body = <div className="text-center text-destructive">{loadError}</div>
  } else if (!b) {
    body = <CatalogPageLoading />
  } else {
    const bld = b.buildings.byId.get(id)
    if (!bld) {
      body = (
        <CatalogNotFound
          message={t('building.notFound', { id })}
          to="/buildings"
          backLabel={t('building.backToList')}
        />
      )
    } else {
      const iname = (iid: string) => b.items.text[iid]?.name ?? iid
      const text = b.buildings.text[id]
      const energy = bld.energyType ? bld.energyType.replace(/^E[A-Za-z]+::/, '') : ''

      body = (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            {bld.icon ? (
              <img
                src={buildingIconUrl(bld.icon)}
                alt=""
                className="size-16 shrink-0 object-contain"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : null}
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">{buildingTypeLabel(bld.typeA)}</div>
              <h1 className="text-2xl font-bold">{text?.name ?? bld.id}</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
            {/* Main column */}
            <div className="space-y-6 md:order-1">
              {text?.description ? (
                <CatalogSection title={t('building.section.description')}>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{text.description}</p>
                </CatalogSection>
              ) : null}

              {bld.materials.length ? (
                <CatalogSection title={t('building.section.materials')}>
                  <div className="divide-y divide-border/60">
                    {bld.materials.map((m) => (
                      <MaterialRow key={m.item} id={m.item} name={iname(m.item)} count={m.count} />
                    ))}
                  </div>
                </CatalogSection>
              ) : null}

              {bld.unlockTech?.length ? (
                <CatalogSection title={t('building.fromTech')}>
                  <div className="flex flex-wrap gap-1.5">
                    {bld.unlockTech.map((tid) => (
                      <Link
                        key={tid}
                        to="/technology"
                        className="inline-flex items-center rounded-md border border-border bg-secondary/40 px-2 py-1 text-sm transition hover:border-primary/60 hover:bg-accent"
                      >
                        {b.tech.text[tid]?.name ?? tid}
                      </Link>
                    ))}
                  </div>
                </CatalogSection>
              ) : null}
            </div>

            {/* Sidebar */}
            <div className="space-y-6 md:order-2">
              <CatalogSection title={t('building.section.info')}>
                <InfoRows>
                  <StatRow label={t('building.type')} value={buildingTypeLabel(bld.typeA)} />
                  {bld.rank ? <StatRow label={t('building.rank')} value={bld.rank} /> : null}
                  {bld.work ? <StatRow label={t('building.work')} value={bld.work} /> : null}
                  {energy ? <StatRow label={t('building.energy')} value={energy} /> : null}
                </InfoRows>
              </CatalogSection>
            </div>
          </div>

          <Link to="/buildings" className="inline-block text-sm text-primary hover:underline">
            {t('building.backToList')}
          </Link>
        </div>
      )
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopNav active="/buildings" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">{body}</div>
      </div>
    </div>
  )
}
