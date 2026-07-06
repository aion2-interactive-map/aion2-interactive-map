// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ShellMapSelect } from "./ShellMapSelect"

afterEach(cleanup)

const maps = [
  { id: "elysea", label: "Elysea" },
  { id: "asmodae", label: "Asmodae" },
]

describe("ShellMapSelect", () => {
  it("renders the active map label in the trigger", () => {
    const { getByTestId } = render(
      <ShellMapSelect maps={maps} activeMapId="asmodae" onSelectMap={vi.fn()} />,
    )
    expect(getByTestId("map-select").textContent).toContain("Asmodae")
  })

  it("renders the placeholder when no map is active", () => {
    const { getByTestId } = render(
      <ShellMapSelect
        maps={maps}
        activeMapId=""
        onSelectMap={vi.fn()}
        placeholder="Select a map"
      />,
    )
    expect(getByTestId("map-select").textContent).toContain("Select a map")
  })
})
