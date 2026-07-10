import { addDays, differenceInDays, format, parseISO } from 'date-fns'
import type { UserProfile, Goal, GoalType } from '@/types'
import type { CalorieBankIntensity } from '@/lib/settings/user-settings-types'
import { calorieFloorFromGender } from '@/lib/engines/calorie-bank-engine'
import { calculateBMR, calculateTDEE } from '@/lib/goal-calculator'

export type FatLossPace = 'conservative' | 'standard' | 'aggressive'

export interface PaceSpec {
  id: FatLossPace
  title: string
  subtitle: string
  description: string
  tdeeDeficitPctMin: number
  tdeeDeficitPctMax: number
  weeklyLossPctMin: number
  weeklyLossPctMax: number
  proteinLeanMultiplier: number
  calorieBankIntensity: CalorieBankIntensity
}

export const PACE_SPECS: Record<FatLossPace, PaceSpec> = {
  conservative: {
    id: 'conservative',
    title: '保守',
    subtitle: '比較不餓，慢慢瘦',
    description: '適合剛開始、容易暴食、生活壓力大的人。',
    tdeeDeficitPctMin: 0.1,
    tdeeDeficitPctMax: 0.15,
    weeklyLossPctMin: 0.0025,
    weeklyLossPctMax: 0.005,
    proteinLeanMultiplier: 2.0,
    calorieBankIntensity: 'gentle',
  },
  standard: {
    id: 'standard',
    title: '標準',
    subtitle: '穩定下降，最推薦',
    description: '兼顧速度與可持續性，適合大多數人。',
    tdeeDeficitPctMin: 0.15,
    tdeeDeficitPctMax: 0.2,
    weeklyLossPctMin: 0.005,
    weeklyLossPctMax: 0.0075,
    proteinLeanMultiplier: 2.2,
    calorieBankIntensity: 'standard',
  },
  aggressive: {
    id: 'aggressive',
    title: '積極',
    subtitle: '短期衝刺，要求較高',
    description: '熱量缺口較大，需要更高執行力與蛋白質控制。',
    tdeeDeficitPctMin: 0.2,
    tdeeDeficitPctMax: 0.25,
    weeklyLossPctMin: 0.0075,
    weeklyLossPctMax: 0.01,
    proteinLeanMultiplier: 2.4,
    calorieBankIntensity: 'aggressive',
  },
}

export const TOO_AGGRESSIVE_MESSAGE =
  '這個目標偏激進，可能比較難維持。建議延長達成時間，或選擇較溫和的減脂節奏。'

export const DEADLINE_MISMATCH_MESSAGE =
  '以目前期限來看，這比較接近積極減脂。你可以改成積極模式，或延長目標時間。'

export interface GoalPlanOptions {
  fat_loss_pace?: FatLossPace | null
  calorie_mode?: 'auto' | 'manual'
  manual_calorie_target?: number | null
  /** null = infer timeline from pace */
  target_days?: number | null
}

export interface GoalPlanWarnings {
  tooAggressive?: boolean
  tooAggressiveMessage?: string
  deadlineMismatch?: boolean
  deadlineMismatchMessage?: string
  hitCalorieFloor?: boolean
  manualPaceLabel?: FatLossPace | null
}

export interface PacePreview {
  pace: FatLossPace
  title: string
  subtitle: string
  description: string
  weeklyLossMinKg: number
  weeklyLossMaxKg: number
  dailyCalorieMin: number
  dailyCalorieMax: number
  selected: boolean
}

export function resolveFatLossPace(raw?: string | null): FatLossPace {
  if (raw === 'conservative' || raw === 'standard' || raw === 'aggressive') return raw
  return 'standard'
}

export function paceToCalorieBankIntensity(pace: FatLossPace): CalorieBankIntensity {
  return PACE_SPECS[pace].calorieBankIntensity
}

function getLeanMass(profile: UserProfile): number {
  const weight = profile.weight_kg ?? 70
  if (profile.muscle_mass_kg) return profile.muscle_mass_kg / 0.85
  const bf = profile.body_fat_pct ?? 25
  return weight * (1 - bf / 100)
}

function deficitKcalRange(tdee: number, pace: FatLossPace): { min: number; max: number; mid: number } {
  const spec = PACE_SPECS[pace]
  const min = Math.round(tdee * spec.tdeeDeficitPctMin)
  const max = Math.round(tdee * spec.tdeeDeficitPctMax)
  return { min, max, mid: Math.round((min + max) / 2) }
}

function weeklyLossKgRange(weightKg: number, pace: FatLossPace): { min: number; max: number; mid: number } {
  const spec = PACE_SPECS[pace]
  const min = Math.round(weightKg * spec.weeklyLossPctMin * 100) / 100
  const max = Math.round(weightKg * spec.weeklyLossPctMax * 100) / 100
  return { min, max, mid: Math.round(((min + max) / 2) * 100) / 100 }
}

