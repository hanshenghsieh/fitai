/**
 * Detect menu items vulnerable to meal-target fallback (e.g. 632 kcal / 22g protein).
 * Used offline in CI — does not modify runtime data.
 */
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import { resolveMenuFromQuery } from '@/lib/food-menu-lookup'
import { isPlaceholderMenuItem } from '@/lib/nutrition/menu-confidence-core'
import { isBeverage } from '@/lib/eat-out-builder'

export const DEFAULT_MEAL_TARGET_KCAL = 632
export const DEFAULT_MEAL_TARGET_PROTEIN_G = 34

export type MealTargetAuditIssue =
  | {
      kind: 'meal_target_fallback'
      id: string
      name: string
      store: string
      calories: number
      protein_g: number
    }
  | {
      kind: 'suspicious_cluster'
      calories: number
      protein_g: number
      count: number
      sample: string[]
    }
  | {
      kind: 'zero_or_missing_nutrition'
      id: string
      name: string
      store: string
    }
  | {
      kind: 'lookup_mismatch'
      id: string
      name: string
      store: string
      menuCalories: number
      lookupCalories: number
    }

export interface MealTargetAuditReport {
  scanned: number
  issues: MealTargetAuditIssue[]
  pass: boolean
}

function clusterKey(calories: number, protein_g: number): string {
  return `${calories}|${protein_g}`
}

export function auditMenuForMealTargetFallback(
  items: ConvenienceItem[],
  opts?: { mealTargetKcal?: number; mealTargetProteinG?: number; clusterMin?: number }
): MealTargetAuditReport {
  const mealTargetKcal = opts?.mealTargetKcal ?? DEFAULT_MEAL_TARGET_KCAL
  const mealTargetProteinG = opts?.mealTargetProteinG ?? DEFAULT_MEAL_TARGET_PROTEIN_G
  const clusterMin = opts?.clusterMin ?? 12
  const fallbackKcal = Math.max(200, Math.round(mealTargetKcal))
  const fallbackProtein = Math.max(8, Math.round(mealTargetProteinG * 0.65))

  const issues: MealTargetAuditIssue[] = []
  const clusters = new Map<string, ConvenienceItem[]>()

  for (const item of items) {
    if (isPlaceholderMenuItem(item)) continue

    const key = clusterKey(item.calories, item.protein_g)
    const bucket = clusters.get(key) ?? []
    bucket.push(item)
    clusters.set(key, bucket)

    if (!item.calories || item.calories <= 0) {
      if (isBeverage(item)) continue
      issues.push({
        kind: 'zero_or_missing_nutrition',
        id: item.id,
        name: item.name,
        store: item.store,
      })
      continue
    }

    // Exact meal-target fallback signature (632 kcal · 22g protein for default targets).
    if (item.calories === fallbackKcal && item.protein_g === fallbackProtein) {
      issues.push({
        kind: 'meal_target_fallback',
        id: item.id,
        name: item.name,
        store: item.store,
        calories: item.calories,
        protein_g: item.protein_g,
      })
    }

    const lookup = resolveMenuFromQuery(item.name, item.store)
    if (
      lookup &&
      lookup.calories === fallbackKcal &&
      lookup.protein_g === fallbackProtein &&
      Math.abs(lookup.calories - item.calories) > 80
    ) {
      issues.push({
        kind: 'lookup_mismatch',
        id: item.id,
        name: item.name,
        store: item.store,
        menuCalories: item.calories,
        lookupCalories: lookup.calories,
      })
    }
  }

  for (const [key, group] of clusters) {
    if (group.length < clusterMin) continue
    const [calories, protein_g] = key.split('|').map(Number)
    if (calories === fallbackKcal && protein_g === fallbackProtein) {
      issues.push({
        kind: 'suspicious_cluster',
        calories,
        protein_g,
        count: group.length,
        sample: group.slice(0, 5).map(i => `${i.store} · ${i.name}`),
      })
    }
  }

  return {
    scanned: items.length,
    issues,
    pass: issues.length === 0,
  }
}
