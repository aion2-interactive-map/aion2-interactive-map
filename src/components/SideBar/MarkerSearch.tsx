// src/components/Sidebar/MarkerSearch.tsx
import React, {useMemo, useState} from "react";
import {Input} from "@heroui/react";
import MiniSearch, {type SearchResult} from "minisearch";
import {useMarkers} from "@/context/MarkersContext.tsx";
import {useTranslation} from "react-i18next";
import type {MarkerInstance} from "@/types/game.ts";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSearch, faClose} from "@fortawesome/free-solid-svg-icons";

type MarkerSearchProps = {
  onSelectMarker?: (markerId: string) => void;
};

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, terms: string[]): React.ReactNode {
  if (!text) return null;
  const cleanTerms = terms.map((t) => t.trim()).filter(Boolean);
  if (!cleanTerms.length) return text;

  const pattern = new RegExp(
    `(${cleanTerms.map(escapeRegExp).join("|")})`,
    "ig"
  );
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const isMatch = cleanTerms.some(
      (t) => part.toLowerCase() === t.toLowerCase()
    );
    if (!isMatch) return <span key={i}>{part}</span>;
    return (
      <mark
        key={i}
        className="bg-yellow-300/70 text-inherit px-0.5 rounded-[2px]"
      >
        {part}
      </mark>
    );
  });
}

const MarkerSearch: React.FC<MarkerSearchProps> = ({onSelectMarker}) => {
  const {markers} = useMarkers();
  const {t} = useTranslation("common");
  const [query, setQuery] = useState("");

  const miniSearch = useMemo(() => {
    const ms = new MiniSearch<MarkerInstance>({
      fields: ["name"],
      storeFields: ["name", "x", "y", "description"],
      searchOptions: {
        prefix: true,
        fuzzy: 0.2,
      },
    });
    const filteredMarkers: MarkerInstance[] = markers.filter((marker) =>
      marker.subtype.startsWith("creature")
    );
    ms.addAll(filteredMarkers);
    return ms;
  }, [markers]);

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return miniSearch.search(q);
  }, [query, miniSearch]);

  const terms = useMemo(
    () =>
      query
        .trim()
        .split(/\s+/)
        .filter(Boolean),
    [query]
  );

  return (
    <div className="w-full flex flex-col gap-2.5 px-6 mt-2.5">
      {/* Search box */}
      <Input
        size="sm"
        radius="sm"
        variant="flat"
        placeholder={t("markerActions.search", "Search markers…")}
        value={query}
        onValueChange={setQuery}
        color="default"
        classNames={{
          inputWrapper: `h-9`,
          input: "text-[14px]",
        }}
        startContent={
          query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="
                inline-flex
                items-center
                justify-center
                h-4 w-4
                leading-none
                text-default-700
                hover:text-foreground
              "
              aria-label="Clear search"
            >
              <FontAwesomeIcon
                icon={faClose}
                className="text-default-700 text-sm hover:text-foreground"
              />
            </button>
          ) : (
            <FontAwesomeIcon
              icon={faSearch}
              className="text-default-700 text-sm opacity-70"
            />
          )
        }
      />

      {/* Result list as cards */}
      {query.trim() && (
        <>
          {/* Header with count */}
          <div className="text-[12px] text-default-700 text-center">
            {t("markerActions.searchCount", "{{count}} search results", {
              count: results.length,
            })}
          </div>

          {results.slice(0, 50).map((res) => {
            const doc = res as SearchResult & MarkerInstance;
            return (
              <div key={doc.id} className="">
                <button
                  type="button"
                  className="
                    w-full text-left
                    rounded-lg
                    bg-transparent
                    hover:bg-search-item
                    px-3 py-2
                    text-xs
                    flex flex-col gap-1
                  "
                  onClick={() => {
                    onSelectMarker?.(doc.id);
                  }}
                >
                  {/* Title */}
                  <div className="font-semibold text-[16px]">
                    {doc.name
                      ? highlightText(doc.name, terms)
                      : t("markerSearch.unnamed", "Unnamed marker")}
                  </div>

                  {/* Optional description */}
                  {doc.description && (
                    <div className="text-[14px] text-default-700 line-clamp-2">
                      {highlightText(doc.description, terms)}
                    </div>
                  )}

                  {/* Optional coords */}

                  <div className="text-[14px] text-default-700">
                    {t("markerActions.position", "Position")}: ({Math.round(doc.x)}, {Math.round(doc.y)})
                  </div>
                </button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default MarkerSearch;
