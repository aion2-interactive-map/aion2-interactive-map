import { describe, expect, it } from "vitest"
import { deriveEyeState, syncExpanded } from "./filter-logic"

describe("deriveEyeState", () => {
  it("returns none for an empty subtype list", () => {
    expect(deriveEyeState([])).toBe("none")
  })
  it("returns none when no subtype is active", () => {
    expect(deriveEyeState([{ active: false }, { active: false }])).toBe("none")
  })
  it("returns some when only part is active", () => {
    expect(deriveEyeState([{ active: true }, { active: false }])).toBe("some")
  })
  it("returns all when every subtype is active", () => {
    expect(deriveEyeState([{ active: true }, { active: true }])).toBe("all")
  })
})

describe("syncExpanded", () => {
  it("appends category ids not yet known", () => {
    expect(syncExpanded([], ["a", "b"])).toEqual(["a", "b"])
    expect(syncExpanded(["a"], ["a", "b", "c"])).toEqual(["a", "b", "c"])
  })
  it("returns the same array reference when nothing changed", () => {
    const prev = ["a", "b"]
    expect(syncExpanded(prev, ["a", "b"])).toBe(prev)
    expect(syncExpanded(prev, ["a"])).toBe(prev)
  })
  it("re-adds a user-collapsed id when it reappears as new (donor bug-compatible)", () => {
    // Donor behavior: collapsing "a" removes it from prev; if the renderable
    // set still contains "a", the sync effect re-appends it. Replicate exactly.
    expect(syncExpanded(["b"], ["a", "b"])).toEqual(["b", "a"])
  })
})
