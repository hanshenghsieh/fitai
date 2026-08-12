import { eatOutMenu, type ConvenienceItem } from '@/lib/convenience-store-menu'
import { normalizeBrandName, normalizeFoodName, isKnownDishCategoryToken } from '@/lib/food-kb/normalize'
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

/**
 * Below this coverage ratio (shorter length / longer length of the two
 * normalized names), a substring-containment match is treated as weak
 * evidence rather than a confident match. Without this guard, a short name
 * that merely happens to be a prefix/substring of an unrelated, much larger
 * dish's name (e.g. "\u96de\u8089\u98ef" inside "\u96de\u8089\u98ef\u5fa1\u98ef\u7cf0" \u2014 a ~180kcal onigiri vs a
 * ~500kcal breakfast-shop rice plate that share no real relationship) scored
 * the same flat 80 as two names that are nearly identical.
 */
const SUBSTRING_COVERAGE_THRESHOLD = 0.8

/**
 * Proportional score for a substring-containment match whose coverage ratio
 * falls below SUBSTRING_COVERAGE_THRESHOLD. Deliberately kept well below the
 * exact/alias tiers (98-100) and the full substring tier (80), and computed
 * directly from length ratio rather than the CJK token-overlap fallback
 * below (which degrades to all-or-nothing for short, single-token queries).
 */
export function substringCoverageScore(shorterLen: number, longerLen: number): number {
  if (longerLen <= 0) return 0
  const ratio = shorterLen / longerLen
  return Math.round(30 + ratio * 40)
}

export function scoreNameMatch(queryNorm: string, itemName: string, store?: string): number {
  const nameNorm = normalizeFoodName(itemName)
  if (!queryNorm || !nameNorm) return 0
  const aliasHit = resolveAliasQuery(queryNorm, { store })
  if (aliasHit && normalizeFoodName(aliasHit.official_name) === nameNorm) return 98
  if (nameNorm === queryNorm) return 100
  if (nameNorm.includes(queryNorm) || queryNorm.includes(nameNorm)) {
    const shorter = Math.min(nameNorm.length, queryNorm.length)
    const longer = Math.max(nameNorm.length, queryNorm.length)
    if (shorter / longer >= SUBSTRING_COVERAGE_THRESHOLD) return 80
    // Short name is only a small fraction of the longer one \u2014 don't grant
    // full substring-match confidence (see SUBSTRING_COVERAGE_THRESHOLD).
    const base = substringCoverageScore(shorter, longer)
    // Exception: the query is a *known dish category* (e.g. "\u98ef\u5718") and a
    // genuine *prefix* of the item name (e.g. "\u98ef\u5718\u6885\u5b50\u7d2b\u8607" \u2014 a flavor
    // variant of the same base dish). This is the mirror case of the bug
    // SUBSTRING_COVERAGE_THRESHOLD itself was built to prevent ("\u96de\u8089\u98ef"
    // matching the unrelated "\u96de\u8089\u98ef\u5fa1\u98ef\u7cf0"): there the *query* "\u96de\u8089\u98ef" is
    // NOT a recognized category on its own, so it correctly stays low. Here
    // the query genuinely names the dish category and the remainder is just
    // a flavor modifier, so a small floor lets it clear the search filters
    // as a Level B "pick a variant" candidate \u2014 never Level A (kept well
    // below 80).
    if (nameNorm.startsWith(queryNorm) && isKnownDishCategoryToken(queryNorm)) {
      return Math.max(base, 58)
    }
    return base
  }
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

/**
 * Below this raw name-match score, the evidence that this row is even the
 * right FOOD is too weak for the row's own data-quality confidence
 * (row.confidence) to be allowed to boost it — see rowToHit below. Set to
 * the same score this function's own admission filter already requires
 * (`.filter(x => x.score >= 50)` below, before the row.confidence addend) —
 * i.e. a row must already be admissible on name-match evidence alone
 * before its data-quality score gets to boost it further. Calibrated
 * against two real cases: "711竹筍排骨湯" -> "膳馨綠竹筍排骨湯" (nameScore 55,
 * a legitimate partial match that must still reach high confidence) vs.
 * "地瓜" -> "小菜籃有機地瓜葉" (nameScore 41, a false match that must not).
 */
const RELIABLE_NAME_MATCH_FLOOR = 50

function searchFoodKb(query: string, storeHint?: string, limit = 8): MenuLookupHit[] {
  const { store: parsedStore, foodName } = parseStorePrefix(query)
  const store = storeHint ? normalizeBrandName(storeHint) : parsedStore
  const qNorm = normalizeFoodName(foodName)

  return (kbIndex.items as KbRow[])
    .map(row => {
      const nameScore = scoreNameMatch(qNorm, row.name, store)
      if (nameScore === 0) return null
      let score = nameScore
      if (store) {
        const rowStore = normalizeBrandName(row.store)
        if (rowStore === store) score += 15
        else score -= 20
      }
      score += row.confidence * 10
      return { row, score, nameScore }
    })
    .filter((x): x is { row: KbRow; score: number; nameScore: number } => x !== null && x.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score, nameScore }) =>
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
        // row.confidence (a data-quality score for this row's nutrition
        // numbers) may only boost the final confidence when the *name*
        // match is already reasonably reliable on its own
        // (nameScore >= RELIABLE_NAME_MATCH_FLOOR, e.g. "711竹筍排骨湯" ->
        // "膳馨綠竹筍排骨湯" at nameScore 80) — it must never rescue a weak
        // match into false confidence (e.g. "地瓜" matching the unrelated
        // "小菜籃有機地瓜葉" at nameScore 41, previously reported as 95%
        // confident purely because that row's own data happened to be
        // well-sourced).
        nameScore >= RELIABLE_NAME_MATCH_FLOOR
          ? Math.min(0.98, Math.max(row.confidence, score / 100))
          : Math.min(0.98, score / 100)
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