function clampDailyCalories(raw: number, profile: UserProfile): { kcal: number; hitFloor: boolean } {
  const floor = calorieFloorFromGender(profile.gender)
  if (raw < floor) return { kcal: floor, hitFloor: true }
  return { kcal: Math.round(raw), hitFloor: false }
}

export function dailyCalorieRangeForPace(
  profile: UserProfile,
  pace: FatLossPace,
  tdee?: number
): { min: number; max: number; mid: number } {
  const t = tdee ?? calculateTDEE(profile)
  const floor = calorieFloorFromGender(profile.gender)
  const deficits = deficitKcalRange(t, pace)
  return {
    min: Math.max(floor, t - deficits.max),
    max: Math.max(floor, t - deficits.min),
    mid: Math.max(floor, t - deficits.mid),
  }
}

export function classifyCaloriesByPace(
  profile: UserProfile,
  dailyCalories: number,
  tdee?: number
): FatLossPace | 'maintenance' | 'surplus' {
  const t = tdee ?? calculateTDEE(profile)
  const deficit = t - dailyCalories
  if (deficit <= 50) return dailyCalories > t + 50 ? 'surplus' : 'maintenance'

  const pct = deficit / t
  if (pct >= PACE_SPECS.aggressive.tdeeDeficitPctMin) return 'aggressive'
  if (pct >= PACE_SPECS.standard.tdeeDeficitPctMin) return 'standard'
  return 'conservative'
}

export function paceLabelZh(pace: FatLossPace): string {
  return PACE_SPECS[pace].title
}

export interface PaceGoalAnalysis {
  pace: FatLossPace
  tdee: number
  bmr: number
  weightKg: number
  targetWeightKg: number
  weightToLoseKg: number
  dailyCalories: number
  dailyDeficit: number
  proteinGrams: number
  daysInGoal: number
  projectedEndDate: string
  weeklyChangeKg: number
  warnings: GoalPlanWarnings
}

function isFatLossGoal(goalType: GoalType): boolean {
  return goalType === 'lose_fat' || goalType === 'lose_weight' || goalType === 'body_recomp'
}

export function analyzePaceGoal(
  profile: UserProfile,
  goal: Goal,
  options: GoalPlanOptions = {}
): PaceGoalAnalysis | null {
  const goalType = goal.goal_type as GoalType
  if (!isFatLossGoal(goalType)) return null

  const pace = resolveFatLossPace(options.fat_loss_pace)
  const spec = PACE_SPECS[pace]
  const tdee = calculateTDEE(profile)
  const bmr = calculateBMR(profile)
  const weight = profile.weight_kg ?? 70
  const leanMass = getLeanMass(profile)
  const targetWeight = goal.target_weight_kg ?? weight
  const weightToLose = Math.max(0, weight - targetWeight)

  const warnings: GoalPlanWarnings = {}
  const deficitRange = deficitKcalRange(tdee, pace)
  const weeklyRange = weeklyLossKgRange(weight, pace)

  let dailyDeficit = deficitRange.mid
  let daysInGoal: number
  let projectedEndDate: string

  const hasExplicitDeadline =
    options.target_days != null && options.target_days > 0 && Number.isFinite(options.target_days)

  if (options.calorie_mode === 'manual' && options.manual_calorie_target != null) {
    const manual = options.manual_calorie_target
    const clamped = clampDailyCalories(manual, profile)
    dailyDeficit = Math.max(0, tdee - clamped.kcal)
    warnings.manualPaceLabel = classifyCaloriesByPace(profile, clamped.kcal, tdee) as FatLossPace
    if (clamped.hitFloor) warnings.hitCalorieFloor = true
    if (hasExplicitDeadline) {
      daysInGoal = options.target_days!
    } else if (goal.end_date && goal.start_date) {
      daysInGoal = Math.max(7, differenceInDays(parseISO(goal.end_date), parseISO(goal.start_date)))
    } else if (dailyDeficit > 0 && weightToLose > 0) {
      daysInGoal = Math.max(7, Math.ceil((weightToLose * 7700) / dailyDeficit))
    } else {
      daysInGoal = Math.max(7, Math.ceil(weightToLose / weeklyRange.mid / 7) * 7)
    }
    projectedEndDate = format(addDays(new Date(), daysInGoal), 'yyyy-MM-dd')
    const proteinGrams = Math.round(leanMass * spec.proteinLeanMultiplier)
    return {
      pace,
      tdee,
      bmr,
      weightKg: weight,
      targetWeightKg: targetWeight,
      weightToLoseKg: weightToLose,
      dailyCalories: clamped.kcal,
      dailyDeficit,
      proteinGrams,
      daysInGoal,
      projectedEndDate,
      weeklyChangeKg: dailyDeficit > 0 ? Math.round(((dailyDeficit * 7) / 7700) * 1000) / 1000 : 0,
      warnings,
    }
  }

  if (hasExplicitDeadline) {
    daysInGoal = Math.max(7, options.target_days!)
    projectedEndDate = format(addDays(new Date(), daysInGoal), 'yyyy-MM-dd')

    if (weightToLose > 0) {
      const requiredDeficit = Math.round((weightToLose * 7700) / daysInGoal)
      if (requiredDeficit > deficitRange.max * 1.15) {
        warnings.deadlineMismatch = true
        warnings.deadlineMismatchMessage = DEADLINE_MISMATCH_MESSAGE
        if (requiredDeficit > deficitKcalRange(tdee, 'aggressive').max * 1.1) {
          warnings.tooAggressive = true
          warnings.tooAggressiveMessage = TOO_AGGRESSIVE_MESSAGE
        }
      }
      dailyDeficit = Math.min(requiredDeficit, deficitRange.max)
      if (pace === 'aggressive') {
        dailyDeficit = Math.min(requiredDeficit, deficitRange.max)
      } else {
        dailyDeficit = Math.min(Math.max(requiredDeficit, deficitRange.min), deficitRange.max)
      }
    }
  } else if (goal.end_date && goal.start_date && weightToLose > 0) {
    daysInGoal = Math.max(7, differenceInDays(parseISO(goal.end_date), parseISO(goal.start_date)))
    projectedEndDate = goal.end_date
    const requiredDeficit = Math.round((weightToLose * 7700) / daysInGoal)
    if (requiredDeficit > deficitRange.max * 1.15) {
      warnings.deadlineMismatch = true
      warnings.deadlineMismatchMessage = DEADLINE_MISMATCH_MESSAGE
    }
    dailyDeficit = Math.min(Math.max(requiredDeficit, deficitRange.min), deficitRange.max)
  } else {
    if (weightToLose > 0 && weeklyRange.mid > 0) {
      const weeksNeeded = weightToLose / weeklyRange.mid
      daysInGoal = Math.max(7, Math.ceil(weeksNeeded * 7))
    } else {
      daysInGoal = 90
    }
    projectedEndDate = format(addDays(new Date(), daysInGoal), 'yyyy-MM-dd')
    dailyDeficit = deficitRange.mid
  }

  const rawCalories = tdee - dailyDeficit
  const clamped = clampDailyCalories(rawCalories, profile)
  if (clamped.hitFloor) {
    warnings.hitCalorieFloor = true
    if (pace === 'aggressive' || (hasExplicitDeadline && weightToLose > 0)) {
      warnings.tooAggressive = true
      warnings.tooAggressiveMessage = TOO_AGGRESSIVE_MESSAGE
    }
  }

  const actualDeficit = tdee - clamped.kcal
  const proteinGrams = Math.round(leanMass * spec.proteinLeanMultiplier)

  return {
    pace,
    tdee,
    bmr,
    weightKg: weight,
    targetWeightKg: targetWeight,
    weightToLoseKg: weightToLose,
    dailyCalories: clamped.kcal,
    dailyDeficit: actualDeficit,
    proteinGrams,
    daysInGoal,
    projectedEndDate,
    weeklyChangeKg: actualDeficit > 0 ? Math.round(((actualDeficit * 7) / 7700) * 1000) / 1000 : 0,
    warnings,
  }
}

