/**
 * P0 photo-portion fix — Step 5 sanity check.
 *
 * Purpose is narrow on purpose: catch results that are internally
 * inconsistent (macros don't add up to the stated total), not to "correct"
 * or inflate anything. This never changes a stored number — it only flags
 * one for a human to look at. A flagged result is still saved exactly as
 * calculated; the flag is observability, not a gate.
 */
export interface NutritionSanityWarning {
  code: string
  message: string
}

export interface NutritionTotals {
  calories: number
  protein: number
  fat: number
  carbs: number
}

/** Relative tolerance for small meals; absolute floor so a 50 kcal snack doesn't trip on rounding alone. */
const MACRO_CALORIE_RELATIVE_TOLERANCE = 0.25
const MACRO_CALORIE_ABSOLUTE_TOLERANCE_KCAL = 50

/**
 * protein*4 + carbs*4 + fat*9 should roughly equal the stated total calories.
 * A large gap usually means one of the two numbers came from a different
 * source than the other (e.g. a partial-match sum where some segments
 * contributed macros but not calories, or vice versa).
 */
export function checkMacroCalorieConsistency(totals: NutritionTotals): NutritionSanityWarning[] {
  const macroCalories = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9
  const diff = Math.abs(totals.calories - macroCalories)
  const tolerance = Math.max(
    MACRO_CALORIE_ABSOLUTE_TOLERANCE_KCAL,
    totals.calories * MACRO_CALORIE_RELATIVE_TOLERANCE
  )
  if (diff > tolerance) {
    return [
      {
        code: 'macro_calorie_mismatch',
        message: `總熱量 (${Math.round(totals.calories)} kcal) 與 macros 換算熱量 (${Math.round(macroCalories)} kcal) 相差 ${Math.round(diff)} kcal，超出合理範圍`,
      },
    ]
  }
  return []
}
