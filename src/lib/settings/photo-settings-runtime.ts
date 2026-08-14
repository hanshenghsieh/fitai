import type { FoodSlot } from '@/lib/food-slots'
import { defaultFoodSlot, mealHoursFromLogs } from '@/lib/food-slots'
import {
  DEFAULT_PHOTO_SETTINGS,
  mergePreferences,
  type PhotoConfirmMode,
  type PhotoSettings,
  type UserSettingsPreferences,
} from '@/lib/settings/user-settings-types'
import { apiFetch } from '@/lib/api/client'

const CONFIDENCE_SCORE_THRESHOLD = 70

let cachedPhotoSettings: PhotoSettings | null = null

export function invalidatePhotoSettingsCache(): void {
  cachedPhotoSettings = null
}

export async function loadPhotoSettingsRuntime(): Promise<PhotoSettings> {
  if (cachedPhotoSettings) return cachedPhotoSettings
  try {
    const res = await apiFetch('/api/settings/preferences')
    if (res.ok) {
      const data = (await res.json()) as { preferences?: UserSettingsPreferences | null }
      cachedPhotoSettings = mergePreferences(data.preferences).photo ?? DEFAULT_PHOTO_SETTINGS
      return cachedPhotoSettings
    }
  } catch {
    /* fall through */
  }
  cachedPhotoSettings = DEFAULT_PHOTO_SETTINGS
  return cachedPhotoSettings
}

export function isLowConfidencePhotoResult(params: {
  nutrition_confidence?: string | null
  match_score?: number | null
  nutrition_status?: string | null
}): boolean {
  const confidence = params.nutrition_confidence
  if (confidence === 'A' || confidence === 'user_confirmed') return false
  if (confidence === 'B') return true
  if (confidence === 'C' || confidence === 'Unknown') return true
  if (params.match_score != null && Number.isFinite(params.match_score)) {
    return params.match_score < CONFIDENCE_SCORE_THRESHOLD
  }
  if (params.nutrition_status === 'unknown') return true
  return true
}

export function shouldRequirePhotoConfirmation(
  confirmMode: PhotoConfirmMode,
  result: {
    nutrition_confidence?: string | null
    match_score?: number | null
    nutrition_status?: string | null
  }
): boolean {
  if (confirmMode === 'always') return true
  if (confirmMode === 'auto') return false
  return isLowConfidencePhotoResult(result)
}

/**
 * Build 38 BUG 7 — a confirmed AI/compound-DB estimate already went through
 * the user's explicit review one screen earlier ("這樣記錄可以" ->
 * accuracy.answers.user_confirmed). Re-opening NutritionConfirmationSheet
 * for it re-derives "do we have usable nutrition data" from a fresh DB-name
 * search (resolvePortionContextFromLog / findSimilarVerifiedItems) that has
 * no way to know a real, confirmed estimate already exists — for a
 * descriptive AI-generated label with no DB match, that search wrongly
 * concludes "目前沒有可信營養資料" even though the confirmed estimate was
 * just saved with real macros. An already-confirmed save must skip the
 * second-look prompt entirely; only genuinely-unconfirmed saves (e.g. a
 * fresh Level A auto-resolve, or a create_unknown photo-only save) still go
 * through it.
 */
export function shouldReopenPhotoConfirmation(
  userConfirmed: boolean,
  confirmMode: PhotoConfirmMode,
  result: {
    nutrition_confidence?: string | null
    match_score?: number | null
    nutrition_status?: string | null
  }
): boolean {
  if (userConfirmed) return false
  return shouldRequirePhotoConfirmation(confirmMode, result)
}

/** Map settings meal-slot auto rules to FoodSlot. */
export function resolvePhotoMealSlot(params: {
  settings: PhotoSettings
  hour: number
  recentLogHours?: number[]
  fallback?: FoodSlot
}): FoodSlot {
  if (params.settings.default_meal_slot === 'manual') {
    return params.fallback ?? defaultFoodSlot(params.hour, params.recentLogHours)
  }

  const fixed = params.settings.default_meal_slot
  if (fixed !== 'auto' && fixed !== 'manual') {
    return fixed
  }

  if (params.hour >= 5 && params.hour < 10.5) return 'meal1'
  if (params.hour >= 10.5 && params.hour < 14) return 'meal2'
  if (params.hour >= 14 && params.hour < 17) return 'other'
  if (params.hour >= 17 && params.hour < 21) return 'meal3'
  return 'before_sleep'
}

export function resolvePhotoMealSlotFromLogs(
  settings: PhotoSettings,
  hour: number,
  logs: { logged_at: string }[]
): FoodSlot {
  return resolvePhotoMealSlot({
    settings,
    hour,
    recentLogHours: mealHoursFromLogs(logs),
  })
}
