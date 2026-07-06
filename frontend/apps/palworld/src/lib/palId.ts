import type { IdLabelValue } from '@gamemap/map-shell'

/**
 * A pal's Paldeck id as structured parts: "No.037" with an optional variant
 * suffix ("B") kept separate so the shell can style it distinctly. Returns
 * undefined for uncatalogued pals (zukanIndex <= 0 or absent).
 */
export function formatPalId(zukanIndex?: number, suffix?: string): IdLabelValue | undefined {
  if (typeof zukanIndex !== 'number' || zukanIndex <= 0) return undefined
  return { text: `No.${String(zukanIndex).padStart(3, '0')}`, accent: suffix || undefined }
}

/** Flatten a formatted pal id to a plain string, e.g. for search indexing. */
export function palIdText(id?: IdLabelValue): string | undefined {
  return id ? `${id.text}${id.accent ?? ''}` : undefined
}
