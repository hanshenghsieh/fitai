import type { FoodLogEntry } from '@/lib/banks/types'
import type { MealType } from '@/lib/checkin-utils'
import type { TodayMealState } from '@/lib/engines/next-meal-engine'
import type { MealTargets } from '@/lib/meal-engine-types'
import type {
  ConfidenceLevel,
  RecommendationFoodV2,
  RecommendationResultV2,
  UserNutritionState,
} from './types'
import { filterAddonPool, filterMainRecommendablePool } from './pool-rules'
import { compareScoredMeals, scoreAddonForProteinGap, scoreMealForUserToday, tierFilter } from './score-meal'
import {
  confidenceDisclaimer,
  confidenceDisplayLabel,
  estimatedDisclaimer,
  formatRecommendationCalories,
  formatRecommendationMacroGrams,
} from './display-macro'

function sumMacro(logs: FoodLogEntry[], key: 'fat_g' | 'carbs_g'): number {
  return logs.reduce((s, l) => {
    if (l.nutrition_status === 'unknown' || l.nutrition_status === 'pending_confirmation') return s
    const v = l[key]
    return v == null ? s : s + v
  }, 0)
}

export function buildUserNutritionState(params: {
  dayState: TodayMealState
  dailyTargets: MealTargets
  todayFoodLogs: FoodLogEntry[]
  mealTime: MealType
}): UserNutritionState {
  const alreadyFat = sumMacro(params.todayFoodLogs, 'fat_g')
  const alreadyCarbs = sumMacro(params.todayFoodLogs, 'carbs_g')
  return {
    remainingCalories: params.dayState.remainingCalories,
    proteinGap: params.dayState.proteinGap,
    remainingFat: Math.max(0, params.dailyTargets.fat_g - alreadyFat),
    remainingCarbs: Math.max(0, params.dailyTargets.carbs_g - alreadyCarbs),
    mealTime: params.mealTime,
    effectiveMealCalTarget: params.dayState.effectiveMealCalTarget,
  }
}

function confidenceLeadReason(level: ConfidenceLevel): RecommendationResultV2['reasons'][number] {
  if (level === 'official') {
    return {
      code: 'trust_official',
      label: '這是官方營養資料，熱量與蛋白質都符合你今天的剩餘目標。',
    }
  }
  if (level === 'estimated') {
    return {
      code: 'trust_estimated',
      label: '這是標準份量估算，適合判斷今天大方向會不會爆熱量。',
    }
  }
  return {
    code: 'trust_low',
    label: '這是粗略估算，方向上比亂吃安全，但建議依實際份量調整。',
  }
}

export function buildRecommendationReasons(params: {
  item: RecommendationFoodV2
  addons: RecommendationFoodV2[]
  state: UserNutritionState
  tier: number
  fallbackNote?: string
}): { reasons: RecommendationResultV2['reasons']; benefitPoints: string[] } {
  const { item, addons, state, tier, fallbackNote } = params
  const reasons: RecommendationResultV2['reasons'] = [confidenceLeadReason(item.confidence_level)]
  const benefitPoints: string[] = []
  const totalProtein = item.protein + addons.reduce((s, a) => s + a.protein, 0)
  const totalCal = item.calories + addons.reduce((s, a) => s + a.calories, 0)

  if (state.proteinGap > 0) {
    reasons.push({
      code: 'protein_gap',
      label: `你今天蛋白質還差 ${Math.round(state.proteinGap)}g，這餐可以補上。`,
    })
    reasons.push({
      code: 'meal_protein',
      label:
        item.confidence_level === 'official'
          ? `這餐蛋白質 ${Math.round(totalProtein)}g`
          : `這餐蛋白質約 ${Math.round(totalProtein)}g`,
    })
  } else {
    reasons.push({ code: 'protein_ok', label: '今天蛋白質已接近目標，這餐幫你維持節奏。' })
  }

  if (totalCal <= state.remainingCalories) {
    reasons.push({
      code: 'calorie_fit',
      label: `熱量${item.confidence_level === 'official' ? '' : '約'}在 ${formatRecommendationCalories(totalCal, item.confidence_level).replace(' kcal', '')}，還在今天剩餘範圍內。`,
    })
  } else {
    reasons.push({
      code: 'calorie_near',
      label: `熱量${item.confidence_level === 'official' ? '' : '約'} ${formatRecommendationCalories(totalCal, item.confidence_level).replace(' kcal', '')}，略高但仍是今天最接近的選擇。`,
    })
  }

  if (item.tags.includes('減脂友善') || item.tags.includes('weight_loss') || item.tags.includes('低脂')) {
    reasons.push({ code: 'lower_fat', label: '今天晚餐吃這個，比一般便當更不容易爆。' })
  } else if (item.confidence_level === 'estimated') {
    reasons.push({ code: 'estimate_safe', label: '這個是估算值，但方向上比亂吃安全很多。' })
  }

  if (item.recommendation_copy?.benefit_points?.length) {
    benefitPoints.push(...item.recommendation_copy.benefit_points)
  } else if (item.recommendation_copy?.short_reason) {
    benefitPoints.push(item.recommendation_copy.short_reason)
  }

  if (tier >= 5 && fallbackNote) {
    reasons.push({ code: 'fallback', label: fallbackNote })
  }

  return { reasons: reasons.slice(0, 5), benefitPoints: benefitPoints.slice(0, 4) }
}

