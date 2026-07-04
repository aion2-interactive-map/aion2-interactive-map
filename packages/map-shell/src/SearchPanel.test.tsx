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

  it("matches a numeric id query exactly, not digit-sharing or fuzzy neighbours", () => {
    renderSearchPanel([
      item({ id: "pal-123", name: "Exact Pal", idLabel: "No.123" }),
      item({ id: "pal-231", name: "Reorder Pal", idLabel: "No.231" }), // shares digits
      item({ id: "pal-012", name: "Padded Pal", idLabel: "No.012" }),  // shares digits
      item({ id: "pal-124", name: "Neighbour Pal", idLabel: "No.124" }), // edit-distance 1
    ])

    searchFor("123")

    expect(screen.getByText("Exact Pal")).toBeTruthy()
    expect(screen.queryByText("Reorder Pal")).toBeNull()
    expect(screen.queryByText("Padded Pal")).toBeNull()
    expect(screen.queryByText("Neighbour Pal")).toBeNull()
  })

  it("does not search fields excluded via searchFields", () => {
    // Palworld puts a spawn level range in description; excluding it means a
    // numeric query no longer matches every marker of that level.
    render(
      <SearchPanel
        items={[
          item({ id: "a", name: "Lamball", description: "Lv.22" }),
          item({ id: "b", name: "Cattiva", description: "Lv.22" }),
        ]}
        labels={labels}
        onFlyTo={vi.fn()}
        onSelect={vi.fn()}
        searchFields={["name", "idLabel"]}
      />,
    )

    fireEvent.change(screen.getByTestId("marker-search"), { target: { value: "22" } })
    const buttons = screen.getAllByRole("button", { name: labels.search })
    fireEvent.click(buttons[buttons.length - 1])

    expect(screen.queryByText("Lamball")).toBeNull()
    expect(screen.queryByText("Cattiva")).toBeNull()
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
})
