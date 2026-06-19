import { differenceInDays, parseISO, format } from 'date-fns'
import type { UserProfile, Goal, GoalType } from '@/types'

export interface NutritionTargets {
  dailyCalories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
}

export interface GoalPlan extends NutritionTargets {
  tdee: number
  bmr: number
  leanMassKg: number
  fatMassKg: number
  targetFatMassKg: number
  fatMassToChangeKg: number
  fatToLoseKg: number
  totalDeficitKcal: number
  daysInGoal: number
  weeksRemaining: number
  weeklyChangeKg: number
  dailyDeficit: number
  projectedEndDate: string
  coachSummary: string
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/** 計算 BMR：有體脂用 Katch-McArdle，否則 Mifflin-St Jeor */
export function calculateBMR(profile: UserProfile): number {
  const weight = profile.weight_kg ?? 70
  const height = profile.height_cm ?? 170
  const age = profile.age ?? 30

  if (profile.body_fat_pct && profile.body_fat_pct > 0 && profile.body_fat_pct < 60) {
    const leanMass = profile.muscle_mass_kg
      ? profile.muscle_mass_kg + weight * 0.1 // 肌肉量 + 估計器官水分
      : weight * (1 - profile.body_fat_pct / 100)
    return Math.round(370 + 21.6 * leanMass)
  }

  const isMale = profile.gender === 'male'
  return Math.round(
    isMale
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161
  )
}

export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile)
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activity_level] ?? 1.55
  return Math.round(bmr * multiplier)
}

function getLeanMass(profile: UserProfile): number {
  const weight = profile.weight_kg ?? 70
  if (profile.muscle_mass_kg) return profile.muscle_mass_kg / 0.85 // 肌肉約佔 lean mass 85%
  const bf = profile.body_fat_pct ?? 25
  return weight * (1 - bf / 100)
}

function daysInGoal(goal: Goal): number {
  return Math.max(7, differenceInDays(parseISO(goal.end_date), parseISO(goal.start_date)))
}

function deficitFromFatGoal(fatKg: number, days: number, minDaily: number, maxDaily: number): number {
  if (fatKg <= 0 || days <= 0) return 0
  const required = Math.round((fatKg * 7700) / days)
  return Math.min(maxDaily, Math.max(minDaily, required))
}

function calorieFloor(profile: UserProfile): number {
  return profile.gender === 'female' ? 1200 : 1500
}

