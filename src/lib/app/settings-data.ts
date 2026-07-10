import type { SupabaseClient } from '@supabase/supabase-js'
import type { Goal, UserProfile } from '@/types'
import type { BodyMeasurement } from '@/types'
import { loadBodyMeasurementsForUser } from '@/lib/app/analytics-data'
import { mergePreferences, type UserSettingsPreferences } from '@/lib/settings/user-settings-types'

export const PROFILE_SELECT =
  'id, display_name, gender, age, height_cm, weight_kg, body_fat_pct, muscle_mass_kg, activity_level, fitness_level, is_vegetarian, is_vegan, is_halal, is_gluten_free, allergens, disliked_foods, cuisine_preference, cooking_time_mins, food_budget, equipment, injuries, health_conditions, sleep_hours_target, water_ml_target, onboarding_completed, created_at, updated_at, settings_preferences'

export const GOAL_SELECT =
  'id, user_id, goal_type, target_weight_kg, target_body_fat_pct, start_date, end_date, start_weight_kg, start_body_fat_pct, is_active, created_at'

export interface SettingsBundle {
  profile: UserProfile & { settings_preferences?: UserSettingsPreferences | null }
  goal: Goal | null
  email: string | null
  preferences: UserSettingsPreferences
  measurements: BodyMeasurement[]
  authProvider: 'email' | 'oauth' | 'unknown'
}

function resolveAuthProvider(user: {
  app_metadata?: Record<string, unknown>
  identities?: { provider?: string }[]
}): 'email' | 'oauth' | 'unknown' {
  const provider = user.app_metadata?.provider as string | undefined
  if (provider && provider !== 'email') return 'oauth'
  const oauthIdentity = user.identities?.find(i => i.provider && i.provider !== 'email')
  if (oauthIdentity) return 'oauth'
  return 'email'
}

export async function loadSettingsBundle(
  supabase: SupabaseClient,
  userId: string,
  user: Parameters<typeof resolveAuthProvider>[0] & { email?: string | null }
): Promise<SettingsBundle> {
  const baseSelect = PROFILE_SELECT.replace(', settings_preferences', '')

  const [{ data: profileRow, error: profileErr }, { data: goalRow }, measurements] = await Promise.all([
    supabase.from('user_profiles').select(PROFILE_SELECT).eq('id', userId).single(),
    supabase
      .from('goals')
      .select(GOAL_SELECT)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadBodyMeasurementsForUser(supabase, userId),
  ])

  let profile = profileRow
  if (profileErr?.message?.includes('settings_preferences')) {
    const fallback = await supabase.from('user_profiles').select(baseSelect).eq('id', userId).single()
    profile = fallback.data as typeof profileRow
  }

  const rawPrefs =
    profile && 'settings_preferences' in profile
      ? (profile.settings_preferences as UserSettingsPreferences | null)
      : null

  return {
    profile: (profile ?? { id: userId }) as SettingsBundle['profile'],
    goal: (goalRow as Goal | null) ?? null,
    email: user.email ?? null,
    preferences: mergePreferences(rawPrefs),
    measurements: measurements as BodyMeasurement[],
    authProvider: resolveAuthProvider(user),
  }
}
