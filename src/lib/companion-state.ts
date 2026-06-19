import { currentMealSlot } from '@/lib/meal-engine'
import { pickZaiJianLine, type ZaiJianLine, type ZaiJianMoment } from '@/lib/copy/zaijian'
import type { MealType } from '@/lib/checkin-utils'

export interface CompanionContext {
  completionPercent: number
  waterMl: number
  waterTarget: number
  streakDays: number
  isRestDay: boolean
  workoutDone: number
  workoutTotal: number
  mealsCompleted: Record<MealType, boolean>
  hour?: number
  cheatRecovery?: boolean
}

function hourNow() {
  return new Date().getHours()
}

export function detectWeightPlateau(
  measurements: { measured_at: string; weight_kg: number | null }[],
  minDays = 7
): boolean {
  const weights = measurements
    .filter(m => m.weight_kg != null)
    .slice(-minDays)
    .map(m => m.weight_kg as number)
  if (weights.length < minDays) return false
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  return max - min < 0.3
}

export function resolveHomeCompanion(ctx: CompanionContext): ZaiJianLine {
  const hour = ctx.hour ?? hourNow()

  if (ctx.cheatRecovery) return pickZaiJianLine('cheat_recovery')

  if (ctx.streakDays >= 100) return pickZaiJianLine('streak_100')
  if (ctx.streakDays >= 30) return pickZaiJianLine('streak_30')
  if (ctx.streakDays >= 7) return pickZaiJianLine('streak_7')
  if (ctx.completionPercent >= 100) return pickZaiJianLine('success')
  if (hour >= 23) return pickZaiJianLine('late_night')
  if (ctx.isRestDay && ctx.completionPercent < 50) return pickZaiJianLine('rest_day')

  const waterPct = ctx.waterTarget > 0 ? ctx.waterMl / ctx.waterTarget : 1
  if (waterPct < 0.5 && hour >= 14) return pickZaiJianLine('water')

  if (!ctx.isRestDay && ctx.workoutTotal > 0 && ctx.workoutDone === 0 && hour >= 19) {
    return pickZaiJianLine('missed_workout')
  }

  const slot = currentMealSlot()
  if (!ctx.mealsCompleted[slot]) {
    if (slot === 'breakfast') return pickZaiJianLine('breakfast')
    if (slot === 'lunch') return pickZaiJianLine('lunch')
    return pickZaiJianLine('dinner')
  }

  return pickZaiJianLine('home')
}

export function resolveMealCompanion(
  mealType: MealType,
  completed: boolean
): ZaiJianLine {
  if (completed) return pickZaiJianLine('success', mealType)
  const moment: ZaiJianMoment =
    mealType === 'breakfast' ? 'breakfast' : mealType === 'lunch' ? 'lunch' : 'dinner'
  return pickZaiJianLine(moment, mealType)
}

export function resolveWaterCompanion(waterMl: number, waterTarget: number): ZaiJianLine {
  const pct = waterTarget > 0 ? waterMl / waterTarget : 1
  if (pct >= 1) return pickZaiJianLine('success', 'water')
  if (pct < 0.5) return pickZaiJianLine('water')
  return { text: '繼續喝。', expression: 'water', subtext: '快完成了。' }
}

export function resolveWorkoutCompanion(ctx: CompanionContext): ZaiJianLine {
  if (ctx.isRestDay) return pickZaiJianLine('rest_day')
  if (ctx.workoutTotal > 0 && ctx.workoutDone >= ctx.workoutTotal) {
    return pickZaiJianLine('success', 'workout')
  }
  if (ctx.workoutDone === 0 && (ctx.hour ?? hourNow()) >= 20) {
    return pickZaiJianLine('missed_workout')
  }
  return pickZaiJianLine('workout')
}

export function resolveStreakCompanion(streakDays: number): ZaiJianLine | null {
  if (streakDays >= 100) return pickZaiJianLine('streak_100')
  if (streakDays >= 30) return pickZaiJianLine('streak_30')
  if (streakDays >= 7) return pickZaiJianLine('streak_7')
  return null
}
