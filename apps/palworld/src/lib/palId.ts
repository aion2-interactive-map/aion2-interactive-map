export function formatPalId(zukanIndex?: number, suffix?: string): string | undefined {
  if (typeof zukanIndex !== 'number' || zukanIndex <= 0) return undefined
  return `No.${String(zukanIndex).padStart(3, '0')}${suffix ?? ''}`
}
