import { describe, it, expect } from 'vitest'

import { toGameCoords } from './coords'

describe('toGameCoords', () => {
  it('maps MainWorld tower pixels to their published in-game coords', () => {
    // Verified reference points (tower entrances): our marker pixels vs the
    // in-game coordinates published by community guides. Rounded values must
    // land within eyeball tolerance of the guides (the guides eyeball too).
    const cases: [number, number, number, number][] = [
      // px,   py,     gx,    gy
      [1647, 6997, -1294, -1669], // Feybreak Tower
      [6397, 1807, 561, 334], // PIDF Tower
      [3446, 4055, -587, -517], // Eternal Pyre Tower
      [5295, 3772, 113, -431], // Rayne Syndicate Tower
    ]
    for (const [px, py, gx, gy] of cases) {
      const g = toGameCoords('MainWorld', px, py)
      expect(Math.abs(Math.round(g.x) - gx)).toBeLessThanOrEqual(20)
      expect(Math.abs(Math.round(g.y) - gy)).toBeLessThanOrEqual(20)
    }
  })

  it('centers roughly on the origin (landscape midpoint)', () => {
    // Center pixel of the 8192 grid ≈ the map's coordinate origin region.
    const g = toGameCoords('MainWorld', 4096, 4096)
    expect(Math.abs(g.x)).toBeLessThan(600)
    expect(Math.abs(g.y)).toBeLessThan(600)
  })

  it('is identity for maps without a transform (e.g. WorldTree)', () => {
    expect(toGameCoords('WorldTree', 1234, 5678)).toEqual({ x: 1234, y: 5678 })
    expect(toGameCoords('Unknown', 0, 0)).toEqual({ x: 0, y: 0 })
  })
})
