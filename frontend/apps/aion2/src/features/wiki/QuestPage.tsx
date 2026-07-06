import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import EmbeddedMap, { type EmbeddedPoi } from "@/features/wiki/EmbeddedMap";
import {
  Breadcrumb,
  type BreadcrumbItem,
  InfoRow,
  InfoRows,
  WikiCard as QuestCard,
  WikiLoading,
  WikiNotFound,
} from "@/features/wiki/ui";
import { loadQuest, loadWikiIndex, lt } from "@/lib/wiki";
import type { QuestEntity, QuestObjective, WikiIndexDoc } from "@/types/wiki";

const QUEST_PAGE_NAMESPACES = ["wiki", "wiki/taxonomy", "wiki/quest"];
const QUEST_NAME_NAMESPACES = ["wiki/quest"];

type ObjectiveEntry = {
  stepOrder: number;
  objectiveIndex: number;
  objective: QuestObjective;
};

export default function QuestPage({ id }: { id: string }) {
  const { t, i18n } = useTranslation(QUEST_PAGE_NAMESPACES);
  const [loaded, setLoaded] = useState<{
    id: string;
    quest: QuestEntity;
    indexDoc: WikiIndexDoc | null;
  } | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadQuest(id),
      loadWikiIndex("quest").catch((error) => {
        console.error(error);
        return { docs: [] as WikiIndexDoc[] };
      }),
    ])
      .then(([quest, index]) => {
        if (!cancelled) {
          setLoaded({
            id,
            quest,
            indexDoc: index.docs.find((d) => d.id === quest.id) ?? null,
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

  const q = loaded?.id === id ? loaded.quest : null;
  const indexDoc = loaded?.id === id ? loaded.indexDoc : null;
  const err = errorId === id;
  const allObjectives = useMemo<ObjectiveEntry[]>(() => {
    if (!q) return [];
    return q.steps.flatMap((step) =>
      step.objectives.map((objective, objectiveIndex) => ({
        stepOrder: step.order,
        objectiveIndex,
        objective,
      })),
    );
  }, [q]);
  const objectiveSummary = useMemo(() => {
    const markers = allObjectives.filter((entry) => entry.objective.marker);
    return markers.length ? markers : allObjectives;
  }, [allObjectives]);

  useEffect(() => {
    if (q) document.title = `${lt(q.name, i18n.language)} - AION2 Wiki`;
  }, [q, i18n.language]);

  if (err) return <WikiNotFound id={id} />;
  if (!q) return <WikiLoading />;

  const lang = i18n.language;
  const objectives = q.steps.flatMap((s) => s.objectives);
  const objectiveMapNames = [
    q.acquireMapName,
    ...objectives.flatMap((o) => [o.mapName, o.region?.mapName ?? null]),
  ].filter((name): name is string => name !== null);
  const objectiveMapEntries = [...new Set(objectiveMapNames)]
    .map((entryMapName) => {
      const pois: EmbeddedPoi[] = objectives
        .filter(
          (o) => o.mapName === entryMapName && o.marker && o.pois.length,
        )
        .flatMap((o) =>
          o.pois.map((p) => ({
            ...p,
            label: lt(o.label, lang),
          })),
        );
      const highlightRegionIds = [
        ...new Set(
          objectives.flatMap((o) =>
            o.region?.mapName === entryMapName ? [o.region.id] : [],
          ),
        ),
      ];
      return { mapName: entryMapName, pois, highlightRegionIds };
    })
    .filter(
      (entry) => entry.pois.length > 0 || entry.highlightRegionIds.length > 0,
    );
  const groupSlug = indexDoc?.group ?? null;
  const sectionSlug = indexDoc?.section ?? null;
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t("wiki:nav.wiki"), to: "/wiki" },
    {
      label: t("wiki/taxonomy:types.quest.name"),
      to: "/wiki/$type",
      params: { type: "quest" },
    },
    ...(groupSlug
      ? [
          {
            label: t(`wiki/taxonomy:groups.quest.${groupSlug}.name`),
            to: "/wiki/$type/$slug",
            params: { type: "quest", slug: groupSlug },
          },
        ]
      : []),
    ...(groupSlug && sectionSlug
      ? [
          {
            label: t(`wiki/taxonomy:sections.${sectionSlug}.name`),
            to: "/wiki/$type/$slug",
            params: { type: "quest", slug: groupSlug },
            hash: sectionSlug,
          },
        ]
      : []),
  ];
  const hasRewards = q.rewards.exp > 0 || q.rewards.items.length > 0;
  const hasChain = q.chain.prev.length > 0 || q.chain.next !== null;

  return (
    <article data-testid="wiki-quest-page" className="space-y-6">
      <header className="space-y-3">
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="text-2xl font-bold">{lt(q.name, lang)}</h1>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
        <aside className="order-1 h-fit space-y-4 md:sticky md:top-4 md:order-2">
          <QuestCard title={t("wiki:quest.info")}>
            <InfoRows>
              <InfoRow label={t("wiki:quest.type")} value={q.questType} />
              <InfoRow
                label={t("wiki:list.faction")}
                value={t(`wiki:list.${q.race}`)}
              />
              <InfoRow
                label={t("wiki:quest.unlockLevel")}
                value={t("wiki:quest.level", { n: q.unlockLevel })}
              />
              <InfoRow
                label={t("wiki:quest.recommendedLevel")}
                value={t("wiki:quest.level", { n: q.recommendedLevel })}
              />
              {q.repeatable && (
                <InfoRow
                  label={t("wiki:quest.repeatable")}
                  value={t("wiki:quest.yes")}
                />
              )}
              {q.acquireMapName && (
                <InfoRow
                  label={t("wiki:quest.acquireMap")}
                  value={
                    <Link
                      to="/"
                      search={{ map: q.acquireMapName }}
                      className="text-primary hover:underline"
                    >
                      {q.acquireMapName}
                    </Link>
                  }
                />
              )}
            </InfoRows>
          </QuestCard>

          {hasRewards && (
            <QuestCard title={t("wiki:quest.rewards")} testId="quest-rewards">
              <ul className="divide-y divide-border/60 text-sm">
                {q.rewards.exp > 0 && (
                  <li className="flex items-baseline justify-between gap-3 pb-2">
                    <span className="text-muted-foreground">
                      {t("wiki:quest.exp")}
                    </span>
                    <span className="font-medium tabular-nums">
                      {q.rewards.exp.toLocaleString()}
                    </span>
                  </li>
                )}
                {q.rewards.items.map((it, i) => (
                  <li
                    key={`${lt(it.name, lang)}-${i}`}
                    className="flex items-baseline justify-between gap-3 py-2 last:pb-0"
                  >
                    {it.id ? (
                      <Link
                        to="/wiki/$type/$slug"
                        params={{ type: "item", slug: String(it.id) }}
                        className="hover:underline"
                      >
                        {lt(it.name, lang)}
                      </Link>
                    ) : (
                      <span>{lt(it.name, lang)}</span>
                    )}
                    <span className="shrink-0 text-muted-foreground">
                      {"\u00d7"} {it.count}
                    </span>
                  </li>
                ))}
              </ul>
            </QuestCard>
          )}

          {hasChain && (
            <QuestCard title={t("wiki:quest.chain")}>
              <InfoRows>
                {q.chain.prev.length > 0 && (
                  <InfoRow
                    label={t("wiki:quest.chainPrev")}
                    value={
                      <QuestLinkList ids={q.chain.prev} linkClassName="block" />
                    }
                  />
                )}
                {q.chain.next && (
                  <InfoRow
                    label={t("wiki:quest.chainNext")}
                    value={<QuestLink id={q.chain.next} />}
                  />
                )}
              </InfoRows>
            </QuestCard>
          )}
        </aside>

        <div className="order-2 min-w-0 md:order-1">
          <section className="mb-6 rounded-md border border-border bg-card p-4 text-card-foreground">
            <h2 className="text-lg font-semibold">
              {t("wiki:quest.objectives")}
            </h2>
            <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {objectiveSummary.map((entry, i) => (
                <li
                  key={`${entry.stepOrder}-${entry.objectiveIndex}`}
                  className="flex items-start gap-2"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                    {i + 1}
                  </span>
                  <ObjectiveLabel objective={entry.objective} lang={lang} />
                </li>
              ))}
            </ol>
          </section>

          {objectiveMapEntries.length > 0 ? (
            objectiveMapEntries.map((entry) => (
              <EmbeddedMap
                key={entry.mapName}
                mapName={entry.mapName}
                pois={entry.pois}
                highlightRegionIds={entry.highlightRegionIds}
                className="mb-6 h-80"
              />
            ))
          ) : (
            <p className="mb-6 text-sm text-muted-foreground">
              {t("wiki:quest.locationUnknown")}
            </p>
          )}

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              {t("wiki:quest.steps")}
            </h2>
            <ol className="space-y-3">
              {q.steps.map((s) => (
                <li
                  key={s.order}
                  className="rounded-md border border-border bg-card p-3"
                >
                  <p className="mb-1 text-sm font-medium text-muted-foreground">
                    {t("wiki:quest.step", { n: s.order })}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {s.objectives.map((o, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <ObjectiveLabel objective={o} lang={lang} />
                        {o.optional && (
                          <span className="text-xs text-muted-foreground">
                            ({t("wiki:quest.optional")})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {hasChain && (
        <nav className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {q.chain.prev.map((p) => (
              <QuestLink key={p} id={p} prefix={"\u2190 "} />
            ))}
          </div>
          {q.chain.next && (
            <QuestLink
              id={q.chain.next}
              suffix={" \u2192"}
              className="self-start sm:self-auto"
              testId="chain-next"
            />
          )}
        </nav>
      )}
    </article>
  );
}

function ObjectiveLabel({
  objective,
  lang,
}: {
  objective: QuestObjective;
  lang: string;
}) {
  const label = lt(objective.label, lang);
  if (objective.target?.type === "npc") {
    return (
      <Link
        to="/wiki/$type/$slug"
        params={{ type: "npc", slug: String(objective.target.id) }}
        className="hover:underline"
      >
        {label}
      </Link>
    );
  }
  return <span>{label}</span>;
}

function QuestLinkList({
  ids,
  linkClassName,
}: {
  ids: number[];
  linkClassName?: string;
}) {
  return (
    <>
      {ids.map((questId) => (
        <QuestLink key={questId} id={questId} className={linkClassName} />
      ))}
    </>
  );
}

function QuestLink({
  id,
  prefix = "",
  suffix = "",
  className = "",
  testId,
}: {
  id: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  testId?: string;
}) {
  const { t } = useTranslation(QUEST_NAME_NAMESPACES);
  return (
    <Link
      to="/wiki/$type/$slug"
      params={{ type: "quest", slug: String(id) }}
      className={`text-primary hover:underline ${className}`}
      data-testid={testId}
    >
      {prefix}
      {t(`wiki/quest:${id}.name`)}
      {suffix}
    </Link>
  );
}
