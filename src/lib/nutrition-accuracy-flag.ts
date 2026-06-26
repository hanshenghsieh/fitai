/**
 * Nutrition Accuracy Engine v1 — photo log confirmation flow (Search V2 aligned).
 * Default: enabled. Set NEXT_PUBLIC_NUTRITION_ACCURACY_V1=false to disable.
 */
export function isNutritionAccuracyV1(): boolean {
  return process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1 !== 'false'
}
