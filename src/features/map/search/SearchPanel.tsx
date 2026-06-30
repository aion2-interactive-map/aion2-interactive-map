import { useEffect, useMemo, useState } from "react";
import MiniSearch, { type SearchResult } from "minisearch";
import { useTranslation } from "react-i18next";
import { useMarkers } from "@/context/MarkersContext";
import type { MarkerWithTranslations } from "@/types/game";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  onSelectMarker: (id: string | null) => void;
  onFlyTo: (pos: { x: number; y: number }) => void;
};

type Scope = "both" | "name";

/**
 * Right-side search panel overlaying the map (Lanhu "1天族" board).
 * Search input + name/desc scope + 搜索 action, a results-count header,
 * and a scrollable list of result cards (name / description / coords).
 */
export default function SearchPanel({ onSelectMarker, onFlyTo }: Props) {
  const { markers, markersById } = useMarkers();
  const { t } = useTranslation(["common"]);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [scope, setScope] = useState<Scope>("both");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const miniSearch = useMemo(() => {
    const ms = new MiniSearch<MarkerWithTranslations>({
      fields: ["localizedName", "localizedDescription"],
      storeFields: ["id"],
      searchOptions: { prefix: true, fuzzy: 0.2 },
      tokenize: (s) => [...s],
    });
    ms.addAll(markers);
    return ms;
  }, [markers]);

  const results: SearchResult[] = useMemo(() => {
    const q = debounced.trim();
    if (!q) return [];
    return miniSearch
      .search(q, {
        fields: scope === "name" ? ["localizedName"] : undefined,
      })
      .slice(0, 50);
  }, [debounced, miniSearch, scope]);

  const handleSelect = (id: string) => {
    const marker = markersById[id];
    if (!marker) return;
    onSelectMarker(id);
    onFlyTo({ x: marker.x, y: marker.y });
  };

  const hasQuery = debounced.trim().length > 0;

  return (
    <div
      className="pointer-events-auto absolute top-3 right-3 bottom-3 z-[600] flex w-[290px] flex-col gap-2"
      data-testid="search-panel"
    >
      {/* Search bar */}
      <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(46,151,255,0.25)] bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-[rgba(46,151,255,0.35)] dark:bg-[#2C293A]/95">
        <svg
          className="size-4 shrink-0 text-[rgba(0,0,0,0.45)] dark:text-[rgba(255,255,255,0.5)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          data-testid="marker-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common:ui.search", "Search")}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#3D3D3D] outline-none placeholder:text-[rgba(0,0,0,0.4)] dark:text-white dark:placeholder:text-[rgba(255,255,255,0.4)]"
        />
        <button
          type="button"
          onClick={() => setScope((s) => (s === "both" ? "name" : "both"))}
          className="shrink-0 text-xs text-[rgba(0,0,0,0.6)] hover:text-[#3D3D3D] dark:text-[rgba(255,255,255,0.6)] dark:hover:text-white"
          title={t("common:search.scopeToggle", "Toggle search scope")}
        >
          {scope === "name"
            ? t("common:search.scopeName", "Name")
            : t("common:search.scopeBoth", "All")}
        </button>
        <span className="text-[rgba(0,0,0,0.3)] dark:text-[rgba(255,255,255,0.3)]">|</span>
        <button
          type="button"
          onClick={() => setDebounced(query)}
          className="shrink-0 text-sm font-medium text-[#2E97FF]"
        >
          {t("common:ui.search", "Search")}
        </button>
      </div>

      {/* Results panel */}
      {hasQuery && (
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-[rgba(46,151,255,0.18)] bg-[#F3FBFF]/95 shadow-sm backdrop-blur dark:border-[rgba(46,151,255,0.3)] dark:bg-[#2C293A]/95">
          <div className="border-b border-[rgba(0,0,0,0.06)] px-3 py-2 text-center text-xs text-[rgba(0,0,0,0.6)] dark:border-[rgba(255,255,255,0.1)] dark:text-[rgba(255,255,255,0.6)]">
            {t("common:search.resultsCount", {
              count: results.length,
              defaultValue: "{{count}} results",
            })}
          </div>
          <ul
            data-testid="search-results"
            className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2"
          >
            {results.map((res) => {
              const marker = markersById[res.id as string];
              if (!marker) return null;
              return (
                <li key={res.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(res.id as string)}
                    className={cn(
                      "w-full rounded-md border border-transparent bg-white px-3 py-2 text-left dark:bg-[rgba(255,255,255,0.04)]",
                      "transition-colors hover:border-[rgba(46,151,255,0.3)] hover:bg-[#E5F0FF] dark:hover:bg-[rgba(255,255,255,0.08)]",
                    )}
                  >
                    <span className="block truncate text-sm font-semibold text-[#3D3D3D] dark:text-white">
                      {marker.localizedName ||
                        t("common:markerSearch.unnamed", "Unnamed marker")}
                    </span>
                    {marker.localizedDescription && (
                      <span className="mt-0.5 block truncate text-xs text-[rgba(0,0,0,0.6)] dark:text-[rgba(255,255,255,0.6)]">
                        {marker.localizedDescription}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[11px] text-[rgba(0,0,0,0.45)] dark:text-[rgba(255,255,255,0.45)]">
                      {t("common:search.coords", {
                        x: Math.round(marker.x),
                        y: Math.round(marker.y),
                        defaultValue: "Coords: {{x}}, {{y}}",
                      })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
