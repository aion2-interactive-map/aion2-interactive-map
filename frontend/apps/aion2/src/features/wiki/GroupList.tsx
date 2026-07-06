import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { loadTaxonomy, loadWikiIndex } from "@/lib/wiki";
import type { WikiIndexDoc, WikiTaxonomy } from "@/types/wiki";

const FACTIONS = ["all", "light", "dark"] as const;
type Faction = (typeof FACTIONS)[number];

export default function GroupList({
  type,
  group,
  initialFaction,
}: {
  type: string;
  group: string;
  initialFaction?: Extract<Faction, "light" | "dark">;
}) {
  const { t } = useTranslation(["wiki", "wiki/taxonomy", `wiki/${type}`]);
  const [tax, setTax] = useState<WikiTaxonomy | null>(null);
  const [docs, setDocs] = useState<WikiIndexDoc[]>([]);
  const [faction, setFaction] = useState<Faction>(initialFaction ?? "all");

  useEffect(() => {
    loadTaxonomy().then(setTax).catch(console.error);
    loadWikiIndex(type).then((r) => setDocs(r.docs)).catch(console.error);
  }, [type]);

  useEffect(() => {
    document.title = `${t(`wiki/taxonomy:groups.${type}.${group}.name`)} - AION2 Wiki`;
  }, [t, type, group]);

  const sections = useMemo(() => {
    const mine = docs.filter(
      (d) =>
        d.group === group &&
        (faction === "all" || d.race === "all" || d.race === faction),
    );
    const by: Record<string, WikiIndexDoc[]> = {};
    for (const d of mine) (by[d.section] ??= []).push(d);
    for (const arr of Object.values(by)) {
      arr.sort((a, b) => a.level - b.level || a.id - b.id);
    }
    return by;
  }, [docs, group, faction]);

  const node = tax?.types
    .find((x) => x.slug === type)
    ?.groups.find((g) => g.slug === group);
  if (!node) {
    return <p className="text-muted-foreground">{t("wiki:list.empty")}</p>;
  }

  return (
    <div className="flex gap-8" data-testid="wiki-group-list">
      <nav className="sticky top-4 hidden h-fit w-52 shrink-0 md:block">
        <ul className="space-y-1 text-sm">
          {node.sections.map((s) => (
            <li key={s.slug}>
              <a
                href={`#${s.slug}`}
                className="text-muted-foreground hover:text-foreground"
              >
                {t(`wiki/taxonomy:sections.${s.slug}.name`)} ({s.count})
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 flex-1">
        <h1 className="mb-2 text-2xl font-bold">
          {t(`wiki/taxonomy:groups.${type}.${group}.name`)}
        </h1>
        <div className="mb-4 flex gap-2 text-sm">
          {FACTIONS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFaction(f)}
              data-testid={`faction-${f}`}
              data-state={faction === f ? "on" : "off"}
              className={`rounded px-2 py-0.5 ${
                faction === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary"
              }`}
            >
              {t(`wiki:list.${f}`)}
            </button>
          ))}
        </div>
        {node.sections.map((s) =>
          sections[s.slug]?.length ? (
            <section key={s.slug} id={s.slug} className="mb-6 scroll-mt-4">
              <h2 className="mb-2 border-b border-border pb-1 text-lg font-semibold">
                {t(`wiki/taxonomy:sections.${s.slug}.name`)}
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  {sections[s.slug].map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-border/50 hover:bg-accent/50"
                    >
                      <td className="w-16 py-1.5 text-muted-foreground">
                        {t("wiki:quest.level", { n: d.level })}
                      </td>
                      <td>
                        <Link
                          to="/wiki/$type/$slug"
                          params={{ type, slug: String(d.id) }}
                          className="hover:underline"
                          data-testid={`wiki-entry-${d.id}`}
                        >
                          {t(`wiki/${type}:${d.id}.name`)}
                        </Link>
                      </td>
                      <td className="w-28 text-right text-muted-foreground">
                        {d.mapId ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null,
        )}
      </div>
    </div>
  );
}