export function buildPacePreviews(
  profile: UserProfile,
  selectedPace: FatLossPace
): PacePreview[] {
  const weight = profile.weight_kg ?? 70
  const tdee = calculateTDEE(profile)

  return (Object.keys(PACE_SPECS) as FatLossPace[]).map(pace => {
    const spec = PACE_SPECS[pace]
    const weekly = weeklyLossKgRange(weight, pace)
    const kcal = dailyCalorieRangeForPace(profile, pace, tdee)
    return {
      pace,
      title: spec.title,
      subtitle: spec.subtitle,
      description: spec.description,
      weeklyLossMinKg: weekly.min,
      weeklyLossMaxKg: weekly.max,
      dailyCalorieMin: kcal.min,
      dailyCalorieMax: kcal.max,
      selected: pace === selectedPace,
    }
  })
}

export function manualPaceDescription(
  profile: UserProfile,
  manualKcal: number
): string | null {
  if (!Number.isFinite(manualKcal) || manualKcal <= 0) return null
  const classified = classifyCaloriesByPace(profile, manualKcal)
  if (classified === 'maintenance') return '以你的身體資料來看，這個熱量接近維持'
  if (classified === 'surplus') return '以你的身體資料來看，這個熱量屬於增重區間'
  return `以你的身體資料來看，這個熱量屬於：${paceLabelZh(classified)}`
}

export function goalPlanOptionsFromPreferences(
  prefs?: {
    fat_loss_pace?: FatLossPace | null
    goal_pace?: FatLossPace | null
    calorie_mode?: 'auto' | 'manual'
    manual_calorie_target?: number | null
  } | null,
  targetDays?: number | null
): GoalPlanOptions {
  return {
    fat_loss_pace: resolveFatLossPace(prefs?.fat_loss_pace ?? prefs?.goal_pace),
    calorie_mode: prefs?.calorie_mode ?? 'auto',
    manual_calorie_target: prefs?.manual_calorie_target ?? null,
    target_days: targetDays,
  }
}
