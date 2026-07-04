import { describe, it, expect } from 'vitest'

import { toGameCoords } from './coords'

describe('toGameCoords', () => {
  it('maps MainWorld world coords to published in-game coords', () => {
    // Input is now RAW WORLD (x = worldX, y = worldY). Reference tower world
    // coords (reconstructed from their pixel positions) vs the in-game coords
    // published by community guides — within eyeball tolerance.
    const cases: [number, number, number, number][] = [
      // worldX,   worldY,    gx,    gy
      [-888057, -433119, -1294, -1669], // Feybreak Tower
      [29822, 406944, 561, 334], // PIDF Tower
      [-367749, -114957, -587, -517], // Eternal Pyre Tower
      [-317719, 212051, 113, -431], // Rayne Syndicate Tower
    ]
    for (const [wx, wy, gx, gy] of cases) {
      const g = toGameCoords('MainWorld', wx, wy)
      expect(Math.abs(Math.round(g.x) - gx)).toBeLessThanOrEqual(20)
      expect(Math.abs(Math.round(g.y) - gy)).toBeLessThanOrEqual(20)
    }
  })

  it('maps the Paldex origin (world shift) to (0, 0)', () => {
    const g = toGameCoords('MainWorld', -123888, 158000)
    expect(g.x).toBeCloseTo(0, 6)
    expect(g.y).toBeCloseTo(0, 6)
  })

  it('is identity for maps without a transform (e.g. WorldTree)', () => {
    expect(toGameCoords('WorldTree', 1234, 5678)).toEqual({ x: 1234, y: 5678 })
    expect(toGameCoords('Unknown', 0, 0)).toEqual({ x: 0, y: 0 })
  })
})
