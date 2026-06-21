import type { FoodKnowledgeGraph, KbFoodItem, NutritionFacts, SourceType } from './types'
import { SOURCE_TRUST, crossValidateNutrition } from './confidence'

const PRIMARY: SourceType[] = ['official_website', 'official_pdf', 'tfda_open_data']
const SECONDARY: SourceType[] = ['blog', 'open_food_facts', 'seven-eleven', 'legacy_import', 'news']

export type StrictStatus = 'validated' | 'conflict' | 'insufficient' | 'estimated_only'

export interface StrictItemResult {
  item_id: string
  store: string
  name: string
  status: StrictStatus
  confidence: number
  source_types: string[]
  source_count: number
  calories_estimated?: number
  calories_validated?: number
  cal_delta_pct?: number
  sources: Array<{ type: string; name: string; raw_name?: string; url?: string; calories?: number }>
}

function relDiff(a: number, b: number): number {
  const d = Math.max(Math.abs(a), Math.abs(b), 1)
  return Math.abs(a - b) / d
}

export function evaluateStrictItem(
  graph: FoodKnowledgeGraph,
  item: KbFoodItem
): StrictItemResult {
  const obs = graph.observations.filter(o => o.item_id === item.id)
  const sources = obs.map(o => {
    const src = graph.sources.find(s => s.id === o.source_id)
    return {
      type: src?.source_type ?? 'other',
      name: src?.source_name ?? 'unknown',
      raw_name: o.raw_name,
      url: src?.source_url,
      calories: o.nutrition.calories,
      weight: src?.trust_weight ?? 0.4,
      nutrition: o.nutrition,
    }
  })

  const types = [...new Set(sources.map(s => s.type))]
  const hasPrimary = types.some(t => PRIMARY.includes(t as SourceType))
  const hasSecondary = types.some(t => SECONDARY.includes(t as SourceType))
  const estimatedOnly = types.length === 1 && types[0] === 'estimated'

  const estimatedObs = sources.filter(s => s.type === 'estimated')
  const primaryObs = sources.filter(s => PRIMARY.includes(s.type as SourceType))
  const secondaryObs = sources.filter(s => SECONDARY.includes(s.type as SourceType))

  const calEst = estimatedObs[0]?.calories ?? item.nutrition.calories
  const calPrimary = primaryObs.length
    ? primaryObs.reduce((s, o) => s + (o.calories ?? 0), 0) / primaryObs.length
    : undefined
  const calSecondary = secondaryObs.length
    ? secondaryObs.reduce((s, o) => s + (o.calories ?? 0), 0) / secondaryObs.length
    : undefined

  let status: StrictStatus = 'insufficient'
  let calDelta: number | undefined

  if (estimatedOnly) {
    status = 'estimated_only'
  } else if (hasPrimary && hasSecondary && calPrimary != null && calSecondary != null) {
    calDelta = relDiff(calPrimary, calSecondary)
    status = calDelta <= 0.12 ? 'validated' : calDelta <= 0.25 ? 'conflict' : 'conflict'
  } else if (hasPrimary && secondaryObs.length >= 2 && calPrimary != null) {
    const secAvg = calSecondary!
    calDelta = relDiff(calPrimary, secAvg)
    status = calDelta <= 0.15 ? 'validated' : 'conflict'
  } else if (primaryObs.length >= 2 && calPrimary != null) {
    const cals = primaryObs.map(o => o.calories!).filter(Boolean)
    const spread = Math.max(...cals.map((a, i) => Math.max(...cals.slice(i + 1).map(b => relDiff(a, b)))))
    calDelta = spread
    status = spread <= 0.1 ? 'validated' : 'conflict'
  } else if (!hasPrimary && secondaryObs.length >= 2 && calSecondary != null) {
    const cals = secondaryObs.map(o => o.calories!).filter(Boolean)
    const spread = Math.max(...cals.map((a, i) => Math.max(...cals.slice(i + 1).map(b => relDiff(a, b)))))
    calDelta = spread
    status = spread <= 0.1 ? 'validated' : 'conflict'
  } else if (hasPrimary && !hasSecondary) {
    status = 'insufficient'
  }

  if (calEst != null && item.nutrition.calories != null && status === 'validated') {
    const validatedCal = calPrimary ?? calSecondary ?? item.nutrition.calories!
    calDelta = relDiff(calEst, validatedCal)
    if (calDelta > 0.2) status = 'conflict'
  }

  return {
    item_id: item.id,
    store: item.store_name,
    name: item.name_zh,
    status,
    confidence: item.confidence,
    source_types: types,
    source_count: sources.length,
    calories_estimated: calEst,
    calories_validated: calPrimary ?? calSecondary ?? item.nutrition.calories,
    cal_delta_pct: calDelta != null ? Math.round(calDelta * 1000) / 10 : undefined,
    sources: sources.map(s => ({
      type: s.type,
      name: s.name,
      raw_name: s.raw_name,
      url: s.url,
      calories: s.calories,
    })),
  }
}

export function runStrictValidation(graph: FoodKnowledgeGraph): {
  results: StrictItemResult[]
  validated: StrictItemResult[]
  conflicts: StrictItemResult[]
  insufficient: StrictItemResult[]
  estimated_only: StrictItemResult[]
} {
  const results = graph.items.map(item => evaluateStrictItem(graph, item))
  return {
    results,
    validated: results.filter(r => r.status === 'validated'),
    conflicts: results.filter(r => r.status === 'conflict'),
    insufficient: results.filter(r => r.status === 'insufficient'),
    estimated_only: results.filter(r => r.status === 'estimated_only'),
  }
}

/** 嚴格通過品項 → 以交叉驗證後營養覆寫 */
export function validatedNutritionForItem(
  graph: FoodKnowledgeGraph,
  item: KbFoodItem
): NutritionFacts | null {
  const result = evaluateStrictItem(graph, item)
  if (result.status !== 'validated') return null

  const obs = graph.observations
    .filter(o => o.item_id === item.id)
    .map(o => {
      const src = graph.sources.find(s => s.id === o.source_id)!
      return { nutrition: o.nutrition, weight: src.trust_weight }
    })
    .filter(o => o.weight > 0)

  if (!obs.length) return null
  return crossValidateNutrition(obs).nutrition
}
