import { DATA_BASE } from './urls'

export type Gender = 'M' | 'F'

export interface BreedingPal {
  id: string
  zukanIndex: number
  zukanIndexSuffix: string
  icon: string
  /** CombiRank (breeding power); lower = rarer. */
  rank: number
  /** Internal row order — the rank-average tie-break prefers the lower index. */
  idx: number
  /** Eligible as a rank-average child (not a combo-only child, not a legendary). */
  breedChild: boolean
  /** Legendary (self-bred only) — flagged for distinct styling. */
  legendary?: boolean
}

/** A + B = C. `ag`/`bg` mark a gender-specific parent (only two combos have them). */
export interface Combo {
  a: string
  b: string
  c: string
  ag?: Gender
  bg?: Gender
  /** True when this is a hand-authored unique combo (not a rank-average result). */
  unique?: boolean
}

export interface BreedingData {
  pals: BreedingPal[]
  combos: Combo[]
}

/** palId -> localized display name for the current language. */
export type NameMap = Record<string, string>

const j = async <T>(url: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  return r.json() as Promise<T>
}

export async function loadBreeding(lng: string): Promise<{ data: BreedingData; names: NameMap }> {
  const [data, names] = await Promise.all([
    j<BreedingData>(`${DATA_BASE}/breeding.json`),
    j<NameMap>(`${DATA_BASE}/locales/${lng}/breeding.json`),
  ])
  return { data, names }
}

export { palIconUrl } from './assets'

export const comboKey = (f: Combo): string => `${f.a}|${f.b}|${f.c}|${f.ag ?? ''}|${f.bg ?? ''}`

/**
 * Order-independent identity for favouriting: A+B=C and B+A=C are the same
 * recipe. Gender travels with its parent, so the two gender-specific combos
 * (Katress♂×Wixen♀ vs Katress♀×Wixen♂) stay distinct — the one special case.
 */
export const favKey = (f: Combo): string => {
  const pa = `${f.a}:${f.ag ?? ''}`
  const pb = `${f.b}:${f.bg ?? ''}`
  const [lo, hi] = pa <= pb ? [pa, pb] : [pb, pa]
  return `${lo}|${hi}=${f.c}`
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/**
 * Reorder a recipe so the fixed parent sits in the chosen slot (breeding is
 * order-independent, but the display should keep the parent the user picked on
 * its side). Genders travel with their parent when swapped.
 */
function orient(f: Combo, fixedId: string, slot: 'a' | 'b'): Combo {
  if (f.a === f.b) return f
  const needSwap = slot === 'a' ? f.a !== fixedId : f.b !== fixedId
  return needSwap ? { ...f, a: f.b, b: f.a, ag: f.bg, bg: f.ag } : f
}

/**
 * Breeding resolver mirroring the game (per tylercamp/palcalc):
 *   1. same species  -> that species
 *   2. unique combo  -> its child (order-independent; two rows are gender-specific)
 *   3. rank-average  -> childRank = floor((rankA + rankB + 1) / 2); the eligible Pal
 *      with the nearest CombiRank, ties broken by lower internal index.
 * Fallback candidates exclude combo-only children and legendaries (`breedChild`),
 * so you can never breed something rarer than your rarest parent.
 */
export interface BreedingEngine {
  childOf: (aId: string, bId: string) => Combo[]
}

export function makeEngine(data: BreedingData): BreedingEngine {
  const byId = new Map(data.pals.map((p) => [p.id, p]))
  const comboIndex = new Map<string, Combo[]>()
  for (const c of data.combos) {
    const k = pairKey(c.a, c.b)
    const list = comboIndex.get(k)
    if (list) list.push(c)
    else comboIndex.set(k, [c])
  }
  const pool = data.pals.filter((p) => p.breedChild)
  // A recipe is "unique" only when it's a hand-authored combo with two *different*
  // parents — a same-species self-pairing (A+A=A) is never unique, even if the
  // unique table redundantly lists it.
  const uniqueKeys = new Set(data.combos.filter((c) => c.a !== c.b).map(comboKey))
  const tag = (f: Combo): Combo => (f.a !== f.b && uniqueKeys.has(comboKey(f)) ? { ...f, unique: true } : f)

  const childOf = (aId: string, bId: string): Combo[] => {
    let out: Combo[]
    if (aId === bId) {
      out = [{ a: aId, b: bId, c: aId }]
    } else {
      const combo = comboIndex.get(pairKey(aId, bId))
      if (combo) {
        out = combo
      } else {
        const a = byId.get(aId)
        const b = byId.get(bId)
        if (!a || !b) return []
        const target = Math.floor((a.rank + b.rank + 1) / 2)
        let best: BreedingPal | null = null
        let bestDist = Infinity
        for (const p of pool) {
          const d = Math.abs(p.rank - target)
          if (d < bestDist || (d === bestDist && best !== null && p.idx < best.idx)) {
            bestDist = d
            best = p
          }
        }
        out = best ? [{ a: aId, b: bId, c: best.id }] : []
      }
    }
    return out.map(tag)
  }

  return { childOf }
}

export interface Selection {
  a: string | null
  b: string | null
  c: string | null
}

/**
 * The recipe list for the current selection:
 *  - both parents  -> the resulting child (1, or 2 for the gendered combo)
 *  - one parent    -> that parent paired with every Pal
 *  - child only    -> every parent pair that yields it
 *  - nothing       -> the special (unique) combos, browsable
 * `total` is the full match count; the caller may render a capped slice.
 */
export function queryFormulas(
  engine: BreedingEngine,
  data: BreedingData,
  sel: Selection,
): { list: Combo[]; total: number; browsingSpecial: boolean } {
  const { a, b, c } = sel

  const seen = new Set<string>()
  const out: Combo[] = []
  const add = (f: Combo) => {
    const k = comboKey(f)
    if (seen.has(k)) return
    seen.add(k)
    out.push(f)
  }
  const push = (x: string, y: string) => {
    for (const raw of engine.childOf(x, y)) {
      if (c && raw.c !== c) continue
      // Keep the fixed parent on its own side (A first when A is set, else B).
      const f = a ? orient(raw, a, 'a') : b ? orient(raw, b, 'b') : raw
      add(f)
    }
  }

  let browsingSpecial = false
  if (a && b) {
    push(a, b)
  } else if (a || b) {
    const one = (a ?? b)!
    for (const p of data.pals) push(one, p.id)
  } else if (c) {
    // child only: scan every unordered pair.
    const pals = data.pals
    for (let i = 0; i < pals.length; i++) {
      for (let k = i; k < pals.length; k++) push(pals[i].id, pals[k].id)
    }
  } else {
    // Nothing selected: show only the hand-authored unique recipes (excluding
    // redundant same-species self-pairings).
    browsingSpecial = true
    for (const combo of data.combos) {
      if (combo.a !== combo.b) add({ ...combo, unique: true })
    }
  }

  const rank = new Map(data.pals.map((p, i) => [p.id, i]))
  const r = (id: string) => rank.get(id) ?? Number.MAX_SAFE_INTEGER
  out.sort((x, y) => r(x.c) - r(y.c) || r(x.a) - r(y.a) || r(x.b) - r(y.b))
  return { list: out, total: out.length, browsingSpecial }
}
