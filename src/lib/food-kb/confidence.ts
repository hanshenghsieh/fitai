import type { NutritionFacts, RawFoodObservation, SourceType } from './types'

/** Base trust per source type — never trust one source alone */
export const SOURCE_TRUST: Record<SourceType, number> = {
  official_website: 0.95,
  official_pdf: 0.9,
  tfda_open_data: 0.92,
  open_food_facts: 0.85,
  google_maps: 0.7,
  google_reviews: 0.55,
  ubereats: 0.75,
  foodpanda: 0.75,
  openrice: 0.7,
  ifoodie: 0.68,
  dcard: 0.5,
  ptt: 0.48,
  reddit: 0.45,
  blog: 0.6,
  instagram: 0.55,
  facebook: 0.5,
  news: 0.65,
  menu_ocr: 0.55,
  user_photo: 0.5,
  community: 0.45,
  legacy_import: 0.65,
  estimated: 0.35,
  other: 0.4,
}

const NUTRITION_FIELDS: (keyof NutritionFacts)[] = [
  'calories', 'protein_g', 'fat_g', 'carbs_g', 'sugar_g', 'fiber_g',
]

function relDiff(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1)
  return Math.abs(a - b) / denom
}

export function scoreObservation(obs: RawFoodObservation): number {
  let score = SOURCE_TRUST[obs.source_type] ?? 0.4
  const n = obs.nutrition
  const filled = NUTRITION_FIELDS.filter(f => n[f] != null && n[f]! > 0).length
  score += filled * 0.02
  if (obs.source_url) score += 0.03
  if (obs.image_urls?.length) score += 0.02
  if (obs.ingredients) score += 0.03
  return Math.min(1, Math.round(score * 1000) / 1000)
}

export interface CrossValidationResult {
  confidence: number
  nutrition: NutritionFacts
  agreeing_sources: number
  conflict_penalty: number
}

export function crossValidateNutrition(
  observations: Array<{ nutrition: NutritionFacts; weight: number }>
): CrossValidationResult {
  if (!observations.length) {
    return { confidence: 0, nutrition: {}, agreeing_sources: 0, conflict_penalty: 0 }
  }

  const result: NutritionFacts = {}
  let totalWeight = 0
  let agreeing = 0
  let conflictPenalty = 0

  for (const field of NUTRITION_FIELDS) {
    const vals = observations
      .filter(o => o.nutrition[field] != null)
      .map(o => ({ v: o.nutrition[field] as number, w: o.weight }))

    if (!vals.length) continue

    const weighted = vals.reduce((s, x) => s + x.v * x.w, 0) / vals.reduce((s, x) => s + x.w, 0)
    result[field] = Math.round(weighted * 100) / 100

    if (vals.length >= 2) {
      const maxDiff = Math.max(...vals.map((a, i) =>
        Math.max(...vals.slice(i + 1).map(b => relDiff(a.v, b.v)))
      ))
      if (maxDiff <= 0.1) agreeing++
      else if (maxDiff > 0.25) conflictPenalty += 0.1
    }
  }

  const baseConf = observations.reduce((s, o) => s + o.weight, 0) / observations.length
  const agreementBonus = agreeing * 0.05
  const confidence = Math.max(
    0.1,
    Math.min(1, baseConf + agreementBonus - conflictPenalty)
  )

  return {
    confidence: Math.round(confidence * 1000) / 1000,
    nutrition: result,
    agreeing_sources: agreeing,
    conflict_penalty: conflictPenalty,
  }
}

export function needsMoreSources(confidence: number, sourceCount: number): boolean {
  return confidence < 0.6 || sourceCount < 2
}

export function isLowConfidence(confidence: number): boolean {
  return confidence < 0.5
}
