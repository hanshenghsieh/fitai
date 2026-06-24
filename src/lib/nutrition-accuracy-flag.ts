/**
 * Nutrition Accuracy Engine v1 — photo log confirmation flow.
 * Set NEXT_PUBLIC_NUTRITION_ACCURACY_V1=true to enable.
 * Default: false (legacy photo parse → direct calories).
 */
export function isNutritionAccuracyV1(): boolean {
  return process.env.NEXT_PUBLIC_NUTRITION_ACCURACY_V1 === 'true'
}
