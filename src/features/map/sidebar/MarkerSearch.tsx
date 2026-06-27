import { useEffect, useMemo, useState } from "react";
import MiniSearch, { type SearchResult } from "minisearch";
import { useTranslation } from "react-i18next";
import { useMarkers } from "@/context/MarkersContext";
import type { MarkerWithTranslations } from "@/types/game";
import { Input } from "@/components/ui/input";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

type Props = {
  onSelectMarker: (id: string | null) => void;
  onFlyTo: (pos: { x: number; y: number }) => void;
};

export default function MarkerSearch({ onSelectMarker, onFlyTo }: Props) {
  const { markers, markersById } = useMarkers();
  const { t } = useTranslation(["common"]);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

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
    return miniSearch.search(q).slice(0, 50);
  }, [debounced, miniSearch]);

  const handleSelect = (id: string) => {
    const marker = markersById[id];
    if (!marker) return;
    onSelectMarker(id);
    onFlyTo({ x: marker.x, y: marker.y });
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        data-testid="marker-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("common:ui.search", "Search")}
      />
      {debounced.trim() && (
        <ul
          data-testid="search-results"
          className="flex flex-col gap-1 max-h-64 overflow-y-auto"
        >
          {results.map((res) => {
            const marker = markersById[res.id as string];
            if (!marker) return null;
            return (
              <li key={res.id}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSelect(res.id as string)}
                >
                  <span className="block truncate font-medium">
                    {marker.localizedName ||
                      t("common:markerSearch.unnamed", "Unnamed marker")}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    ({Math.round(marker.x)}, {Math.round(marker.y)})
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
