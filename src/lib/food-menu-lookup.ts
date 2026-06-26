import { eatOutMenu, type ConvenienceItem } from '@/lib/convenience-store-menu'
import { normalizeBrandName, normalizeFoodName } from '@/lib/food-kb/normalize'
import { resolveAliasQuery, expandQueryWithAliases } from '@/lib/nutrition/alias-engine'
import { passesMenuAccessGate } from '@/lib/nutrition/menu-confidence-runtime'
import kbIndex from '../../data/food-kb/menu-lookup-index.json'

export interface MenuLookupHit {
  id: string
  name: string
  store: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  source: 'runtime_menu' | 'food_kb'
  confidence: number
}

type KbRow = (typeof kbIndex)['items'][number]

const STORE_PREFIX =
  /^(7-11|711|seven\s*eleven|全家|family\s*mart|familymart|萊爾富|hi-?life|ok\s*mart|ok超商|美廉富)\s*/i

function parseStorePrefix(query: string): { store?: string; foodName: string } {
  const trimmed = query.trim()
  const m = trimmed.match(STORE_PREFIX)
  if (!m) return { foodName: trimmed }
  const store = normalizeBrandName(m[1]!)
  const foodName = trimmed.slice(m[0].length).trim() || trimmed
  return { store, foodName }
}

function scoreNameMatch(queryNorm: string, itemName: string, store?: string): number {
  const nameNorm = normalizeFoodName(itemName)
  if (!queryNorm || !nameNorm) return 0
  const aliasHit = resolveAliasQuery(queryNorm, { store })
  if (aliasHit && normalizeFoodName(aliasHit.official_name) === nameNorm) return 98
  if (nameNorm === queryNorm) return 100
  if (nameNorm.includes(queryNorm) || queryNorm.includes(nameNorm)) return 80
  const qTokens = [...new Set(queryNorm.match(/[\u4e00-\u9fff]{2,}|[a-z0-9]{2,}/gi) ?? [])]
  if (!qTokens.length) return 0
  const hits = qTokens.filter(t => nameNorm.includes(t)).length
  if (hits === 0) return 0
  return 40 + (hits / qTokens.length) * 35
}

function rowToHit(
  row: Pick<ConvenienceItem, 'id' | 'name' | 'store' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'> & {
    confidence?: number
  },
  source: MenuLookupHit['source'],
  confidence: number
): MenuLookupHit {
  return {
    id: row.id,
    name: row.name,
    store: row.store,
    calories: row.calories,
    protein_g: row.protein_g,
    carbs_g: row.carbs_g ?? 0,
    fat_g: row.fat_g ?? 0,
    source,
    confidence,
  }
}

function searchRuntimeMenu(query: string, storeHint?: string, limit = 8): MenuLookupHit[] {
  const { store: parsedStore, foodName } = parseStorePrefix(query)
  const store = storeHint ? normalizeBrandName(storeHint) : parsedStore
  const qNorm = normalizeFoodName(foodName)

  return eatOutMenu
    .filter(item => passesMenuAccessGate(item, 'search'))
    .map(item => {
      let score = scoreNameMatch(qNorm, item.name, store)
      if (score === 0) return null
      if (store) {
        const itemStore = normalizeBrandName(item.store)
        if (itemStore === store) score += 15
        else score -= 25
      }
      return { item, score }
    })
    .filter((x): x is { item: ConvenienceItem; score: number } => x !== null && x.score >= 45)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item, score }) =>
      rowToHit(item, 'runtime_menu', Math.min(0.95, score / 100))
    )
}

function searchFoodKb(query: string, storeHint?: string, limit = 8): MenuLookupHit[] {
  const { store: parsedStore, foodName } = parseStorePrefix(query)
  const store = storeHint ? normalizeBrandName(storeHint) : parsedStore
  const qNorm = normalizeFoodName(foodName)

  return (kbIndex.items as KbRow[])
    .map(row => {
      let score = scoreNameMatch(qNorm, row.name, store)
      if (score === 0) return null
      if (store) {
        const rowStore = normalizeBrandName(row.store)
        if (rowStore === store) score += 15
        else score -= 20
      }
      score += row.confidence * 10
      return { row, score }
    })
    .filter((x): x is { row: KbRow; score: number } => x !== null && x.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) =>
      rowToHit(
        {
          id: `kb-${row.id}`,
          name: row.name,
          store: row.store,
          calories: row.calories,
          protein_g: row.protein_g,
          carbs_g: row.carbs_g,
          fat_g: row.fat_g,
        },
        'food_kb',
        Math.min(0.98, Math.max(row.confidence, score / 100))
      )
    )
}

/** Best verified hit for a free-text label — prefer food-kb over runtime when scores tie. */
export function resolveMenuFromQuery(query: string, storeHint?: string): MenuLookupHit | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const kb = searchFoodKb(trimmed, storeHint, 3)
  const runtime = searchRuntimeMenu(trimmed, storeHint, 3)
  const merged = [...kb, ...runtime].sort((a, b) => b.confidence - a.confidence)
  const best = merged[0]
  if (!best || best.confidence < 0.72) return null
  if (merged.length > 1 && merged[1]!.confidence >= best.confidence - 0.05) return null
  return best
}

export function searchFoodMenuExtended(query: string, limit = 8): MenuLookupHit[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const queries = expandQueryWithAliases(trimmed)
  const seen = new Set<string>()
  const out: MenuLookupHit[] = []
  for (const q of queries) {
    for (const hit of [...searchFoodKb(q, undefined, limit), ...searchRuntimeMenu(q, undefined, limit)]) {
      const key = `${hit.store}::${normalizeFoodName(hit.name)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(hit)
    }
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, limit)
}
