import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import EmbeddedMap from "@/features/wiki/EmbeddedMap";
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
import { loadNpc, loadWikiIndex, lt } from "@/lib/wiki";
import type { NpcEntity, WikiIndexDoc } from "@/types/wiki";

const NPC_PAGE_NAMESPACES = ["wiki", "wiki/taxonomy", "wiki/quest"];
const QUEST_NAME_NAMESPACES = ["wiki/quest"];

export default function NpcPage({ id }: { id: string }) {
  const { t, i18n } = useTranslation(NPC_PAGE_NAMESPACES);
  const [loaded, setLoaded] = useState<{
    id: number;
    npc: NpcEntity;
    indexDoc: WikiIndexDoc | null;
  } | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadNpc(id),
      loadWikiIndex("npc").catch((error) => {
        console.error(error);
        return { docs: [] as WikiIndexDoc[] };
      }),
    ])
      .then(([npc, index]) => {
        if (!cancelled) {
          setLoaded({
            id: npc.id,
            npc,
            indexDoc: index.docs.find((d) => d.id === npc.id) ?? null,
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

  const npc = loaded?.id === Number(id) ? loaded.npc : null;
  const indexDoc = loaded?.id === Number(id) ? loaded.indexDoc : null;
  const err = errorId === id;

  useEffect(() => {
    if (npc) document.title = `${lt(npc.name, i18n.language)} - AION2 Wiki`;
  }, [npc, i18n.language]);

  if (err) return <WikiNotFound id={id} />;
  if (!npc) return <WikiLoading />;

  const lang = i18n.language;
  const name = lt(npc.name, lang);
  const groupSlug = indexDoc?.group ?? null;
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t("wiki:nav.wiki"), to: "/wiki" },
    {
      label: t("wiki/taxonomy:types.npc.name"),
      to: "/wiki/$type",
      params: { type: "npc" },
    },
    ...(groupSlug
      ? [
          {
            label: t(`wiki/taxonomy:groups.npc.${groupSlug}.name`),
            to: "/wiki/$type/$slug",
            params: { type: "npc", slug: groupSlug },
          },
        ]
      : []),
    { label: name },
  ];
  const npcType = npc.npcType
    ? `${npc.npcType}${npc.subType ? ` / ${npc.subType}` : ""}`
    : null;
  const levelText = t("wiki:common.level", { n: npc.level });
  const questGroups = [
    {
      role: "giver" as const,
      quests: npc.quests.filter((quest) => quest.role === "giver"),
    },
    {
      role: "target" as const,
      quests: npc.quests.filter((quest) => quest.role === "target"),
    },
  ].filter((group) => group.quests.length > 0);

  return (
    <article data-testid="wiki-npc-page" className="space-y-6">
      <header className="space-y-3">
        <Breadcrumb items={breadcrumbItems} />
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{name}</h1>
          <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {levelText}
          </span>
          {npc.named && (
            <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {t("wiki:npc.named")}
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
        <aside className="order-1 h-fit space-y-4 md:sticky md:top-4 md:order-2">
          <WikiCard title={t("wiki:npc.info")}>
            <InfoRows>
              {npcType && (
                <InfoRow label={t("wiki:npc.npcType")} value={npcType} />
              )}
              <InfoRow
                label={t("wiki:list.faction")}
                value={t(`wiki:list.${npc.race}`)}
              />
              <InfoRow
                label={t("wiki:common.level", { n: "" }).trim()}
                value={levelText}
              />
              <InfoRow label={t("wiki:npc.grade")} value={npc.grade} />
              {npc.funcType && (
                <InfoRow label="funcType" value={npc.funcType} />
              )}
            </InfoRows>
          </WikiCard>

          {npc.quests.length > 0 && (
            <WikiCard title={t("wiki:npc.quests")}>
              <div className="space-y-3 text-sm">
                {questGroups.map((group) => (
                  <div key={group.role}>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {t(
                        group.role === "giver"
                          ? "wiki:npc.giver"
                          : "wiki:npc.target",
                      )}
                    </p>
                    <div className="space-y-1">
                      {group.quests.map((quest) => (
                        <QuestLink
                          key={`${group.role}-${quest.id}`}
                          id={quest.id}
                          className="block"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </WikiCard>
          )}
        </aside>

        <div className="order-2 min-w-0 md:order-1">
          <section className="mb-6 rounded-md border border-border bg-card p-4 text-card-foreground">
            <h2 className="mb-3 text-lg font-semibold">
              {t("wiki:npc.spawns")}
            </h2>
            {npc.spawns.length > 0 ? (
              <div className="space-y-4">
                {npc.spawns.map((spawn, i) => (
                  <div key={`${spawn.mapName}-${i}`}>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                      {t(`wiki/taxonomy:sections.${spawn.mapName}.name`, {
                        defaultValue: spawn.mapName,
                      })}
                    </h3>
                    <EmbeddedMap
                      mapName={spawn.mapName}
                      pois={spawn.pois.map((poi) => ({ ...poi, label: name }))}
                      className="mb-4 h-72"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("wiki:npc.noSpawns")}
              </p>
            )}
          </section>

          {npc.drops.length > 0 && (
            <section className="rounded-md border border-border bg-card p-4 text-card-foreground">
              <h2 className="mb-3 text-lg font-semibold">
                {t("wiki:npc.drops")}
              </h2>
              <ul className="divide-y divide-border/60 text-sm">
                {npc.drops.map((drop) => {
                  const dropName = lt(drop.name, lang);
                  return (
                    <li
                      key={drop.id}
                      className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                      data-testid={`npc-drop-${drop.id}`}
                    >
                      <ItemIcon icon={drop.icon} alt={dropName} />
                      <GradeText grade={drop.grade} className="font-medium">
                        <Link
                          to="/wiki/$type/$slug"
                          params={{ type: "item", slug: String(drop.id) }}
                          className="hover:underline"
                        >
                          {dropName}
                        </Link>
                      </GradeText>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </article>
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
