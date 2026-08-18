'use client'

import { useEffect, useState } from 'react'
import { isNativeIOS } from '@/lib/capacitor-native'
import { getNativeAppInfo } from '@/lib/native-app-info'
import { apiFetchJson } from '@/lib/api/client'
import { decideUpdate, type UpdateDecision } from '@/lib/update-decision'

const CHECK_TIMEOUT_MS = 5_000
const NONE: UpdateDecision = { kind: 'none' }

/**
 * Runs the version-update check exactly once per app launch (this hook's
 * caller — AppUpdateGate, mounted once at the root layout — persists across
 * client-side route changes in the App Router, so this effect naturally
 * never re-fires on navigation, satisfying "same session, at most once").
 *
 * Web (betterbit.app) is intentionally untouched: this hook no-ops unless
 * isNativeIOS() — the whole "installed App Store version" concept doesn't
 * apply to a continuously-deployed web app.
 *
 * Fail-open contract: ANY failure (App.getInfo() throwing, fetch timing
 * out, network error, non-2xx response, malformed JSON, a config missing
 * required fields) resolves to `{ kind: 'none' }` — never a required-update
 * lock. See decide-update.ts's isValidReleaseConfig for the single
 * validation gate this relies on.
 */
export function useAppUpdateCheck(): UpdateDecision {
  const [decision, setDecision] = useState<UpdateDecision>(NONE)

  useEffect(() => {
    if (!isNativeIOS()) return

    let cancelled = false

    void (async () => {
      try {
        const info = await getNativeAppInfo()
        if (!info) return
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)

        let payload: { config: unknown }
        try {
          payload = await apiFetchJson<{ config: unknown }>(
            `/api/app-release-config?platform=ios`,
            { signal: controller.signal }
          )
        } finally {
          clearTimeout(timer)
        }

        if (cancelled) return
        setDecision(decideUpdate(payload.config, info.version))
      } catch {
        // Fail open — see module doc comment. Network error, timeout,
        // App.getInfo() rejecting, or apiFetchJson throwing on a non-2xx
        // response all land here and leave the decision at 'none'.
        if (!cancelled) setDecision(NONE)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return decision
}
