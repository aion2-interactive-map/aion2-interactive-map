import { BUILDING_TYPE_LABELS, ITEM_TYPE_LABELS } from '../../catalogStrings'

// The extractor already strips the `EPal…::` enum prefix, but guard anyway so a
// raw enum never leaks to the UI.
const strip = (s: string): string => s.replace(/^E[A-Za-z]+::/, '')

export const itemTypeLabel = (typeA: string): string => ITEM_TYPE_LABELS[strip(typeA)] ?? strip(typeA)
export const buildingTypeLabel = (typeA: string): string =>
  BUILDING_TYPE_LABELS[strip(typeA)] ?? strip(typeA)
