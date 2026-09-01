'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { setAppScrollLocked } from '@/lib/today-actions'
import {
  applyUiPreferencesRuntime,
  hydrateUiPreferencesFromStorage,
} from '@/lib/settings/ui-preferences-runtime'
import {
  invalidateUserPreferencesCache,
  loadUserPreferencesClient,
} from '@/lib/settings/calorie-bank-user-prefs'
import { reconcileLocalReminders } from '@/lib/notifications/local-reminders'

/** Remount page content on tab change and reset scroll so Today UI never bleeds into Week. */
export default function AppRouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    hydrateUiPreferencesFromStorage()
    invalidateUserPreferencesCache()
    const reconcileRuntimeSettings = () => {
      void loadUserPreferencesClient()
        .then(preferences => {
          if (preferences.ui) applyUiPreferencesRuntime(preferences.ui)
          if (preferences.notifications) {
            return reconcileLocalReminders(preferences.notifications)
          }
        })
        .catch(() => {})
    }
    reconcileRuntimeSettings()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') reconcileRuntimeSettings()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    setAppScrollLocked(false)
    window.dispatchEvent(new CustomEvent('betterbit:route-change', { detail: { pathname } }))
    const scrollRoot = document.getElementById('app-scroll-root')
    scrollRoot?.scrollTo(0, 0)
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])

  return (
    // No overflow-x-hidden here: setting only one axis to non-visible makes
    // the UA compute the other axis to 'auto' too (CSS Overflow §3), turning
    // this div into its own scroll container and hijacking position:sticky
    // for every V2Header inside it — the header would stop tracking
    // #app-scroll-root (the real scroller in layout.tsx) and scroll away
    // with the content instead of staying pinned. #app-scroll-root already
    // clips horizontal overflow, so this div doesn't need its own.
    <div key={pathname} className="relative isolate min-h-0">
      {children}
    </div>
  )
}
