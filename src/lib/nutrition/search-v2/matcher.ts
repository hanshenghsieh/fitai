import { resolveMenuFromQuery, searchFoodMenuExtended, type MenuLookupHit } from '@/lib/food-menu-lookup'
import { FOOD_DNA_TEMPLATES } from '@/lib/nutrition/food-dna-catalog'
import { normalizeFoodName } from '@/lib/food-kb/normalize'
import type {
  NutritionMacros,
  SearchMatchLevel,
  SearchSourceTier,
  SearchV2Candidate,
  SearchV2Context,
} from '@/lib/nutrition/search-v2/types'
import { NULL_MACROS } from '@/lib/nutrition/search-v2/types'
import { rankSearchCandidates } from '@/lib/nutrition/search-v2/search-ranking'

const LEVEL_A_THRESHOLD = 0.92
const LEVEL_B_MIN = 0.55
const AMBIGUITY_GAP = 0.06

function hitToMacros(hit: MenuLookupHit): NutritionMacros {
  return {
    calories: hit.calories,
    protein: hit.protein_g,
    fat: hit.fat_g ?? null,
    carbs: hit.carbs_g ?? null,
    fiber: null,
    sugar: null,
    sodium: null,
  }
}

function onrToCandidate(
  store: string,
  item: {
    name: string
    calories: number
    protein: number
    fat: number
    carbs: number
    fiber?: number | null
    sugar?: number | null
    sodium?: number | null
    source_url: string
  },
  score: number
): SearchV2Candidate {
  return {
    id: `onr-${normalizeFoodName(store)}-${normalizeFoodName(item.name)}`,
    name: item.name,
    store,
    macros: {
      calories: item.calories,
      protein: item.protein,
      fat: item.fat,
      carbs: item.carbs,
      fiber: item.fiber ?? null,
      sugar: item.sugar ?? null,
      sodium: item.sodium ?? null,
    },
    nutrition_status: 'official',
    nutrition_confidence: 'A',
    nutrition_source: 'Official Nutrition Reference',
    source_tier: 'onr',
    match_score: score,
    explanation: `ONR 官方營養：${item.name}（${item.source_url}）`,
  }
}

function searchOnrCandidates(query: string, limit = 6): SearchV2Candidate[] {
  if (typeof window !== 'undefined') return []
  const q = normalizeFoodName(query)
  if (!q) return []
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { loadAllOfficialReferences } = require('@/lib/nutrition/official-reference/loader') as typeof import('@/lib/nutrition/official-reference/loader')
  const refs = loadAllOfficialReferences()
  const out: SearchV2Candidate[] = []

  for (const brand of refs) {
    const store = brand.metadata.canonical_name
    for (const item of brand.menu) {
      const names = [item.name, ...(item.aliases ?? [])]
      let best = 0
      for (const n of names) {
        const nn = normalizeFoodName(n)
        if (nn === q) best = Math.max(best, 100)
        else if (nn.includes(q) || q.includes(nn)) best = Math.max(best, 75)
        else {
          const tokens = q.match(/[\u4e00-\u9fff]{2,}/g) ?? []
          const hits = tokens.filter(t => nn.includes(t)).length
          if (hits) best = Math.max(best, 40 + (hits / Math.max(tokens.length, 1)) * 35)
        }
      }
      if (best >= 50) out.push(onrToCandidate(store, item, best))
    }
  }

  return out.sort((a, b) => b.match_score - a.match_score).slice(0, limit)
}

function searchFoodDnaCandidates(query: string): SearchV2Candidate[] {
  const q = normalizeFoodName(query)
  return Object.values(FOOD_DNA_TEMPLATES)
    .map(t => {
      const n = normalizeFoodName(t.canonical_food_name)
      let score = 0
      if (n === q) score = 90
      else if (n.includes(q) || q.includes(n)) score = 65
      if (!score) return null
      return {
        id: `dna-${t.template_id}`,
        name: t.canonical_food_name,
        macros: {
          calories: t.kcal,
          protein: t.protein_g,
          fat: t.fat_g,
          carbs: t.carbs_g,
          fiber: t.fiber_g ?? null,
          sugar: null,
          sodium: t.sodium_mg ?? null,
        },
        nutrition_status: 'official' as const,
        nutrition_confidence: 'A' as const,
        nutrition_source: 'Food DNA Template',
        source_tier: 'food_dna' as SearchSourceTier,
        match_score: score,
        explanation: `Food DNA 模板：${t.canonical_food_name}`,
      } satisfies SearchV2Candidate
    })
    .filter((x): x is SearchV2Candidate => x !== null)
}

