import { clearFoodLogsSessionCache } from '@/lib/food-log-session-cache'
import { clearTodayOfflineSnapshot } from '@/lib/today-offline-cache'
import { clearWorkoutItemsSessionCache } from '@/lib/workout-items-session-cache'
import { clearWeightMeasurementsSessionCache } from '@/lib/weight-measurements-session-cache'
import { clearPendingSync } from '@/lib/offline-pending-sync'
import { getNutritionDayKey } from '@/lib/timezone'

/**
 * Clear device-local caches that are date-scoped but not user-scoped.
 * Must run on logout / login / register so account switches don't bleed data.
 */
export function clearUserLocalState(): void {
  if (typeof window === 'undefined') return

  const today = getNutritionDayKey()
  clearFoodLogsSessionCache(today)
  clearTodayOfflineSnapshot()
  clearWorkoutItemsSessionCache(today)
  clearWeightMeasurementsSessionCache()
  clearPendingSync()

  try {
    const sessionKeys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (!key) continue
      if (
        key.startsWith('bb_food_logs_') ||
        key.startsWith('bb_workout_items_') ||
        key.startsWith('dice-session-')
      ) {
        sessionKeys.push(key)
      }
    }
    for (const key of sessionKeys) sessionStorage.removeItem(key)
  } catch {
    // ignore
  }

  try {
    void import('@/lib/apple-iap-client').then(m => m.resetAppleIapConfiguration?.())
  } catch {
    // ignore
  }
}
