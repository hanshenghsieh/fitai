import type { BodyMeasurement, UserProfile } from '@/types'

export type BodyMetricsSource = 'measurement' | 'profile' | 'onboarding' | 'none'

export interface ResolvedBodyMetrics {
  weightKg: number | null
  bodyFatPct: number | null
  waistCm: number | null
  muscleMassKg: number | null
  source: BodyMetricsSource
  latestMeasurement: BodyMeasurement | null
}

/** Canonical resolver — Settings, Analysis, and Today should share this priority. */
export function resolveLatestBodyMetrics(params: {
  measurements: BodyMeasurement[]
  profile: Pick<UserProfile, 'weight_kg' | 'body_fat_pct' | 'muscle_mass_kg'>
  onboardingWeightKg?: number | null
  onboardingBodyFatPct?: number | null
}): ResolvedBodyMetrics {
  const latest = params.measurements.length > 0 ? params.measurements.at(-1)! : null

  const weightKg =
    latest?.weight_kg ?? params.profile.weight_kg ?? params.onboardingWeightKg ?? null
  const bodyFatPct =
    latest?.body_fat_pct ?? params.profile.body_fat_pct ?? params.onboardingBodyFatPct ?? null

  let source: BodyMetricsSource = 'none'
  if (latest?.weight_kg != null) source = 'measurement'
  else if (params.profile.weight_kg != null) source = 'profile'
  else if (params.onboardingWeightKg != null) source = 'onboarding'

  return {
    weightKg,
    bodyFatPct,
    waistCm: latest?.waist_cm ?? null,
    muscleMassKg: latest?.muscle_mass_kg ?? params.profile.muscle_mass_kg ?? null,
    source,
    latestMeasurement: latest,
  }
}
