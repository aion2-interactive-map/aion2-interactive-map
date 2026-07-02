import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import {
  Breadcrumb,
  type BreadcrumbItem,
  GradeText,
  InfoRow,
  InfoRows,
  ItemIcon,
  WikiCard,
  WikiLoading,
  WikiNotFound,
} from "@/features/wiki/ui";
import { loadItem, loadWikiIndex, lt } from "@/lib/wiki";
import type { ItemEntity, WikiIndexDoc } from "@/types/wiki";

const ITEM_PAGE_NAMESPACES = ["wiki", "wiki/taxonomy", "wiki/quest"];
const QUEST_NAME_NAMESPACES = ["wiki/quest"];

export default function ItemPage({ id }: { id: string }) {
  const { t, i18n } = useTranslation(ITEM_PAGE_NAMESPACES);
  const [loaded, setLoaded] = useState<{
    id: number;
    item: ItemEntity;
    indexDoc: WikiIndexDoc | null;
  } | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadItem(id),
      loadWikiIndex("item").catch((error) => {
        console.error(error);
        return { docs: [] as WikiIndexDoc[] };
      }),
    ])
      .then(([item, index]) => {
        if (!cancelled) {
          setLoaded({
            id: item.id,
            item,
            indexDoc: index.docs.find((d) => d.id === item.id) ?? null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setErrorId(id);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const item = loaded?.id === Number(id) ? loaded.item : null;
  const indexDoc = loaded?.id === Number(id) ? loaded.indexDoc : null;
  const err = errorId === id;

  useEffect(() => {
    if (item) document.title = `${lt(item.name, i18n.language)} - AION2 Wiki`;
  }, [item, i18n.language]);

  if (err) return <WikiNotFound id={id} />;
  if (!item) return <WikiLoading />;

  const lang = i18n.language;
  const name = lt(item.name, lang);
  const desc = item.desc ? lt(item.desc, lang) : "";
  const groupSlug = indexDoc?.group ?? null;
  const categoryLabel = item.category
    ? t(`wiki/taxonomy:sections.${item.category.toLowerCase()}.name`, {
        defaultValue: item.category,
      })
    : null;
  const heroMeta = [
    categoryLabel,
    item.itemLevel > 0
      ? `${t("wiki:item.itemLevel")} ${item.itemLevel.toLocaleString()}`
      : null,
  ].filter((part): part is string => part !== null);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t("wiki:nav.wiki"), to: "/wiki" },
    {
      label: t("wiki/taxonomy:types.item.name"),
      to: "/wiki/$type",
      params: { type: "item" },
    },
    ...(groupSlug
      ? [
          {
            label: t(`wiki/taxonomy:groups.item.${groupSlug}.name`),
            to: "/wiki/$type/$slug",
            params: { type: "item", slug: groupSlug },
          },
        ]
      : []),
    { label: name },
  ];
  const hasSources =
    item.sources.gather ||
    item.sources.craft ||
    item.sources.shop ||
    item.sources.quests.length > 0;
  const hasSourcePills =
    item.sources.gather || item.sources.craft || item.sources.shop;

  return (
    <article data-testid="wiki-item-page" className="space-y-6">
      <header className="space-y-3">
        <Breadcrumb items={breadcrumbItems} />
        <div className="flex items-start gap-3">
          <ItemIcon icon={item.icon} alt={name} size={56} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">
              <GradeText grade={item.grade}>{name}</GradeText>
            </h1>
            {heroMeta.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {heroMeta.join(" · ")}
              </p>
            )}
          </div>
        </div>
        {item.desc && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {desc}
          </p>
        )}
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
        <aside className="order-1 h-fit space-y-4 md:sticky md:top-4 md:order-2">
          <WikiCard title={t("wiki:item.info")}>
            <InfoRows>
              {categoryLabel && (
                <InfoRow
                  label={t("wiki:item.category")}
                  value={categoryLabel}
                />
              )}
              {item.race !== "all" && (
                <InfoRow
                  label={t("wiki:list.faction")}
                  value={t(`wiki:list.${item.race}`)}
                />
              )}
              {item.tier > 0 && (
                <InfoRow label={t("wiki:item.tier")} value={item.tier} />
              )}
              {item.itemLevel > 0 && (
                <InfoRow
                  label={t("wiki:item.itemLevel")}
                  value={item.itemLevel.toLocaleString()}
                />
              )}
              {item.sellPrice > 0 && (
                <InfoRow
                  label={t("wiki:item.sellPrice")}
                  value={item.sellPrice.toLocaleString()}
                />
              )}
              {item.maxStack > 1 && (
                <InfoRow
                  label={t("wiki:item.maxStack")}
                  value={item.maxStack.toLocaleString()}
                />
              )}
            </InfoRows>
          </WikiCard>

          {item.stats.length > 0 && (
            <WikiCard title={t("wiki:item.stats")}>
              <InfoRows>
                {item.stats.map((stat) => (
                  <InfoRow
                    key={stat.key}
                    label={stat.key}
                    value={stat.value.toLocaleString()}
                  />
                ))}
              </InfoRows>
            </WikiCard>
          )}
        </aside>

        <div className="order-2 min-w-0 md:order-1">
          {hasSources && (
            <section className="mb-6 rounded-md border border-border bg-card p-4 text-card-foreground">
              <h2 className="mb-3 text-lg font-semibold">
                {t("wiki:item.sources")}
              </h2>
              {hasSourcePills && (
                <div className="flex flex-wrap gap-2">
                  {item.sources.gather && (
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {t("wiki:item.gather")}
                    </span>
                  )}
                  {item.sources.craft && (
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {t("wiki:item.craft")}
                    </span>
                  )}
                  {item.sources.shop && (
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {t("wiki:item.shop")}
                    </span>
                  )}
                </div>
              )}
              {item.sources.quests.length > 0 && (
                <div className={hasSourcePills ? "mt-4" : ""}>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    {t("wiki:item.questReward")}
                  </p>
                  <QuestLinkList ids={item.sources.quests} />
                </div>
              )}
            </section>
          )}

          {item.droppedBy.length > 0 && (
            <section className="mb-6 rounded-md border border-border bg-card p-4 text-card-foreground">
              <h2 className="mb-3 text-lg font-semibold">
                {t("wiki:item.droppedBy")}
              </h2>
              <ul className="divide-y divide-border/60 text-sm">
                {item.droppedBy.map((npc) => (
                  <li
                    key={npc.id}
                    className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <Link
                      to="/wiki/$type/$slug"
                      params={{ type: "npc", slug: String(npc.id) }}
                      className="text-primary hover:underline"
                    >
                      {lt(npc.name, lang)}
                    </Link>
                    <span className="shrink-0 text-muted-foreground">
                      {t("wiki:common.level", { n: npc.level })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {item.rewardFrom.length > 0 && (
            <section className="rounded-md border border-border bg-card p-4 text-card-foreground">
              <h2 className="mb-3 text-lg font-semibold">
                {t("wiki:item.rewardFrom")}
              </h2>
              <QuestLinkList ids={item.rewardFrom} />
            </section>
          )}
        </div>
      </div>
    </article>
  );
}

function QuestLinkList({ ids }: { ids: number[] }) {
  return (
    <div className="space-y-1 text-sm">
      {ids.map((questId) => (
        <QuestLink key={questId} id={questId} className="block" />
      ))}
    </div>
  );
}

function QuestLink({
  id,
  className = "",
}: {
  id: number;
  className?: string;
}) {
  const { t } = useTranslation(QUEST_NAME_NAMESPACES);
  return (
    <Link
      to="/wiki/$type/$slug"
      params={{ type: "quest", slug: String(id) }}
      className={`text-primary hover:underline ${className}`}
    >
      {t(`wiki/quest:${id}.name`, { defaultValue: `#${id}` })}
    </Link>
  );
}