function contextCandidates(ctx: SearchV2Context | undefined): SearchV2Candidate[] {
  const out: SearchV2Candidate[] = []
  for (const f of ctx?.recentFoods ?? []) {
    out.push({
      id: f.id,
      name: f.name,
      store: f.store,
      macros: NULL_MACROS,
      nutrition_status: 'unknown',
      nutrition_confidence: 'Unknown',
      nutrition_source: 'Recent Foods',
      source_tier: 'recent',
      match_score: 30,
      explanation: '最近吃過（需重新選官方品項才有營養）',
    })
  }
  for (const f of ctx?.favorites ?? []) {
    out.push({
      id: f.id,
      name: f.name,
      store: f.store,
      macros: NULL_MACROS,
      nutrition_status: 'unknown',
      nutrition_confidence: 'Unknown',
      nutrition_source: 'Favorites',
      source_tier: 'favorite',
      match_score: 25,
      explanation: '常吃清單（需重新選官方品項才有營養）',
    })
  }
  return out
}

function runtimeCandidates(query: string, limit = 8): SearchV2Candidate[] {
  return searchFoodMenuExtended(query, limit).map(hit => ({
    id: hit.id,
    name: hit.name,
    store: hit.store,
    macros: hitToMacros(hit),
    nutrition_status: 'official' as const,
    nutrition_confidence: (hit.confidence >= LEVEL_A_THRESHOLD ? 'A' : 'B') as 'A' | 'B',
    nutrition_source: hit.source === 'food_kb' ? 'Official Nutrition Reference' : 'Runtime Menu',
    source_tier: (hit.source === 'food_kb' ? 'official' : 'onr') as SearchSourceTier,
    match_score: Math.round(hit.confidence * 100),
    explanation:
      hit.source === 'food_kb'
        ? `food-kb 官方匹配：${hit.name}（${hit.store}）`
        : `Runtime menu：${hit.name}（${hit.store}）`,
  }))
}

export function collectAllCandidates(query: string, ctx?: SearchV2Context): SearchV2Candidate[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const runtime = runtimeCandidates(trimmed)
  const onr = searchOnrCandidates(trimmed)
  const dna = searchFoodDnaCandidates(trimmed)
  const recentFav = contextCandidates(ctx)

  const seen = new Set<string>()
  const merged: SearchV2Candidate[] = []
  for (const c of rankSearchCandidates([...runtime, ...onr, ...dna, ...recentFav])) {
    const key = `${c.store ?? ''}::${normalizeFoodName(c.name)}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(c)
  }
  return merged
}

export function classifyMatchLevel(
  query: string,
  candidates: SearchV2Candidate[]
): { level: SearchMatchLevel; best: SearchV2Candidate | null; ambiguous: boolean } {
  const withNutrition = candidates.filter(c => c.nutrition_status === 'official')
  if (!withNutrition.length) {
    return { level: 'C', best: null, ambiguous: false }
  }

  const best = withNutrition[0]!
  const second = withNutrition[1]
  const exact = resolveMenuFromQuery(query)
  const exactOnr =
    typeof window === 'undefined'
      ? (() => {
          if (!exact?.store) return false
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { findOfficialMenuItem } = require('@/lib/nutrition/official-reference/loader') as typeof import('@/lib/nutrition/official-reference/loader')
          return Boolean(findOfficialMenuItem(exact.store, exact.name))
        })()
      : exact?.source === 'food_kb' && exact.confidence >= LEVEL_A_THRESHOLD

  if (exact && exact.confidence >= LEVEL_A_THRESHOLD && !second) {
    return { level: 'A', best, ambiguous: false }
  }
  if (exact && exact.confidence >= LEVEL_A_THRESHOLD && exactOnr) {
    return { level: 'A', best, ambiguous: false }
  }

  const gap = second ? best.match_score - second.match_score : 100
  if (best.match_score >= Math.round(LEVEL_A_THRESHOLD * 100) && gap > 8) {
    return { level: 'A', best, ambiguous: false }
  }

  if (best.match_score >= Math.round(LEVEL_B_MIN * 100)) {
    const ambiguous =
      Boolean(second && second.match_score >= best.match_score - Math.round(AMBIGUITY_GAP * 100))
    return { level: 'B', best, ambiguous }
  }

  return { level: 'C', best: null, ambiguous: false }
}

export { isClearlyUnknownQuery } from '@/lib/nutrition/search-v2/query-patterns'
