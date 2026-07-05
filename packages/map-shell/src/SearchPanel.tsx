import { useEffect, useMemo, useRef, useState } from "react"
import MiniSearch, { type SearchOptions, type SearchResult } from "minisearch"
import { cn } from "@gamemap/ui"

export type SearchItem = {
  id: string
  name: string
  description?: string
  idLabel?: string
  subtypeLabel?: string
  categoryLabel?: string
  iconUrl?: string
  x: number
  y: number
}

/** A `SearchItem` text field that can be indexed for searching. */
export type SearchField = "name" | "description" | "idLabel"

export type SearchPanelLabels = {
  search: string
  resultsCount: (n: number) => string
  unnamed: string
  noDescription: string
  scopeName: string
  scopeAll: string
}

export type SearchPanelProps = {
  items: SearchItem[]
  onSelect: (id: string) => void
  onFlyTo: (pos: { x: number; y: number }) => void
  labels: SearchPanelLabels
  debounceMs?: number
  classNames?: { root?: string }
  /**
   * Maps a result's DATA (x, y) to the coordinate pair shown on the card.
   * Default: identity. Fly-to still uses the raw DATA coords. An app supplies
   * this to display game-native coords (e.g. Palworld in-game coordinates).
   */
  displayCoords?: (x: number, y: number) => { x: number; y: number }
  /**
   * Which item fields are indexed for searching. Required — the panel makes no
   * assumption about the item shape. E.g. AION2 passes `["name","description"]`;
   * Palworld passes `["name","idLabel"]` (its `description` is a non-textual
   * spawn level range). Fields not listed are still rendered on the card.
   */
  searchFields: SearchField[]
  /**
   * Optional per-query hook to override how a query is matched. Return a
   * MiniSearch `SearchOptions` to take over matching for that query, or
   * `undefined` to use the default (scope-aware prefix search). This is where
   * an app injects game-specific rules without the panel hardcoding fields —
   * e.g. Palworld treats a numeric query as an exact Paldeck-id lookup:
   * `(q) => /^\d+$/.test(q) ? { fields: ["idLabel"], prefix: false, fuzzy: false } : undefined`.
   */
  resolveSearchOptions?: (query: string) => SearchOptions | undefined
  /**
   * App-wide base MiniSearch options, merged UNDER the scope's fields and under
   * any `resolveSearchOptions` per-query override. Lets an app change matching
   * for every query without the panel hardcoding it. E.g. the Palworld map
   * passes `{ combineWith: "AND", fuzzy: false }`: pal names tokenize per CJK
   * character, so the MiniSearch default (OR-combine) makes "云海鹿" match every
   * pal sharing a single character — AND requires all characters instead. Pass
   * a STABLE reference (module constant / memoized); an inline object literal
   * re-runs the search every render.
   */
  searchOptions?: SearchOptions
  /**
   * Optional secondary line rendered right-aligned in the coords row, computed
   * lazily per shown result (so an app can do a point lookup for only the ≤50
   * visible cards rather than every marker). AION2 uses it for the subzone.
   */
  resultAside?: (item: SearchItem) => string | undefined
  /**
   * Seed the search box from outside (e.g. a `?q=` deep link). Prefills the
   * input and runs the search immediately. Re-applied whenever the value
   * changes; a later user edit is preserved until the value changes again.
   */
  initialQuery?: string
  /**
   * Called with the ids of the currently shown results whenever they change
   * (empty array when the query is blank). Lets the host force those markers
   * onto the map even when their subtype filter is off. Must be a stable
   * callback (e.g. a `useState` setter or `useCallback`).
   */
  onResultsChange?: (ids: string[]) => void
}

type Scope = "both" | "name"

/**
 * Context-free right-side search overlay. MiniSearch with a letter/digit/CJK
 * tokenizer (so numeric-id, Latin and CJK queries all match) + prefix/fuzzy.
 * The item shape and matching rules are supplied by the caller; styling reads
 * theme tokens so each app's palette drives the accent.
 */
