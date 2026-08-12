import { apiFetch } from '@/lib/api/client'
import { isCapacitorNative } from '@/lib/capacitor-native'
import type { AnalyticsEventInput, Platform } from './events'

export function detectAnalyticsPlatform(): Platform {
  return isCapacitorNative() ? 'ios' : 'web'
}

/**
 * Client-side event emission — fire-and-forget POST to /api/analytics/track.
 * Analytics must never break or block the product experience: failures are
 * swallowed, never thrown or surfaced to the caller.
 */
export function trackClient(event: AnalyticsEventInput): void {
  void apiFetch('/api/analytics/track', {
    method: 'POST',
    body: JSON.stringify({
      name: event.name,
      properties: event.properties,
      platform: detectAnalyticsPlatform(),
    }),
  }).catch(() => {
    // Swallow — analytics failures must not affect the user-facing flow.
  })
}
