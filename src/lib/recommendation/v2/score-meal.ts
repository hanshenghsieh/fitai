import type { MealType } from '@/lib/checkin-utils'
import { isMainRecommendableItem, mealTimeMatchesItem } from './pool-rules'
import {
  LOW_ESTIMATE_PENALTY,
  OFFICIAL_TRUST_BONUS,
  type RecommendationFoodV2,
  type ScoreMealInput,
  type ScoredMeal,
} from './types'

const TAG_GROUPS: Record<string, string[]> = {
  high_protein: ['高蛋白', 'high_protein'],
  weight_loss: ['減脂友善', 'weight_loss'],
  easy_buy: ['便利商店', '好買', 'easy_buy', '連鎖'],
  balanced: ['balanced', '均衡'],
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function hasTag(item: RecommendationFoodV2, group: keyof typeof TAG_GROUPS): boolean {
  return TAG_GROUPS[group].some(t => item.tags.includes(t))
}

function calorieFitScore(calories: number, target: number): number {
  if (target <= 0) return calories <= 400 ? 20 : 0
  const ratio = calories / target
  if (ratio >= 0.75 && ratio <= 1.05) return 40
  if (ratio >= 0.6 && ratio <= 1.15) return 28
  if (ratio >= 0.45 && ratio <= 1.25) return 14
  return 4
}

function proteinFitScore(protein: number, proteinGap: number): number {
  if (proteinGap <= 0) return protein >= 20 ? 8 : 4
  const coverage = protein / proteinGap
  if (coverage >= 1) return 35
  if (coverage >= 0.8) return 28
  if (coverage >= 0.6) return 18
  if (coverage >= 0.4) return 8
  return 2
}

export function scoreMealForUserToday(input: ScoreMealInput): ScoredMeal {
  const {
    item,
    remainingCalories,
    proteinGap,
    remainingFat,
    remainingCarbs,
    mealTime,
    recentlyShownIds,
    brandCountsInQueue,
  } = input
  const targetCal = input.effectiveMealCalTarget ?? Math.max(remainingCalories * 0.4, 350)

  if (!isMainRecommendableItem(item)) {
    return { item, score: -Infinity, tier: 0, excluded: true, excludeReason: 'not_main_pool' }
  }

  if (recentlyShownIds.includes(item.id)) {
    return { item, score: -Infinity, tier: 0, excluded: true, excludeReason: 'recently_shown' }
  }

  let score = 0

  score += calorieFitScore(item.calories, targetCal)
  score += proteinFitScore(item.protein, proteinGap)

  if (item.calories > remainingCalories) {
    score -= clamp((item.calories - remainingCalories) / 25, 8, 45)
  }

  if (item.fat > remainingFat && remainingFat > 0) {
    score -= clamp((item.fat - remainingFat) / 3, 5, 25)
  }

  if (item.carbs > remainingCarbs * 1.15 && remainingCarbs > 0) {
    score -= clamp((item.carbs - remainingCarbs) / 8, 4, 20)
  }

  if (!mealTimeMatchesItem(mealTime, item)) {
    score -= 18
  }

  if (hasTag(item, 'high_protein')) score += 8
  if (hasTag(item, 'weight_loss')) score += 6
  if (hasTag(item, 'easy_buy')) score += 4
  if (hasTag(item, 'balanced')) score += 3

  if (item.confidence_level === 'official') score += OFFICIAL_TRUST_BONUS
  if (item.confidence_level === 'low_estimate') score -= LOW_ESTIMATE_PENALTY

  if (proteinGap > 20 && item.protein < 15) score -= 12
  if (item.meal_role === 'light_meal' && remainingCalories < 450) score += 8
  if (item.meal_role === 'main_meal' && remainingCalories >= 550) score += 4

  const brandCount = brandCountsInQueue?.[item.brand] ?? 0
  if (brandCount >= 2) score -= 6
  if (brandCount >= 3) score -= 20

  return { item, score, tier: 1, excluded: false }
}

export function scoreAddonForProteinGap(item: RecommendationFoodV2, proteinGap: number): number {
  if (item.portion_type !== 'addon') return -Infinity
  if (proteinGap <= 8) return -Infinity
  return item.protein * 3 - Math.abs(item.calories - 120) * 0.05
}

export function tierFilter(
  items: RecommendationFoodV2[],
  tier: number,
  ctx: {
    remainingCalories: number
    proteinGap: number
    mealTime: MealType
  }
): RecommendationFoodV2[] {
  const mains = items.filter(isMainRecommendableItem)
  switch (tier) {
    case 1:
      return mains.filter(i => i.calories <= ctx.remainingCalories && i.protein >= ctx.proteinGap * 0.8)
    case 2:
      return mains.filter(
        i => i.calories <= ctx.remainingCalories * 1.1 && i.protein >= ctx.proteinGap * 0.6
      )
    case 3:
      return mains.filter(i => i.calories <= ctx.remainingCalories * 1.2)
    case 4:
    case 5:
      return mains
    default:
      return mains
  }
}

export function compareScoredMeals(a: ScoredMeal, b: ScoredMeal): number {
  if (a.excluded && !b.excluded) return 1
  if (!a.excluded && b.excluded) return -1
  if (b.score !== a.score) return b.score - a.score
  return a.item.id.localeCompare(b.item.id)
}
