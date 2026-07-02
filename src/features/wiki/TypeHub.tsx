import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import MiniSearch, { type SearchResult } from "minisearch";

import { Input } from "@/components/ui/input";
import { loadTaxonomy, loadWikiIndex } from "@/lib/wiki";
import type { WikiIndexDoc, WikiTaxonomy } from "@/types/wiki";

type SearchDoc = { id: number; name: string };
type SearchHit = SearchResult & Pick<SearchDoc, "id" | "name">;

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
  if (!node) return null;

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
        <section key={g.slug} className="mb-6">
          <Link
            to="/wiki/$type/$slug"
            params={{ type, slug: g.slug }}
            className="text-lg font-semibold hover:underline"
          >
            {t(`wiki/taxonomy:groups.${type}.${g.slug}.name`)} ({g.count})
          </Link>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {g.sections.map((s) => (
              <li key={s.slug}>
                <Link
                  to="/wiki/$type/$slug"
                  params={{ type, slug: g.slug }}
                  hash={s.slug}
                  className="rounded bg-secondary px-2 py-0.5 hover:bg-accent"
                >
                  {t(`wiki/taxonomy:sections.${s.slug}.name`)} - {s.count}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
