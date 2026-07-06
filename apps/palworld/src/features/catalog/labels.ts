import { BUILDING_TYPE_LABELS, ITEM_TYPE_LABELS } from '../../catalogStrings'
import type { TypeLabels } from '../../lib/catalog'

// The extractor already strips the `EPal…::` enum prefix, but guard anyway so a
// raw enum never leaks to the UI.
const strip = (s: string): string => s.replace(/^E[A-Za-z]+::/, '')

// Prefer the game's own localized label (from labels.json), then the hardcoded
// English fallback, then the raw typeA key.
export const itemTypeLabel = (typeA: string, labels?: TypeLabels): string => {
  const k = strip(typeA)
  return labels?.[k] ?? ITEM_TYPE_LABELS[k] ?? k
}
export const buildingTypeLabel = (typeA: string, labels?: TypeLabels): string => {
  const k = strip(typeA)
  return labels?.[k] ?? BUILDING_TYPE_LABELS[k] ?? k
}
