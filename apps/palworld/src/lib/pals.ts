import type { GameMapMeta } from '@gamemap/data-contract'
import { DATA_BASE } from './urls'

// --- enums (kept in sync with tools/palworld/encyclopedia.py) ----------------
export type Element =
  | 'Normal' | 'Fire' | 'Water' | 'Leaf' | 'Electricity'
  | 'Ice' | 'Earth' | 'Dark' | 'Dragon'
export type WorkType =
  | 'EmitFlame' | 'Watering' | 'Seeding' | 'GenerateElectricity' | 'Handcraft'
  | 'Collection' | 'Deforest' | 'Mining' | 'OilExtraction' | 'ProductMedicine'
  | 'Cool' | 'Transport' | 'MonsterFarm'

export const ELEMENTS: Element[] = [
  'Normal', 'Fire', 'Water', 'Leaf', 'Electricity', 'Ice', 'Earth', 'Dark', 'Dragon',
]
export const WORK_TYPES: WorkType[] = [
  'EmitFlame', 'Watering', 'Seeding', 'GenerateElectricity', 'Handcraft',
  'Collection', 'Deforest', 'Mining', 'OilExtraction', 'ProductMedicine',
  'Cool', 'Transport', 'MonsterFarm',
]

// --- data shapes (mirror pals.json / passives.json) --------------------------
export interface PalStats {
  hp: number; meleeAttack: number; shotAttack: number; defense: number
  craftSpeed: number; stamina: number; foodAmount: number; maxFullStomach: number
  captureRate: number; price: number; maleProbability: number
  walkSpeed: number; runSpeed: number; rideSprintSpeed: number; transportSpeed: number
}
export interface ActiveSkill {
  wazaId: string; level: number; element: string; category: string
  power: number; coolTime: number
}
/** Empty for buff-type partner skills (name still comes from the locale). */
export interface PartnerSkill { wazaId?: string; element?: string; rankValues?: number[] }
export interface Drop { item: string; rate: number; min: number; max: number }

export interface PalEntry {
  id: string
  zukanIndex: number
  zukanIndexSuffix: string
  icon: string
  elements: Element[]
  genus: string
  size: string
  rarity: number
  nocturnal: boolean
  stats: PalStats
  work: Partial<Record<WorkType, number>>
  bestWork: WorkType
  partnerSkill: PartnerSkill
  activeSkills: ActiveSkill[]
  passives: string[]
  drops: Drop[]
}

export interface PassiveEffect { type: string; value: number; target: string }
export interface Passive { id: string; rank: number; effects: PassiveEffect[] }

// --- locale shapes -----------------------------------------------------------
export interface PalText {
  name: string
  description: string
  partnerSkill?: { name: string; desc?: string }
}
export interface SkillText { name: string; description?: string }
export interface EnumsLocale {
  elements: Record<string, string>
  work: Record<string, string>
}

// --- loaders -----------------------------------------------------------------
const j = async <T>(url: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  return r.json() as Promise<T>
}

export interface PalsBundle {
  pals: PalEntry[]
  byId: Map<string, PalEntry>
  /** palId -> localized name/description/partner-skill. */
  text: Record<string, PalText>
  passives: Passive[]
  passivesById: Map<string, Passive>
  passiveText: Record<string, SkillText>
  skills: Record<string, SkillText>
  items: Record<string, string>
  enums: EnumsLocale
}

const cache = new Map<string, Promise<PalsBundle>>()

async function fetchBundle(lng: string): Promise<PalsBundle> {
  const [palsFile, passivesFile, text, passiveText, skills, items, enums] = await Promise.all([
    j<{ pals: PalEntry[] }>(`${DATA_BASE}/pals.json`),
    j<{ passives: Passive[] }>(`${DATA_BASE}/passives.json`),
    j<Record<string, PalText>>(`${DATA_BASE}/locales/${lng}/pals.json`),
    j<Record<string, SkillText>>(`${DATA_BASE}/locales/${lng}/passives.json`),
    j<Record<string, SkillText>>(`${DATA_BASE}/locales/${lng}/skills.json`),
    j<Record<string, string>>(`${DATA_BASE}/locales/${lng}/items.json`),
    j<EnumsLocale>(`${DATA_BASE}/locales/${lng}/enums.json`),
  ])
  return {
    pals: palsFile.pals,
    byId: new Map(palsFile.pals.map((p) => [p.id, p])),
    text,
    passives: passivesFile.passives,
    passivesById: new Map(passivesFile.passives.map((p) => [p.id, p])),
    passiveText,
    skills,
    items,
    enums,
  }
}

/** Load (and cache per language) the full encyclopedia dataset. */
export function loadPals(lng: string): Promise<PalsBundle> {
  let p = cache.get(lng)
  if (!p) {
    p = fetchBundle(lng)
    cache.set(lng, p)
  }
  return p
}

// --- spawn markers (for the embedded per-pal map) ---------------------------
/** A pal's spawn points on one map. `count` (>1) marks a pre-clustered point. */
export interface SpawnPoint { x: number; y: number; count?: number }
export interface PalSpawns { map: GameMapMeta; points: SpawnPoint[] }

interface SpawnMarker { subtype: string; x: number; y: number; count?: number }

/**
 * Every map on which `palId` spawns, with that pal's spawn points. Reuses the
 * per-pal markers already in `markers/<map>.json` (subtype = pal id); maps with
 * no spawns are omitted. Points are the data's pre-clustered markers rendered
 * individually (no further clustering) so each shows on the embedded map.
 */
export async function loadPalSpawns(palId: string): Promise<PalSpawns[]> {
  const { maps } = await j<{ maps: GameMapMeta[] }>(`${DATA_BASE}/maps.json`)
  const per = await Promise.all(
    maps.map(async (map) => {
      const { markers } = await j<{ markers: SpawnMarker[] }>(`${DATA_BASE}/markers/${map.id}.json`)
      const points = markers
        .filter((m) => m.subtype === palId)
        .map((m) => ({ x: m.x, y: m.y, count: m.count }))
      return { map, points }
    }),
  )
  return per.filter((p) => p.points.length > 0)
}

// Game locale text embeds pal-name placeholders like `<characterName id=|Anubis|/>`
// that the client is expected to substitute with the referenced pal's localized name.
const CHARACTER_NAME_RE = /<characterName\s+id=\|([^|]+)\|\s*\/>/g

/** Replace `<characterName id=|X|/>` placeholders with pal X's localized name. */
export function resolveCharacterNames(
  s: string | undefined,
  text: Record<string, PalText>,
): string {
  if (!s) return ''
  return s.replace(CHARACTER_NAME_RE, (_m, id: string) => text[id]?.name ?? id)
}

/** Localized name for a passive/active waza description with `{EffectValue1}`-style
 *  placeholders resolved from the passive's effect values. */
export function fillPassiveDesc(desc: string | undefined, passive: Passive | undefined): string {
  if (!desc) return ''
  if (!passive) return desc
  return desc.replace(/\{EffectValue(\d)\}/g, (_m, n: string) => {
    const eff = passive.effects[Number(n) - 1]
    return eff ? String(eff.value) : ''
  })
}
