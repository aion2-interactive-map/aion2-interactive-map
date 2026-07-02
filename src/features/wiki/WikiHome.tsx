import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { loadTaxonomy } from "@/lib/wiki";
import type { WikiTaxonomy } from "@/types/wiki";

export default function WikiHome() {
  const { t } = useTranslation(["wiki", "wiki/taxonomy"]);
  const [tax, setTax] = useState<WikiTaxonomy | null>(null);

  useEffect(() => {
    loadTaxonomy().then(setTax).catch(console.error);
  }, []);

  useEffect(() => {
    document.title = t("wiki:home.title");
  }, [t]);

  if (!tax) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div data-testid="wiki-home">
      <h1 className="mb-6 text-2xl font-bold">{t("wiki:home.title")}</h1>
      {tax.types.map((type) => (
        <section key={type.slug} className="mb-8">
          <a
            href={`/wiki/${type.slug}`}
            className="text-xl font-semibold hover:underline"
          >
            {t(`wiki/taxonomy:types.${type.slug}.name`)} ({type.count})
          </a>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {type.groups.map((g) => (
              <li key={g.slug}>
                <a
                  href={`/wiki/${type.slug}/${g.slug}`}
                  className="block rounded-md border border-border p-3 hover:bg-accent"
                  data-testid={`wiki-group-${g.slug}`}
                >
                  <span className="font-medium">
                    {t(`wiki/taxonomy:groups.${type.slug}.${g.slug}.name`)}
                  </span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {g.count}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
