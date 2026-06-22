/**
 * When daily calories are nearly met, offer small light options (eggs, soy milk)
 * instead of failing silently with a full meal.
 */

import { applyPortion, isBeverage, type PortionId } from './eat-out-builder'
import { getDiceMenuPool } from './dice-menu-pool'
import type { MealLine, MealSuggestion, SuggestContext } from './meal-engine-types'
import { suggestionId } from './meal-engine-types'
import type { TodayMealState } from './engines/next-meal-engine'

const LIGHT_SNACK_RE = /茶葉蛋|水煮蛋|滷蛋|糖心蛋|溫泉蛋|無糖豆漿|豆漿|希臘優格|小番茄|小黃瓜|蛋白飲/

export function isNearDailyTarget(state: Pick<TodayMealState, 'remainingCalories' | 'overTargetProtection'>): boolean {
  return !state.overTargetProtection && state.remainingCalories < 200
}

export function nearTargetRollMessage(remainingKcal: number): string {
  if (remainingKcal <= 0) {
    return '今天營養量攝取已經很足夠了，不需要更多攝取'
  }
  return `今天熱量已接近目標，只剩約 ${remainingKcal} kcal。清淡小點就好，或直接記錄你吃的。`
}

function lineTotals(lines: MealLine[]) {
  const items = lines.map(l => applyPortion(l.item, l.portion))
  return {
    calories: items.reduce((s, i) => s + i.calories, 0),
    protein_g: items.reduce((s, i) => s + i.protein_g, 0),
    carbs_g: items.reduce((s, i) => s + i.carbs_g, 0),
    fat_g: items.reduce((s, i) => s + i.fat_g, 0),
    price: items.reduce((s, i) => s + i.price, 0),
  }
}

function shuffledBySeed<T>(items: T[], seed: number, limit: number): T[] {
  const arr = [...items]
  let s = seed >>> 0
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr.slice(0, Math.min(limit, arr.length))
}

function isLightSnackCandidate(
  name: string,
  calories: number,
  protein_g: number,
  beverage: boolean
): boolean {
  if (LIGHT_SNACK_RE.test(name)) return true
  return !beverage && calories <= 150 && protein_g >= 3
}

export function suggestLightSnack(ctx: SuggestContext): MealSuggestion | null {
  const ds = ctx.day_state
  if (!ds || ds.overTargetProtection) return null

  const remaining = Math.max(0, ds.remainingCalories)
  if (remaining < 25) return null

  const maxCal = Math.min(
    remaining,
    ds.effectiveMealCalTarget > 0 ? ds.effectiveMealCalTarget : remaining
  )

  const menu = getDiceMenuPool(ctx.meal_type, ctx.profile, ctx.memory)
  const excludeNames = new Set(ctx.exclude_names ?? [])
  const excludeIds = new Set(ctx.exclude_ids ?? [])

  const pool = menu.filter(i => {
    if (i.calories > maxCal || i.calories < 25) return false
    if (excludeNames.has(i.name)) return false
    const beverage = isBeverage(i)
    if (beverage && !/豆漿|蛋白/.test(i.name)) return false
    return isLightSnackCandidate(i.name, i.calories, i.protein_g, beverage)
  })

  if (!pool.length) return null

  const eggFirst = [
    ...pool.filter(i => /茶葉蛋|水煮蛋|滷蛋/.test(i.name)),
    ...pool.filter(i => !/茶葉蛋|水煮蛋|滷蛋/.test(i.name)),
  ]

  const seed = (ctx.seed ?? Date.now()) + (ctx.rolls_used ?? 0) * 37
  const ordered = shuffledBySeed(eggFirst, seed, Math.min(eggFirst.length, 16))

  for (const picked of ordered) {
    const lines: MealLine[] = [{ item: picked, portion: 'full' as PortionId }]
    const id = suggestionId(lines)
    if (excludeIds.has(id)) continue
    const totals = lineTotals(lines)
    return {
      id,
      meal_type: ctx.meal_type,
      lines,
      totals,
      highlight: '今天熱量快滿了，來點清淡的小東西剛好',
      highlight_key: 'light_meal',
      stores: [...new Set(lines.map(l => l.item.store))],
      nutrition_score: 75,
    }
  }

  return null
}
