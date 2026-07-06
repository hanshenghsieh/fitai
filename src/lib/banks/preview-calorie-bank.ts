import type { FoodLogEntry } from '@/lib/banks/types'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import {
  calorieFloorFromGender,
  syncCalorieBankRow,
} from '@/lib/engines/calorie-bank-engine'
import { sumLoggedCalories, sumLoggedProtein } from '@/lib/engines/next-meal-engine'
import { enrichFoodLogs, sumLoggedCarbs, sumLoggedFat } from '@/lib/food-log-macros'
import { getNutritionDayKey } from '@/lib/timezone'
import type { UserProfile } from '@/types'

export interface DailyMacroTargets {
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

/** Client-side bank preview — keeps ring/banner in sync when food logs change. */
export function previewCalorieBankFromLogs(params: {
  userId: string
  logs: FoodLogEntry[]
  dailyTargets: DailyMacroTargets
  profile?: UserProfile | null
  previousDayBank: CalorieBankRow | null
  persistedTodayBank: CalorieBankRow | null
}): CalorieBankRow {
  const enriched = enrichFoodLogs(params.logs)
  const floor = calorieFloorFromGender(params.profile?.gender)

  return syncCalorieBankRow({
    userId: params.userId,
    date: getNutritionDayKey(),
    normalTargetKcal: params.dailyTargets.calories,
    calorieFloor: floor,
    actualKcal: sumLoggedCalories(enriched),
    actualProteinG: sumLoggedProtein(enriched),
    actualFatG: sumLoggedFat(enriched),
    actualCarbsG: sumLoggedCarbs(enriched),
    targetProteinG: params.dailyTargets.protein_g,
    targetFatG: params.dailyTargets.fat_g,
    targetCarbsG: params.dailyTargets.carbs_g,
    previousRow: params.previousDayBank,
    existingToday: params.persistedTodayBank,
  })
}
