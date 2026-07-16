import { calculateGoalPlan } from '@/lib/goal-calculator'
import type { DayPlan, Goal, UserProfile } from '@/types'

/** Minimal DayPlan so Today always renders the full dashboard (no empty-state takeover). */
export function buildFallbackTodayPlan(
  todayStr: string,
  profile: UserProfile | null,
  goal: Goal | null,
  dayIndex = 0
): DayPlan | null {
  if (
    !profile?.onboarding_completed ||
    !goal ||
    profile.weight_kg == null ||
    profile.height_cm == null ||
    profile.age == null ||
    profile.gender == null ||
    !profile.activity_level ||
    !goal.start_date ||
    !goal.end_date ||
    Number.isNaN(Date.parse(goal.start_date)) ||
    Number.isNaN(Date.parse(goal.end_date))
  ) {
    return null
  }

  const calculated = calculateGoalPlan(profile, goal)

  return {
    day: dayIndex + 1,
    date: todayStr,
    meals: [],
    workout: {
      type: 'rest',
      type_zh: '今日休息',
      main: [],
      warmup: [],
      cooldown: [],
      estimated_duration_mins: 0,
      calories_burned_est: 0,
    },
    daily_targets: {
      calories: calculated.dailyCalories,
      protein_g: calculated.proteinGrams,
      carbs_g: calculated.carbsGrams,
      fat_g: calculated.fatGrams,
      water_ml:
        profile.water_ml_target > 0
          ? profile.water_ml_target
          : Math.round(profile.weight_kg * 35),
    },
  }
}
