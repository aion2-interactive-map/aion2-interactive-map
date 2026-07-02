import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import EmbeddedMap, { type EmbeddedPoi } from "@/features/wiki/EmbeddedMap";
import { loadQuest, lt } from "@/lib/wiki";
import type { QuestEntity } from "@/types/wiki";

export default function QuestPage({ id }: { id: string }) {
  const { t, i18n } = useTranslation(["wiki", "wiki/quest"]);
  const [q, setQ] = useState<QuestEntity | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setQ(null);
    setErr(false);
    loadQuest(id).then(setQ).catch(() => setErr(true));
  }, [id]);

  useEffect(() => {
    if (q) document.title = `${lt(q.name, i18n.language)} - AION2 Wiki`;
  }, [q, i18n.language]);

  if (err) {
    return (
      <p className="text-muted-foreground">404 - quest {id} not found.</p>
    );
  }
  if (!q) return <p className="text-muted-foreground">Loading...</p>;

  const lang = i18n.language;
  const mapName =
    q.acquireMapName ??
    q.steps.flatMap((s) => s.objectives).find((o) => o.mapName)?.mapName ??
    null;
  const pois: EmbeddedPoi[] = mapName
    ? q.steps
        .flatMap((s) => s.objectives)
        .filter((o) => o.mapName === mapName && o.marker && o.pois.length)
        .flatMap((o) =>
          o.pois.map((p) => ({
            ...p,
            label: lt(o.label, lang),
          })),
        )
    : [];

  return (
    <article data-testid="wiki-quest-page">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">{lt(q.name, lang)}</h1>
        <p className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="rounded bg-secondary px-2 py-0.5">
            {q.questType}
          </span>
          <span className="rounded bg-secondary px-2 py-0.5">
            {t(`wiki:list.${q.race}`)}
          </span>
          <span className="rounded bg-secondary px-2 py-0.5">
            {t("wiki:quest.level", { n: q.recommendedLevel })}
          </span>
          {q.repeatable && (
            <span className="rounded bg-secondary px-2 py-0.5">
              {t("wiki:quest.repeatable")}
            </span>
          )}
        </p>
      </header>

      {mapName && pois.length > 0 ? (
        <EmbeddedMap mapName={mapName} pois={pois} className="mb-6 h-80" />
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          {t("wiki:quest.locationUnknown")}
        </p>
      )}

      <h2 className="mb-2 text-lg font-semibold">{t("wiki:quest.steps")}</h2>
      <ol className="mb-6 space-y-3">
        {q.steps.map((s) => (
          <li key={s.order} className="rounded-md border border-border p-3">
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              {t("wiki:quest.step", { n: s.order })}
            </p>
            <ul className="space-y-1 text-sm">
              {s.objectives.map((o, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span>{lt(o.label, lang)}</span>
                  {o.optional && (
                    <span className="text-xs text-muted-foreground">
                      (optional)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <h2 className="mb-2 text-lg font-semibold">{t("wiki:quest.rewards")}</h2>
      <ul className="mb-6 space-y-1 text-sm" data-testid="quest-rewards">
        {q.rewards.exp > 0 && (
          <li>
            {t("wiki:quest.exp")}: {q.rewards.exp.toLocaleString()}
          </li>
        )}
        {q.rewards.items.map((it, i) => (
          <li key={i}>
            {lt(it.name, lang)} x {it.count}
          </li>
        ))}
      </ul>

      <nav className="flex justify-between border-t border-border pt-3 text-sm">
        <span>
          {q.chain.prev.map((p) => (
            <Link
              key={p}
              to="/wiki/$type/$slug"
              params={{ type: "quest", slug: String(p) }}
              className="mr-3 hover:underline"
            >
              {t("wiki:quest.chainPrev")}: {t(`wiki/quest:${p}.name`)}
            </Link>
          ))}
        </span>
        {q.chain.next && (
          <Link
            to="/wiki/$type/$slug"
            params={{ type: "quest", slug: String(q.chain.next) }}
            className="hover:underline"
            data-testid="chain-next"
          >
            {t("wiki:quest.chainNext")}:{" "}
            {t(`wiki/quest:${q.chain.next}.name`)}
          </Link>
        )}
      </nav>
    </article>
  );
}