/** 依身高體重體脂與目標，嚴格計算每日熱量與巨量營養素 */
export function calculateGoalPlan(profile: UserProfile, goal: Goal): GoalPlan {
  const tdee = calculateTDEE(profile)
  const bmr = calculateBMR(profile)
  const weight = profile.weight_kg ?? 70
  const currentBf = profile.body_fat_pct ?? 25
  const leanMass = getLeanMass(profile)
  const fatMass = weight - leanMass

  const targetBf = goal.target_body_fat_pct ?? currentBf
  const targetWeight =
    goal.target_weight_kg ??
    Math.round((leanMass / (1 - targetBf / 100)) * 10) / 10

  const targetFatMass = targetWeight * (targetBf / 100)
  const fatMassToChange = fatMass - targetFatMass // 正=需減脂
  const days = daysInGoal(goal)
  const weeks = days / 7
  const fatToLoseKg = Math.max(0, fatMassToChange)
  const totalDeficitKcal = Math.round(fatToLoseKg * 7700)

  let dailyCalories = tdee
  let dailyDeficit = 0
  let weeklyChangeKg = 0
  let coachSummary = ''

  const goalType = goal.goal_type as GoalType

  if (goalType === 'lose_fat' || goalType === 'lose_weight') {
    dailyDeficit = deficitFromFatGoal(fatToLoseKg, days, 300, 750)
    weeklyChangeKg = Math.min(0.5, (dailyDeficit * 7) / 7700)
    dailyCalories = Math.max(calorieFloor(profile), tdee - dailyDeficit)

    const weeksNeeded = dailyDeficit > 0 ? Math.ceil(totalDeficitKcal / (dailyDeficit * 7)) : weeks
    coachSummary =
      `目標：體脂 ${currentBf.toFixed(1)}% → ${targetBf}%（約減脂 ${fatToLoseKg.toFixed(1)} kg，≈ ${(totalDeficitKcal / 1000).toFixed(1)} 萬大卡）\n` +
      `期限：${weeks.toFixed(0)} 週；依每日赤字 ${dailyDeficit} kcal，約 ${weeksNeeded} 週可達成\n` +
      `每週約減脂 ${(weeklyChangeKg * 1000).toFixed(0)}g，蛋白質以瘦體重保護肌肉`
  } else if (goalType === 'gain_muscle') {
    const weightGain = (targetWeight - weight)
    weeklyChangeKg = Math.min(Math.max(weightGain / weeks, 0), 0.25)
    const dailySurplus = Math.round((weeklyChangeKg * 7700) / 7)
    dailyCalories = tdee + Math.min(dailySurplus, 500)
    dailyDeficit = -(dailyCalories - tdee)
    coachSummary = `目標增肌至 ${targetWeight} kg，每日盈餘 ${dailyCalories - tdee} kcal`
  } else if (goalType === 'body_recomp') {
    dailyDeficit = deficitFromFatGoal(fatToLoseKg, days, 250, 500)
    weeklyChangeKg = Math.min(0.35, (dailyDeficit * 7) / 7700)
    dailyCalories = Math.max(calorieFloor(profile), tdee - dailyDeficit)
    coachSummary =
      `身體重組：體脂 ${currentBf}% → ${targetBf}%（約減脂 ${fatToLoseKg.toFixed(1)} kg）\n` +
      `每日赤字 ${dailyDeficit} kcal（總計約 ${(totalDeficitKcal / 1000).toFixed(1)} 萬大卡 ÷ ${days} 天）`
  } else {
    coachSummary = '維持體態，照著目前的節奏吃'
  }

  // 蛋白質：依瘦體重（減脂 2.2g/kg，增肌 2.0g/kg）
  const proteinPerKgLean =
    goalType === 'lose_fat' || goalType === 'lose_weight' ? 2.2
    : goalType === 'gain_muscle' ? 2.0
    : 1.8
  const proteinGrams = Math.round(leanMass * proteinPerKgLean)

  const fatPct = goalType === 'lose_fat' || goalType === 'lose_weight' ? 0.28 : 0.3
  const fatGrams = Math.round((dailyCalories * fatPct) / 9)
  const carbsGrams = Math.max(
    50,
    Math.round((dailyCalories - proteinGrams * 4 - fatGrams * 9) / 4)
  )

  const projectedEndDate = format(parseISO(goal.end_date), 'yyyy-MM-dd')

  return {
    tdee,
    bmr,
    leanMassKg: Math.round(leanMass * 10) / 10,
    fatMassKg: Math.round(fatMass * 10) / 10,
    targetFatMassKg: Math.round(targetFatMass * 10) / 10,
    fatMassToChangeKg: Math.round(fatMassToChange * 10) / 10,
    fatToLoseKg: Math.round(fatToLoseKg * 10) / 10,
    totalDeficitKcal,
    daysInGoal: days,
    weeksRemaining: Math.round(weeks),
    weeklyChangeKg: Math.round(weeklyChangeKg * 1000) / 1000,
    dailyDeficit,
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    projectedEndDate,
    coachSummary,
  }
}

export function calculateNutritionTargets(
  profile: UserProfile,
  goal: Goal
): NutritionTargets {
  const plan = calculateGoalPlan(profile, goal)
  return {
    dailyCalories: plan.dailyCalories,
    proteinGrams: plan.proteinGrams,
    carbsGrams: plan.carbsGrams,
    fatGrams: plan.fatGrams,
  }
}

/** 每餐熱量分配：25% / 40% / 35% */
export function mealMacroSplit(
  nutrition: NutritionTargets,
  mealType: 'breakfast' | 'lunch' | 'dinner'
) {
  const ratios = { breakfast: 0.25, lunch: 0.4, dinner: 0.35 }
  const r = ratios[mealType]
  return {
    calories: Math.round(nutrition.dailyCalories * r),
    protein: Math.round(nutrition.proteinGrams * r),
    carbs: Math.round(nutrition.carbsGrams * r),
    fat: Math.round(nutrition.fatGrams * r),
  }
}
