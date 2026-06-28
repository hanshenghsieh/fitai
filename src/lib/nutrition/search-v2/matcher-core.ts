/** Client-safe candidate collection — no ONR / fs */
import { resolveMenuFromQuery, searchFoodMenuExtended, type MenuLookupHit } from '@/lib/food-menu-lookup'
import {
  FOOD_DNA_TEMPLATES,
  getFoodDNATemplate,
  resolveTemplateIdFromLabel,
} from '@/lib/nutrition/food-dna-catalog'
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
import { isClearlyUnknownQuery } from '@/lib/nutrition/search-v2/query-patterns'

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

function foodDnaCandidateFromTemplateId(templateId: string, matchScore: number): SearchV2Candidate | null {
  const t = getFoodDNATemplate(templateId)
  if (!t) return null
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
    nutrition_confidence: 'B' as const,
    nutrition_source: 'Food DNA 餐型參考',
    source_tier: 'food_dna' as SearchSourceTier,
    match_score: matchScore,
    explanation: `依餐型參考估算：${t.canonical_food_name}（選取後請確認）`,
  }
}

function templateIdsFromLabel(label: string): string[] {
  const ids = new Set<string>()
  const root = resolveTemplateIdFromLabel(label)
  if (root) ids.add(root)
  for (const part of label.split(/[+＋、,，]/).map(s => s.trim()).filter(Boolean)) {
    const tid = resolveTemplateIdFromLabel(part)
    if (tid) ids.add(tid)
  }
  return [...ids]
}

function searchFoodDnaCandidates(query: string): SearchV2Candidate[] {
  const out: SearchV2Candidate[] = []
  const seen = new Set<string>()

  for (const templateId of templateIdsFromLabel(query)) {
    const hit = foodDnaCandidateFromTemplateId(templateId, 82)
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id)
      out.push(hit)
    }
  }

  const q = normalizeFoodName(query)
  for (const t of Object.values(FOOD_DNA_TEMPLATES)) {
    const n = normalizeFoodName(t.canonical_food_name)
    let score = 0
    if (n === q) score = 90
    else if (n.includes(q) || q.includes(n)) score = 65
    if (!score) continue
    const hit = foodDnaCandidateFromTemplateId(t.template_id, score)
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id)
      out.push(hit)
    }
  }

  return out
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

export function collectClientCandidates(query: string, ctx?: SearchV2Context): SearchV2Candidate[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const seen = new Set<string>()
  const merged: SearchV2Candidate[] = []
  for (const c of rankSearchCandidates([
    ...runtimeCandidates(trimmed),
    ...searchFoodDnaCandidates(trimmed),
    ...contextCandidates(ctx),
  ])) {
    const key = `${c.store ?? ''}::${normalizeFoodName(c.name)}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(c)
  }
  return merged
}

export function classifyClientMatchLevel(
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

  if (exact && exact.confidence >= LEVEL_A_THRESHOLD && exact.source === 'food_kb' && !second) {
    return { level: 'A', best, ambiguous: false }
  }
  if (exact && exact.confidence >= LEVEL_A_THRESHOLD && exact.source === 'food_kb') {
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

export { isClearlyUnknownQuery }
