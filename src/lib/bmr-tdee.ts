import type { UserProfile } from '@/types'

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
      ? profile.muscle_mass_kg + weight * 0.1
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

export { ACTIVITY_MULTIPLIERS }
