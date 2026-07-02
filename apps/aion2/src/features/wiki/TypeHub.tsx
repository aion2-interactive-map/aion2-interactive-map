import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import MiniSearch, { type SearchResult } from "minisearch";

import { Input } from "@/components/ui/input";
import { loadTaxonomy, loadWikiIndex } from "@/lib/wiki";
import type { WikiGroup, WikiIndexDoc, WikiTaxonomy } from "@/types/wiki";

type SearchDoc = { id: number; name: string };
type SearchHit = SearchResult & Pick<SearchDoc, "id" | "name">;
type FactionBucket = "light" | "dark" | "both";
type SectionChip = { slug: string; count: number };
type SectionRaceCounts = Record<WikiIndexDoc["race"], number>;

const BUCKETS: FactionBucket[] = ["light", "dark", "both"];

function emptyBuckets(): Record<FactionBucket, SectionChip[]> {
  return { light: [], dark: [], both: [] };
}

function sectionBucket(counts: SectionRaceCounts): FactionBucket {
  if (counts.light > 0 && counts.dark === 0) return "light";
  if (counts.dark > 0 && counts.light === 0) return "dark";
  return "both";
}

export default function TypeHub({ type }: { type: string }) {
  const { t } = useTranslation(["wiki", "wiki/taxonomy", `wiki/${type}`]);
  const [tax, setTax] = useState<WikiTaxonomy | null>(null);
  const [docs, setDocs] = useState<WikiIndexDoc[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    loadTaxonomy().then(setTax).catch(console.error);
    loadWikiIndex(type).then((r) => setDocs(r.docs)).catch(console.error);
  }, [type]);

  const ms = useMemo(() => {
    const m = new MiniSearch<SearchDoc>({
      fields: ["name"],
      storeFields: ["id", "name"],
      searchOptions: { prefix: true, fuzzy: 0.2 },
      tokenize: (text) => [...text],
    });
    m.addAll(
      docs.map((d) => ({
        id: d.id,
        name: t(`wiki/${type}:${d.id}.name`),
      })),
    );
    return m;
  }, [docs, t, type]);

  const hits = q.trim() ? (ms.search(q).slice(0, 20) as SearchHit[]) : [];
  const node = tax?.types.find((x) => x.slug === type);
  const sectionCounts = useMemo(() => {
    const counts = new Map<string, SectionRaceCounts>();
    for (const d of docs) {
      if (!d.group) continue;
      const key = `${d.group}\0${d.section}`;
      const raceCounts =
        counts.get(key) ?? ({ light: 0, dark: 0, all: 0 } as SectionRaceCounts);
      raceCounts[d.race] += 1;
      counts.set(key, raceCounts);
    }
    return counts;
  }, [docs]);
  if (!node) return null;

  function getGroupBuckets(group: WikiGroup) {
    const buckets = emptyBuckets();
    for (const s of group.sections) {
      const counts = sectionCounts.get(`${group.slug}\0${s.slug}`);
      if (!counts) continue;
      const count = counts.light + counts.dark + counts.all;
      buckets[sectionBucket(counts)].push({ slug: s.slug, count });
    }
    return buckets;
  }

  function renderSectionChips(
    groupSlug: string,
    bucket: FactionBucket,
    sections: SectionChip[],
  ) {
    return (
      <ul className="mt-2 flex flex-wrap gap-2 text-sm">
        {sections.map((s) => (
          <li key={s.slug}>
            {bucket === "both" ? (
              <Link
                to="/wiki/$type/$slug"
                params={{ type, slug: groupSlug }}
                hash={s.slug}
                className="rounded bg-secondary px-2 py-0.5 hover:bg-accent"
              >
                {t(`wiki/taxonomy:sections.${s.slug}.name`)} - {s.count}
              </Link>
            ) : (
              <Link
                to="/wiki/$type/$slug"
                params={{ type, slug: groupSlug }}
                search={{ faction: bucket }}
                hash={s.slug}
                className="rounded bg-secondary px-2 py-0.5 hover:bg-accent"
              >
                {t(`wiki/taxonomy:sections.${s.slug}.name`)} - {s.count}
              </Link>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div data-testid="wiki-type-hub">
      <h1 className="mb-4 text-2xl font-bold">
        {t(`wiki/taxonomy:types.${type}.name`)}
      </h1>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("wiki:list.search")}
        className="mb-4 max-w-sm"
        data-testid="wiki-search"
      />
      {hits.length > 0 && (
        <ul
          className="mb-6 max-w-sm rounded-md border border-border"
          data-testid="wiki-search-results"
        >
          {hits.map((h) => (
            <li key={h.id}>
              <Link
                to="/wiki/$type/$slug"
                params={{ type, slug: String(h.id) }}
                className="block px-3 py-1.5 hover:bg-accent"
              >
                {h.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {node.groups.map((g) => (
        <section
          key={g.slug}
          className="mb-6"
          data-testid={`wiki-hub-group-${g.slug}`}
        >
          {(() => {
            const buckets = getGroupBuckets(g);
            return (
              <>
                <Link
                  to="/wiki/$type/$slug"
                  params={{ type, slug: g.slug }}
                  className="text-lg font-semibold hover:underline"
                >
                  {t(`wiki/taxonomy:groups.${type}.${g.slug}.name`)} ({g.count})
                </Link>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {BUCKETS.map((bucket) =>
                    buckets[bucket].length ? (
                      <div
                        key={bucket}
                        className={bucket === "both" ? "md:col-span-2" : ""}
                      >
                        <h3
                          className="text-sm font-semibold text-muted-foreground"
                          data-testid={`faction-col-${bucket}`}
                        >
                          {t(`wiki:list.${bucket}`)}
                        </h3>
                        {renderSectionChips(g.slug, bucket, buckets[bucket])}
                      </div>
                    ) : null,
                  )}
                </div>
              </>
            );
          })()}
        </section>
      ))}
    </div>
  );
}
