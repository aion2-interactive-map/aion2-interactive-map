import { describe, it, expect } from 'vitest'

import { formatPalId, palIdText } from './palId'

describe('formatPalId', () => {
  it('formats catalogued Paldeck ids into structured parts', () => {
    expect(formatPalId(1)).toEqual({ text: 'No.001', accent: undefined })
    expect(formatPalId(1, '')).toEqual({ text: 'No.001', accent: undefined })
    expect(formatPalId(37)).toEqual({ text: 'No.037', accent: undefined })
    expect(formatPalId(37, 'B')).toEqual({ text: 'No.037', accent: 'B' })
    expect(formatPalId(204)).toEqual({ text: 'No.204', accent: undefined })
  })

  it('returns undefined for uncatalogued values', () => {
    expect(formatPalId(undefined)).toBeUndefined()
    expect(formatPalId(0)).toBeUndefined()
    expect(formatPalId(-1)).toBeUndefined()
  })
})

describe('palIdText', () => {
  it('flattens the id (with suffix) to a plain string', () => {
    expect(palIdText(formatPalId(37, 'B'))).toBe('No.037B')
    expect(palIdText(formatPalId(1))).toBe('No.001')
    expect(palIdText(undefined)).toBeUndefined()
  })
})
