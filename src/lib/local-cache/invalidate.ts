import { clearNamespace } from './index'
import { getLastActiveUserId } from './storage'

/**
 * Unified cache invalidation for mutations. Call ONLY after the server / API
 * confirms success — 1F does not do optimistic offline writes.
 *
 * userId defaults to the last active user (the person currently signed in on
 * this device), which is what every mutation path needs.
 */
function resolveUserId(userId?: string | null): string | null {
  return userId || getLastActiveUserId()
}

/** Meal added / edited / deleted → today + record + analysis views may change. */
export function invalidateMealMutation(userId?: string | null): void {
  const uid = resolveUserId(userId)
  if (!uid) return
  clearNamespace('today', uid)
  clearNamespace('record', uid)
  clearNamespace('analysis', uid)
}

/** Body data (weight / body fat) added or edited → analysis + settings + today targets. */
export function invalidateBodyData(userId?: string | null): void {
  const uid = resolveUserId(userId)
  if (!uid) return
  clearNamespace('analysis', uid)
  clearNamespace('settings', uid)
  clearNamespace('settings-bundle', uid)
  clearNamespace('today', uid)
}

/** Goals / profile / preferences saved → settings + today + analysis. */
export function invalidateSettingsSave(userId?: string | null): void {
  const uid = resolveUserId(userId)
  if (!uid) return
  clearNamespace('settings', uid)
  clearNamespace('settings-bundle', uid)
  clearNamespace('today', uid)
  clearNamespace('analysis', uid)
}
