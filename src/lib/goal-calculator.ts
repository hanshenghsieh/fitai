import { differenceInDays, parseISO, format } from 'date-fns'
import type { UserProfile, Goal, GoalType } from '@/types'
import {
  analyzePaceGoal,
  resolveFatLossPace,
  type FatLossPace,
  type GoalPlanOptions,
  type GoalPlanWarnings,
} from '@/lib/fat-loss-pace'

export type { GoalPlanOptions, GoalPlanWarnings, FatLossPace }

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
  fatLossPace?: FatLossPace
  warnings?: GoalPlanWarnings
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

/** 依身高體重體脂、目標與減脂節奏，計算每日熱量與巨量營養素 */
export function calculateGoalPlan(
  profile: UserProfile,
  goal: Goal,
  options?: GoalPlanOptions
): GoalPlan {
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
  const fatMassToChange = fatMass - targetFatMass
  const days = daysInGoal(goal)
  const weeks = days / 7
  const fatToLoseKg = Math.max(0, fatMassToChange)
  const totalDeficitKcal = Math.round(fatToLoseKg * 7700)

  let dailyCalories = tdee
  let dailyDeficit = 0
  let weeklyChangeKg = 0
  let coachSummary = ''
  let daysInGoal = days
  let projectedEndDate = format(parseISO(goal.end_date), 'yyyy-MM-dd')
  let proteinGrams = Math.round(leanMass * 1.8)
  let fatLossPace: FatLossPace | undefined
  let warnings: GoalPlanWarnings | undefined

  const goalType = goal.goal_type as GoalType
  const paceOptions: GoalPlanOptions = {
    fat_loss_pace: resolveFatLossPace(options?.fat_loss_pace),
    calorie_mode: options?.calorie_mode,
    manual_calorie_target: options?.manual_calorie_target,
    target_days: options?.target_days,
  }

  if (goalType === 'lose_fat' || goalType === 'lose_weight' || goalType === 'body_recomp') {
    const paceAnalysis = analyzePaceGoal(profile, goal, paceOptions)
    if (paceAnalysis) {
      dailyCalories = paceAnalysis.dailyCalories
      dailyDeficit = paceAnalysis.dailyDeficit
      weeklyChangeKg = paceAnalysis.weeklyChangeKg
      proteinGrams = paceAnalysis.proteinGrams
      daysInGoal = paceAnalysis.daysInGoal
      projectedEndDate = paceAnalysis.projectedEndDate
      fatLossPace = paceAnalysis.pace
      warnings = paceAnalysis.warnings

      const paceLabel =
        paceAnalysis.pace === 'conservative'
          ? '保守'
          : paceAnalysis.pace === 'aggressive'
            ? '積極'
            : '標準'

      if (goalType === 'body_recomp') {
        coachSummary =
          `身體重組（${paceLabel}節奏）：體脂 ${currentBf}% → ${targetBf}%\n` +
          `每日目標 ${dailyCalories} kcal（赤字 ${dailyDeficit} kcal），蛋白質 ${proteinGrams} g`
      } else {
        coachSummary =
          `減脂節奏：${paceLabel}｜體重 ${weight} → ${targetWeight} kg\n` +
          `每日 ${dailyCalories} kcal（赤字 ${dailyDeficit} kcal），蛋白質 ${proteinGrams} g\n` +
          `預估 ${Math.round(daysInGoal / 7)} 週達成，每週約 ${(weeklyChangeKg * 1000).toFixed(0)}g`
      }
    }
  } else if (goalType === 'gain_muscle') {
    const weightGain = targetWeight - weight
    weeklyChangeKg = Math.min(Math.max(weightGain / weeks, 0), 0.25)
    const dailySurplus = Math.round((weeklyChangeKg * 7700) / 7)
    dailyCalories = tdee + Math.min(dailySurplus, 500)
    dailyDeficit = -(dailyCalories - tdee)
    coachSummary = `目標增肌至 ${targetWeight} kg，每日盈餘 ${dailyCalories - tdee} kcal`
  } else {
    coachSummary = '維持體態，照著目前的節奏吃'
  }

  const fatPct =
    goalType === 'lose_fat' || goalType === 'lose_weight' || goalType === 'body_recomp' ? 0.28 : 0.3
  const fatGrams = Math.round((dailyCalories * fatPct) / 9)
  const carbsGrams = Math.max(
    50,
    Math.round((dailyCalories - proteinGrams * 4 - fatGrams * 9) / 4)
  )

  return {
    tdee,
    bmr,
    leanMassKg: Math.round(leanMass * 10) / 10,
    fatMassKg: Math.round(fatMass * 10) / 10,
    targetFatMassKg: Math.round(targetFatMass * 10) / 10,
    fatMassToChangeKg: Math.round(fatMassToChange * 10) / 10,
    fatToLoseKg: Math.round(fatToLoseKg * 10) / 10,
    totalDeficitKcal,
    daysInGoal,
    weeksRemaining: Math.round(daysInGoal / 7),
    weeklyChangeKg: Math.round(weeklyChangeKg * 1000) / 1000,
    dailyDeficit,
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    projectedEndDate,
    coachSummary,
    fatLossPace,
    warnings,
  }
}

export function calculateNutritionTargets(
  profile: UserProfile,
  goal: Goal,
  options?: GoalPlanOptions
): NutritionTargets {
  const plan = calculateGoalPlan(profile, goal, options)
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
