import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronRight,
  ScrollText,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { WikiLoading } from "@/features/wiki/ui";
import { loadTaxonomy } from "@/lib/wiki";
import type { WikiTaxonomy } from "@/types/wiki";

const TYPE_ICONS: Record<string, LucideIcon> = {
  quest: ScrollText,
  npc: Users,
  item: Swords,
};

export default function WikiHome() {
  const { t } = useTranslation(["wiki", "wiki/taxonomy"]);
  const [tax, setTax] = useState<WikiTaxonomy | null>(null);

  useEffect(() => {
    loadTaxonomy().then(setTax).catch(console.error);
  }, []);

  useEffect(() => {
    document.title = t("wiki:home.title");
  }, [t]);

  if (!tax) return <WikiLoading />;

  return (
    <div data-testid="wiki-home">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">{t("wiki:home.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("wiki:home.subtitle")}
        </p>
      </header>
      {tax.types.map((type) => {
        const Icon = TYPE_ICONS[type.slug] ?? BookOpen;
        return (
          <section key={type.slug} className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <Link
                to="/wiki/$type"
                params={{ type: type.slug }}
                className="text-xl font-semibold hover:underline"
              >
                {t(`wiki/taxonomy:types.${type.slug}.name`)}
              </Link>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {type.count}
              </span>
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {type.groups.map((g) => (
                <li key={g.slug}>
                  <Link
                    to="/wiki/$type/$slug"
                    params={{ type: type.slug, slug: g.slug }}
                    className="group flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-accent/50"
                    data-testid={`wiki-group-${g.slug}`}
                  >
                    <span>
                      <span className="font-medium">
                        {t(`wiki/taxonomy:groups.${type.slug}.${g.slug}.name`)}
                      </span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {g.count}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