export function SearchPanel({
  items,
  onSelect,
  onFlyTo,
  labels,
  debounceMs = 200,
  classNames,
  displayCoords = (x, y) => ({ x, y }),
  searchFields,
  resolveSearchOptions,
  searchOptions,
  resultAside,
  initialQuery,
  onResultsChange,
}: SearchPanelProps) {
  const [query, setQuery] = useState(initialQuery ?? "")
  const [debounced, setDebounced] = useState(initialQuery ?? "")
  const [scope, setScope] = useState<Scope>("both")

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), debounceMs)
    return () => clearTimeout(id)
  }, [query, debounceMs])

  // Re-seed from an externally supplied query (URL deep link / navigation).
  // Runs only when `initialQuery` actually changes, so a user edit afterwards
  // is never clobbered by an unrelated re-render. Bypasses the debounce so the
  // deep-linked search shows immediately.
  useEffect(() => {
    if (initialQuery === undefined) return
    setQuery(initialQuery)
    setDebounced(initialQuery)
  }, [initialQuery])

  const itemsById = useMemo(() => {
    const m = new Map<string, SearchItem>()
    for (const it of items) m.set(it.id, it)
    return m
  }, [items])

  const miniSearch = useMemo(() => {
    const ms = new MiniSearch<SearchItem>({
      fields: searchFields,
      storeFields: ["id"],
      // Fuzzy helps typo'd names, but on a purely-numeric query (an id like
      // "123") it matches every edit-distance-1 neighbour (No.113, No.12x…),
      // flooding results — so disable fuzzy for numeric terms; prefix stays on.
      searchOptions: {
        prefix: true,
        fuzzy: (term) => (/^\d+$/.test(term) ? false : 0.2),
      },
      // Tokenize into Latin-letter runs, digit runs, and single CJK chars.
      // Splitting letters from digits means a suffixed id like "No.111B" yields
      // the number token "111" (findable by a numeric query) while CJK still
      // matches per character. Strip leading zeros from numeric tokens (index +
      // query) so "11"/"011" both match a zero-padded id token "011" (No.011).
      tokenize: (s) =>
        (s.match(/[a-zA-Z]+|[0-9]+|[぀-ヿ㐀-鿿豈-﫿가-힯]/g) ?? []).map((t) =>
          /^\d+$/.test(t) ? t.replace(/^0+(?=\d)/, "") : t,
        ),
    })
    ms.addAll(items)
    return ms
    // searchFields is joined so a fresh array literal with the same contents
    // doesn't needlessly rebuild the index.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchFields.join(",")])

  const results: SearchResult[] = useMemo(() => {
    const q = debounced.trim()
    if (!q) return []
    // Layer the options: app-wide base (`searchOptions`) < the scope's fields <
    // an app-supplied per-query override (`resolveSearchOptions`, e.g. Palworld's
    // numeric-id lookup) which wins. `...undefined` spreads to nothing, so an
    // absent base or resolver simply drops out.
    const opts: SearchOptions = {
      ...searchOptions,
      fields: scope === "name" ? ["name"] : searchFields,
      ...resolveSearchOptions?.(q),
    }
    return miniSearch.search(q, opts).slice(0, 50)
    // searchFields is joined (not referenced) so a fresh array literal with the
    // same contents doesn't churn `results` every render — which, via the
    // onResultsChange effect below, would loop setState→render→setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, miniSearch, scope, searchFields.join(","), resolveSearchOptions, searchOptions])

  // Report the shown result ids so the host can force those markers onto the
  // map even when their subtype filter is off (see SearchPanelProps). Guarded
  // by the last-reported id list so an unstable `results`/`onResultsChange`
  // reference can't spin an update loop: we only call out when the ids change.
  const lastReportedIds = useRef<string | null>(null)
  useEffect(() => {
    if (!onResultsChange) return
    const ids = results.map((r) => r.id as string)
    const key = ids.join(" ")
    if (key === lastReportedIds.current) return
    lastReportedIds.current = key
    onResultsChange(ids)
  }, [results, onResultsChange])

  const handleSelect = (id: string) => {
    const item = itemsById.get(id)
    if (!item) return
    onSelect(id)
    onFlyTo({ x: item.x, y: item.y })
  }

  const hasQuery = debounced.trim().length > 0

  return (
    <div
      className={cn(
        "pointer-events-auto absolute top-3 right-3 bottom-3 z-[600] flex w-[290px] flex-col gap-2",
        classNames?.root,
      )}
      data-testid="search-panel"
    >
      {/* Search bar */}
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-popover/95 px-3 py-2 text-popover-foreground shadow-sm backdrop-blur">
        <svg
          className="size-4 shrink-0 text-muted-foreground"
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
          placeholder={labels.search}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={() => setScope((s) => (s === "both" ? "name" : "both"))}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          {scope === "name" ? labels.scopeName : labels.scopeAll}
        </button>
        <span className="text-muted-foreground/50">|</span>
        <button
          type="button"
          onClick={() => setDebounced(query)}
          className="shrink-0 text-sm font-medium text-primary"
        >
          {labels.search}
        </button>
      </div>

      {/* Results panel */}
      {hasQuery && (
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-popover/95 shadow-sm backdrop-blur">
          <div className="border-b border-border px-3 py-2 text-center text-xs text-muted-foreground">
            {labels.resultsCount(results.length)}
          </div>
          <ul
            data-testid="search-results"
            className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2"
          >
            {results.map((res) => {
              const item = itemsById.get(res.id as string)
              if (!item) return null
              const metaLabel = [item.subtypeLabel, item.categoryLabel]
                .filter(Boolean)
                .join(" / ")
              return (
                <li key={res.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(res.id as string)}
                    className={cn(
                      "w-full rounded-md border border-transparent bg-card px-3 py-2 text-left text-card-foreground",
                      "transition-colors hover:border-border hover:bg-accent/20",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {item.iconUrl && (
                        <img
                          src={item.iconUrl}
                          alt=""
                          className="size-[18px] shrink-0 object-contain"
                        />
                      )}
                      {item.idLabel && (
                        <span className="shrink-0 rounded bg-muted px-1 text-[11px] font-mono tabular-nums text-muted-foreground">
                          {item.idLabel}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {item.name || labels.unnamed}
                      </span>
                    </div>
                    {metaLabel && (
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {metaLabel}
                      </span>
                    )}
                    <span
                      className={cn(
                        "mt-0.5 block truncate text-xs",
                        item.description
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60 italic",
                      )}
                    >
                      {item.description || labels.noDescription}
                    </span>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground/70">
                      <span className="shrink-0 tabular-nums">
                        {(() => {
                          const c = displayCoords(item.x, item.y)
                          return `(${Math.round(c.x)}, ${Math.round(c.y)})`
                        })()}
                      </span>
                      {(() => {
                        const aside = resultAside?.(item)
                        return aside ? (
                          <span className="truncate text-right">{aside}</span>
                        ) : null
                      })()}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
