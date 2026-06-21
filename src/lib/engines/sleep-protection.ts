/**
 * Sleep protection — recovery first when sleep debt detected.
 */

import { DEFAULT_CALORIE_FLOOR_FEMALE, DEFAULT_CALORIE_FLOOR_MALE } from '@/lib/engines/calorie-bank-engine'

export interface SleepProtectionInput {
  sleepDebt?: boolean
  sleepHoursLastNight?: number | null
  gender?: string | null
  baseFloor?: number
}

export interface SleepProtectionResult {
  active: boolean
  calorieFloorBoost: number
  exerciseIntensityScale: number
}

export function applySleepProtection(input: SleepProtectionInput): SleepProtectionResult {
  const base =
    input.baseFloor ??
    (input.gender === 'female' ? DEFAULT_CALORIE_FLOOR_FEMALE : DEFAULT_CALORIE_FLOOR_MALE)

  const shortSleep =
    input.sleepDebt ||
    (input.sleepHoursLastNight != null && input.sleepHoursLastNight < 6)

  if (!shortSleep) {
    return { active: false, calorieFloorBoost: 0, exerciseIntensityScale: 1 }
  }

  return {
    active: true,
    calorieFloorBoost: Math.min(200, Math.max(0, base * 0.08)),
    exerciseIntensityScale: 0.75,
  }
}
