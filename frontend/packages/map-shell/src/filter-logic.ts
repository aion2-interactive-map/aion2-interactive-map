export type EyeState = "all" | "some" | "none"

export function deriveEyeState(subtypes: { active: boolean }[]): EyeState {
  if (subtypes.length === 0) return "none"
  const activeCount = subtypes.filter((s) => s.active).length
  if (activeCount === subtypes.length) return "all"
  return activeCount > 0 ? "some" : "none"
}

export function syncExpanded(prev: string[], categoryIds: string[]): string[] {
  const known = new Set(prev)
  const next = [...prev]
  for (const id of categoryIds) {
    if (!known.has(id)) next.push(id)
  }
  return next.length === prev.length ? prev : next
}
