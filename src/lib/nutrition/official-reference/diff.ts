import type {
  MacroSnapshot,
  NutritionCompareSource,
  NutritionDiffResult,
  NutritionDiffThresholds,
  OfficialMenuItem,
} from './types'

export const DEFAULT_DIFF_THRESHOLDS: NutritionDiffThresholds = {
  calories_pct: 0.1,
  protein_g: 5,
  fat_g: 3,
  carbs_g: 5,
}

export function toMacroSnapshot(input: {
  calories: number
  protein?: number
  protein_g?: number
  fat?: number
  fat_g?: number
  carbs?: number
  carbs_g?: number
  fiber?: number | null
  fiber_g?: number | null
  sugar?: number | null
  sugar_g?: number | null
  sodium?: number | null
  sodium_mg?: number | null
}): MacroSnapshot {
  return {
    calories: input.calories,
    protein: input.protein ?? input.protein_g ?? 0,
    fat: input.fat ?? input.fat_g ?? 0,
    carbs: input.carbs ?? input.carbs_g ?? 0,
    fiber: input.fiber ?? input.fiber_g ?? null,
    sugar: input.sugar ?? input.sugar_g ?? null,
    sodium: input.sodium ?? input.sodium_mg ?? null,
  }
}

export function officialItemToSnapshot(item: OfficialMenuItem): MacroSnapshot {
  return toMacroSnapshot(item)
}

function pctDelta(official: number, compare: number): number {
  if (official === 0) return compare === 0 ? 0 : 1
  return Math.abs(compare - official) / official
}

export function compareNutritionToOfficial(
  official: MacroSnapshot,
  compare: MacroSnapshot,
  input: {
    item_name: string
    brand: string
    compare_source: NutritionCompareSource
    thresholds?: NutritionDiffThresholds
  }
): NutritionDiffResult {
  const t = input.thresholds ?? DEFAULT_DIFF_THRESHOLDS
  const field_diffs: NutritionDiffResult['field_diffs'] = []
  const reasons: string[] = []

  const checks: Array<{
    field: 'calories' | 'protein' | 'fat' | 'carbs'
    threshold: number
    isPct: boolean
  }> = [
    { field: 'calories', threshold: t.calories_pct, isPct: true },
    { field: 'protein', threshold: t.protein_g, isPct: false },
    { field: 'fat', threshold: t.fat_g, isPct: false },
    { field: 'carbs', threshold: t.carbs_g, isPct: false },
  ]

  for (const c of checks) {
    const o = official[c.field]
    const v = compare[c.field]
    const delta = Math.abs(v - o)
    const exceeds = c.isPct ? pctDelta(o, v) > c.threshold : delta > c.threshold
    field_diffs.push({
      field: c.field,
      official: o,
      compare: v,
      delta,
      exceeds_threshold: exceeds,
    })
    if (exceeds) {
      reasons.push(
        c.isPct
          ? `${c.field} delta ${(pctDelta(o, v) * 100).toFixed(1)}% > ${c.threshold * 100}%`
          : `${c.field} delta ${delta.toFixed(1)}g > ${c.threshold}g`
      )
    }
  }

  return {
    item_name: input.item_name,
    brand: input.brand,
    official,
    compare_source: input.compare_source,
    compare,
    field_diffs,
    pending_review: reasons.length > 0,
    reasons,
  }
}

export function diffBlocksPromote(result: NutritionDiffResult): boolean {
  return result.pending_review
}
