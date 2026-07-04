import { describe, it, expect } from 'vitest'

import { formatPalId } from './palId'

describe('formatPalId', () => {
  it('formats catalogued Paldeck ids', () => {
    expect(formatPalId(1)).toBe('No.001')
    expect(formatPalId(1, '')).toBe('No.001')
    expect(formatPalId(37)).toBe('No.037')
    expect(formatPalId(37, 'B')).toBe('No.037B')
    expect(formatPalId(204)).toBe('No.204')
  })

  it('returns undefined for uncatalogued values', () => {
    expect(formatPalId(undefined)).toBeUndefined()
    expect(formatPalId(0)).toBeUndefined()
    expect(formatPalId(-1)).toBeUndefined()
  })
})
