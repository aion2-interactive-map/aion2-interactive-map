// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { SearchOptions } from "minisearch"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SearchPanel, type SearchField, type SearchItem } from "./SearchPanel"

afterEach(cleanup)

const labels = {
  search: "Search",
  resultsCount: (n: number) => `${n} results`,
  unnamed: "Unnamed",
  noDescription: "No description",
  scopeName: "Name",
  scopeAll: "All",
}

// The rule Palworld injects: a purely-numeric query is an exact Paldeck-id
// lookup. It lives in the app, not the shared panel — tests exercise it the
// same way the app wires it.
const palworldNumericLookup = (q: string): SearchOptions | undefined =>
  /^\d+$/.test(q) ? { fields: ["idLabel"], prefix: false, fuzzy: false } : undefined

type Overrides = {
  searchFields?: SearchField[]
  resolveSearchOptions?: (query: string) => SearchOptions | undefined
  resultAside?: (item: SearchItem) => string | undefined
}

function renderSearchPanel(items: SearchItem[], over: Overrides = {}) {
  return render(
    <SearchPanel
      items={items}
      labels={labels}
      onFlyTo={vi.fn()}
      onSelect={vi.fn()}
      searchFields={over.searchFields ?? ["name", "description", "idLabel"]}
      resolveSearchOptions={over.resolveSearchOptions}
      resultAside={over.resultAside}
    />,
  )
}

// Type the query, then click the trailing "search now" button that bypasses the
// input debounce (the last button labelled with the search text).
function searchFor(query: string) {
  fireEvent.change(screen.getByTestId("marker-search"), { target: { value: query } })
  const buttons = screen.getAllByRole("button", { name: labels.search })
  fireEvent.click(buttons[buttons.length - 1])
}

const item = (over: Partial<SearchItem> & Pick<SearchItem, "id" | "name">): SearchItem => ({
  x: 0,
  y: 0,
  ...over,
})

// Wire a Palworld-style panel (name + idLabel indexed, numeric = id lookup).
const palworld = { searchFields: ["name", "idLabel"] as SearchField[], resolveSearchOptions: palworldNumericLookup }

describe("SearchPanel", () => {
  it("matches idLabel values in search queries", () => {
    renderSearchPanel([
      item({ id: "pal-037", name: "Catalog Pal", description: "Forest runner", idLabel: "No.037" }),
    ])

    searchFor("No.037")

    expect(screen.getByText("No.037")).toBeTruthy()
    expect(screen.getByText("Catalog Pal")).toBeTruthy()
  })

  it("searches only the indexed fields", () => {
    // description is not indexed here, so a term only in description misses.
    renderSearchPanel(
      [
        item({ id: "a", name: "Lamball", description: "Lv.22" }),
        item({ id: "b", name: "Cattiva", description: "Lv.22" }),
      ],
      { searchFields: ["name"] },
    )

    searchFor("Lv")

    expect(screen.queryByText("Lamball")).toBeNull()
    expect(screen.queryByText("Cattiva")).toBeNull()
  })

  it("without a resolver, a numeric query uses default prefix matching", () => {
    // No app rule → generic behavior: "12" prefix-matches the "123" id token.
    renderSearchPanel([
      item({ id: "pal-123", name: "Prefix Pal", idLabel: "No.123" }),
    ])

    searchFor("12")

    expect(screen.getByText("Prefix Pal")).toBeTruthy()
  })

  it("with the Palworld resolver, a numeric query is an exact id lookup", () => {
    renderSearchPanel(
      [
        item({ id: "pal-123", name: "Exact Pal", idLabel: "No.123" }),
        item({ id: "pal-231", name: "Reorder Pal", idLabel: "No.231" }), // shares digits
        item({ id: "pal-012", name: "Padded Pal", idLabel: "No.012" }), // shares digits
        item({ id: "pal-124", name: "Neighbour Pal", idLabel: "No.124" }), // edit-distance 1
      ],
      palworld,
    )

    searchFor("123")

    expect(screen.getByText("Exact Pal")).toBeTruthy()
    expect(screen.queryByText("Reorder Pal")).toBeNull()
    expect(screen.queryByText("Padded Pal")).toBeNull()
    expect(screen.queryByText("Neighbour Pal")).toBeNull()
  })

  it("matches a zero-padded id token with an unpadded query", () => {
    renderSearchPanel([item({ id: "pal-011", name: "Padded Pal", idLabel: "No.011" })], palworld)

    searchFor("11")

    expect(screen.getByText("Padded Pal")).toBeTruthy()
  })

  it("numeric id lookup ignores the prefix range and levels embedded in names", () => {
    renderSearchPanel(
      [
        item({ id: "pal-011", name: "Exact Pal", idLabel: "No.011" }),
        item({ id: "pal-110", name: "Prefix Pal", idLabel: "No.110" }), // 11X, must not match "11"
        item({ id: "pal-a", name: "Alpha Pal Lv.11", idLabel: "No.099" }), // level in name
      ],
      palworld,
    )

    searchFor("11")

    expect(screen.getByText("Exact Pal")).toBeTruthy()
    expect(screen.queryByText("Prefix Pal")).toBeNull()
    expect(screen.queryByText("Alpha Pal Lv.11")).toBeNull()
  })

  it("finds a suffixed id by its number", () => {
    renderSearchPanel([item({ id: "pal-111b", name: "Variant Pal", idLabel: "No.111B" })], palworld)

    searchFor("111")

    expect(screen.getByText("Variant Pal")).toBeTruthy()
  })

  it("still matches CJK names per character", () => {
    renderSearchPanel([
      item({ id: "pal-1", name: "皮皮鸡" }),
      item({ id: "pal-2", name: "冰企鹅" }),
    ])

    searchFor("皮鸡")

    expect(screen.getByText("皮皮鸡")).toBeTruthy()
  })

  it("renders an idLabel badge only for items that provide one", () => {
    const { container } = renderSearchPanel([
      item({ id: "pal-037", name: "Catalog Pal", description: "Forest runner", idLabel: "No.037" }),
      item({ id: "pal-038", name: "Label-free Pal", description: "No catalog label" }),
    ])

    searchFor("Pal")

    expect(screen.getByText("Label-free Pal")).toBeTruthy()
    expect(
      Array.from(container.querySelectorAll("span.font-mono")).map((b) => b.textContent),
    ).toEqual(["No.037"])
  })

  it("renders a resultAside line when provided", () => {
    renderSearchPanel([item({ id: "m1", name: "Zone Marker" })], {
      searchFields: ["name"],
      resultAside: () => "Verteron",
    })

    searchFor("Zone")

    expect(screen.getByText("Zone Marker")).toBeTruthy()
    expect(screen.getByText("Verteron")).toBeTruthy()
  })
})
