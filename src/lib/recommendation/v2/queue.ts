import type { MealType } from '@/lib/checkin-utils'
import {
  MAX_BRAND_PER_QUEUE,
  QUEUE_MAX_SIZE,
  RECENTLY_SHOWN_BLOCK,
  type RecommendationFoodV2,
  type RecommendationQueueState,
  type ScoredMeal,
  type UserNutritionState,
} from './types'
import { compareScoredMeals, scoreMealForUserToday } from './score-meal'
import { filterMainRecommendablePool } from './pool-rules'

function nearEqualScore(a: number, b: number): boolean {
  return Math.abs(a - b) <= 3
}

function microShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.abs((seed + i * 9973) % (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export function buildQueueContextKey(state: UserNutritionState): string {
  return [
    state.mealTime,
    Math.round(state.remainingCalories / 50),
    Math.round(state.proteinGap / 10),
    Math.round(state.effectiveMealCalTarget / 50),
  ].join(':')
}

export function scoreCandidatesForQueue(
  items: RecommendationFoodV2[],
  state: UserNutritionState,
  recentlyShownIds: string[]
): ScoredMeal[] {
  const pool = filterMainRecommendablePool(items, state.mealTime)
  const scored = pool.map(item =>
    scoreMealForUserToday({
      item,
      remainingCalories: state.remainingCalories,
      proteinGap: state.proteinGap,
      remainingFat: state.remainingFat,
      remainingCarbs: state.remainingCarbs,
      mealTime: state.mealTime,
      recentlyShownIds,
      effectiveMealCalTarget: state.effectiveMealCalTarget,
    })
  )
  return scored.filter(s => !s.excluded).sort(compareScoredMeals)
}

export function buildRecommendationQueue(
  items: RecommendationFoodV2[],
  state: UserNutritionState,
  recentlyShownIds: string[],
  seed = 0
): RecommendationQueueState {
  const scored = scoreCandidatesForQueue(items, state, recentlyShownIds)
  const grouped: ScoredMeal[][] = []
  for (const row of scored) {
    const last = grouped[grouped.length - 1]
    if (!last || !nearEqualScore(last[0]!.score, row.score)) {
      grouped.push([row])
    } else {
      last.push(row)
    }
  }

  const ordered: ScoredMeal[] = []
  for (const group of grouped) {
    ordered.push(...microShuffle(group, seed + group[0]!.score))
  }

  const brandCounts = new Map<string, number>()
  const picked: string[] = []

  for (const row of ordered) {
    if (picked.length >= QUEUE_MAX_SIZE) break
    const brand = row.item.brand
    const count = brandCounts.get(brand) ?? 0
    if (count >= MAX_BRAND_PER_QUEUE) continue
    picked.push(row.item.id)
    brandCounts.set(brand, count + 1)
  }

  return {
    contextKey: buildQueueContextKey(state),
    itemIds: picked,
    cursor: 0,
    recentlyShownIds: recentlyShownIds.slice(-RECENTLY_SHOWN_BLOCK),
  }
}

export function shouldRegenerateQueue(
  queue: RecommendationQueueState | null | undefined,
  state: UserNutritionState
): boolean {
  if (!queue) return true
  if (queue.contextKey !== buildQueueContextKey(state)) return true
  if (queue.cursor >= queue.itemIds.length) return true
  return queue.itemIds.length === 0
}

export function peekQueueItemId(queue: RecommendationQueueState): string | null {
  if (queue.cursor >= queue.itemIds.length) return null
  return queue.itemIds[queue.cursor] ?? null
}

export function advanceQueue(queue: RecommendationQueueState): RecommendationQueueState {
  const shownId = peekQueueItemId(queue)
  const nextRecently = shownId
    ? [...queue.recentlyShownIds, shownId].slice(-RECENTLY_SHOWN_BLOCK)
    : queue.recentlyShownIds
  return {
    ...queue,
    cursor: queue.cursor + 1,
    recentlyShownIds: nextRecently,
  }
}

export function queueHasUniqueIds(queue: RecommendationQueueState): boolean {
  return new Set(queue.itemIds).size === queue.itemIds.length
}

export function countBrandInQueue(queue: RecommendationQueueState, items: RecommendationFoodV2[]): number {
  const byId = new Map(items.map(i => [i.id, i]))
  const counts = new Map<string, number>()
  for (const id of queue.itemIds) {
    const brand = byId.get(id)?.brand
    if (!brand) continue
    counts.set(brand, (counts.get(brand) ?? 0) + 1)
  }
  return Math.max(0, ...counts.values())
}
