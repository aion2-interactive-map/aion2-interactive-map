// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FilterPanel } from "./FilterPanel"

afterEach(cleanup)

const categories = [
  {
    id: "cat1",
    label: "Category 1",
    subtypes: [
      { id: "sub1", label: "Sub 1", active: true },
      { id: "sub2", label: "Sub 2", active: false },
    ],
  },
]

describe("FilterPanel", () => {
  it("dispatches onToggleSubtype with the subtype id", () => {
    const onToggle = vi.fn()
    const { getByTestId } = render(
      <FilterPanel categories={categories} onToggleSubtype={onToggle} />,
    )
    fireEvent.click(getByTestId("subtype-toggle-sub2"))
    expect(onToggle).toHaveBeenCalledWith("sub2")
  })

  it("dispatches onSetCategory(id, true) from the eye toggle when only part is active", () => {
    const onSet = vi.fn()
    const { getByLabelText } = render(
      <FilterPanel
        categories={categories}
        onToggleSubtype={() => {}}
        onSetCategory={onSet}
        categoryToggleLabels={{ show: "Show category", hide: "Hide category" }}
      />,
    )
    fireEvent.click(getByLabelText("Show category"))
    expect(onSet).toHaveBeenCalledWith("cat1", true)
  })

  it("renders the count, badge, and idLabel on the right of the button", () => {
    const { getByTestId } = render(
      <FilterPanel
        categories={[
          {
            id: "cat1",
            label: "Category 1",
            subtypes: [
              { id: "counted", label: "Counted", active: true, count: 12 },
              { id: "badged", label: "Badged", active: true, badge: "3/12" },
              { id: "id", label: "Id", active: true, idLabel: "No.037" },
              { id: "plain", label: "Plain", active: true },
            ],
          },
        ]}
        onToggleSubtype={() => {}}
      />,
    )
    expect(getByTestId("subtype-toggle-counted").textContent).toContain("12")
    expect(getByTestId("subtype-toggle-badged").textContent).toContain("3/12")
    // idLabel renders as a styled chip (rounded bg-muted font-mono), unlike the plain badge.
    const idChip = getByTestId("subtype-toggle-id").querySelector("span.font-mono")
    expect(idChip?.textContent).toBe("No.037")
    expect(getByTestId("subtype-toggle-plain").textContent).toBe("Plain")
  })

  it("merges classNames on the subtype button with the active skin last", () => {
    const { getByTestId } = render(
      <FilterPanel
        categories={categories}
        onToggleSubtype={() => {}}
        classNames={{ subtypeButton: "bg-skin", subtypeButtonActive: "bg-skin-active" }}
      />,
    )
    // tailwind-merge keeps the last conflicting bg-* class:
    const active = getByTestId("subtype-toggle-sub1").className
    expect(active).toContain("bg-skin-active")
    expect(active).not.toContain("bg-primary")
    const inactive = getByTestId("subtype-toggle-sub2").className
    expect(inactive).toContain("bg-skin")
    expect(inactive).not.toContain("bg-muted")
  })
})
