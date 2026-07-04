// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SearchPanel, type SearchItem } from "./SearchPanel"

afterEach(cleanup)

const labels = {
  search: "Search",
  resultsCount: (n: number) => `${n} results`,
  unnamed: "Unnamed",
  noDescription: "No description",
  scopeName: "Name",
  scopeAll: "All",
}

function renderSearchPanel(items: SearchItem[]) {
  return render(
    <SearchPanel items={items} labels={labels} onFlyTo={vi.fn()} onSelect={vi.fn()} />,
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

describe("SearchPanel", () => {
  it("matches idLabel values in search queries", () => {
    renderSearchPanel([
      item({ id: "pal-037", name: "Catalog Pal", description: "Forest runner", idLabel: "No.037" }),
    ])

    searchFor("No.037")

    expect(screen.getByText("No.037")).toBeTruthy()
    expect(screen.getByText("Catalog Pal")).toBeTruthy()
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
})