export function pickRecommendationWithFallback(
  items: RecommendationFoodV2[],
  state: UserNutritionState,
  recentlyShownIds: string[],
  preferredId?: string | null
): RecommendationResultV2 | null {
  const byId = new Map(items.map(i => [i.id, i]))
  if (preferredId) {
    const preferred = byId.get(preferredId)
    if (preferred && filterMainRecommendablePool(items, state.mealTime).some(i => i.id === preferredId)) {
      return finalizePick(preferred, [], state, 1)
    }
  }

  for (const tier of [1, 2, 3, 4, 5] as const) {
    const tierItems = tierFilter(items, tier, state).filter(
      i => !recentlyShownIds.includes(i.id) && filterMainRecommendablePool([i], state.mealTime).length > 0
    )
    if (!tierItems.length && tier < 5) continue

    const scored = tierItems
      .map(item =>
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
      .filter(s => !s.excluded)
      .sort(compareScoredMeals)

    if (!scored.length) {
      if (tier === 5) break
      continue
    }

    const best = scored[0]!

    if (tier === 4) {
      const addons = filterAddonPool(items)
        .map(a => ({ item: a, score: scoreAddonForProteinGap(a, state.proteinGap) }))
        .filter(r => r.score > -Infinity)
        .sort((a, b) => b.score - a.score)
      const addon = addons[0]?.item
      if (addon) {
        return finalizePick(best.item, [addon], state, tier)
      }
    }

    if (tier === 5) {
      return finalizePick(
        best.item,
        [],
        state,
        tier,
        '目前沒有完全符合的餐點，這是最接近你今天狀態的選擇'
      )
    }

    return finalizePick(best.item, [], state, tier)
  }

  const fallbackPool = filterMainRecommendablePool(items, state.mealTime).filter(
    i => !recentlyShownIds.includes(i.id)
  )
  if (!fallbackPool.length) return null
  const scored = fallbackPool
    .map(item =>
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
    .filter(s => !s.excluded)
    .sort(compareScoredMeals)
  const best = scored[0]
  if (!best) return null
  return finalizePick(
    best.item,
    [],
    state,
    5,
    '目前沒有完全符合的餐點，這是最接近你今天狀態的選擇'
  )
}

function finalizePick(
  primary: RecommendationFoodV2,
  addons: RecommendationFoodV2[],
  state: UserNutritionState,
  tier: number,
  fallbackNote?: string
): RecommendationResultV2 {
  const score = scoreMealForUserToday({
    item: primary,
    remainingCalories: state.remainingCalories,
    proteinGap: state.proteinGap,
    remainingFat: state.remainingFat,
    remainingCarbs: state.remainingCarbs,
    mealTime: state.mealTime,
    recentlyShownIds: [],
    effectiveMealCalTarget: state.effectiveMealCalTarget,
  }).score

  const { reasons, benefitPoints } = buildRecommendationReasons({
    item: primary,
    addons,
    state,
    tier,
    fallbackNote,
  })

  return {
    primary,
    addons,
    tier,
    score,
    reasons,
    benefitPoints,
    confidenceLevel: primary.confidence_level,
    fallbackNote,
  }
}

export { confidenceDisplayLabel, confidenceDisclaimer, estimatedDisclaimer }
