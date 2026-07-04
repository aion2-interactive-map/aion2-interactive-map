import { useEffect, useMemo, useState } from "react"
import MiniSearch, { type SearchResult } from "minisearch"
import { cn } from "@gamemap/ui"

export type SearchItem = {
  idLabel?: string;
  id: string
  name: string
  description?: string
  subtypeLabel?: string
  categoryLabel?: string
  iconUrl?: string
  x: number
  y: number
}

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
}

type Scope = "both" | "name"

/**
 * Context-free right-side search overlay. MiniSearch with a per-character
 * tokenizer (so CJK queries match) + prefix/fuzzy. Styling reads theme tokens
 * so each app's palette drives the accent.
 */
export function SearchPanel({
  items,
  onSelect,
  onFlyTo,
  labels,
  debounceMs = 200,
  classNames,
  displayCoords = (x, y) => ({ x, y }),
}: SearchPanelProps) {
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [scope, setScope] = useState<Scope>("both")

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), debounceMs)
    return () => clearTimeout(id)
  }, [query, debounceMs])

  const itemsById = useMemo(() => {
    const m = new Map<string, SearchItem>()
    for (const it of items) m.set(it.id, it)
    return m
  }, [items])

  const miniSearch = useMemo(() => {
    const ms = new MiniSearch<SearchItem>({
      fields: ["name", "description", "idLabel"],
      storeFields: ["id"],
      searchOptions: { prefix: true, fuzzy: 0.2 },
      tokenize: (s) => [...s],
    })
    ms.addAll(items)
    return ms
  }, [items])

  const results: SearchResult[] = useMemo(() => {
    const q = debounced.trim()
    if (!q) return []
    return miniSearch
      .search(q, { fields: scope === "name" ? ["name"] : undefined })
      .slice(0, 50)
  }, [debounced, miniSearch, scope])

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
                    <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground/70">
                      {(() => {
                        const c = displayCoords(item.x, item.y)
                        return `(${Math.round(c.x)}, ${Math.round(c.y)})`
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
