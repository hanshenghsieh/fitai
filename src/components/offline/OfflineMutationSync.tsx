'use client'

import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { isCapacitorNative } from '@/lib/capacitor-native'
import { createClient } from '@/lib/supabase/client'
import {
  makeRetryableMutationsDueNow,
  nextRetryAtForUser,
  OFFLINE_MUTATION_EVENT,
  OFFLINE_MUTATION_REPLAY_EVENT,
  resumeAuthBlockedMutations,
} from '@/lib/offline-mutation-queue'
import { replayPendingMutations } from '@/lib/offline-mutation-replay'

const MAX_TIMER_MS = 2_147_000_000

export default function OfflineMutationSync() {
  const userIdRef = useRef<string | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runRef = useRef<() => void>(() => {})

  useEffect(() => {
    const supabase = createClient()
    let disposed = false
    let removeAppListener: (() => void) | undefined

    const clearTimer = () => {
      if (!retryTimerRef.current) return
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }

    const scheduleNext = (userId: string) => {
      clearTimer()
      const nextAt = nextRetryAtForUser(userId)
      if (!nextAt) return
      const delay = Math.min(
        MAX_TIMER_MS,
        Math.max(0, Date.parse(nextAt) - Date.now())
      )
      retryTimerRef.current = setTimeout(() => runRef.current(), delay)
    }

    const run = async () => {
      const userId = userIdRef.current
      if (!userId || disposed) return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      await replayPendingMutations({ userId })
      if (!disposed && userIdRef.current === userId) scheduleNext(userId)
    }
    runRef.current = () => void run()

    const setAuthenticatedUser = (userId: string | null, resumeAuth: boolean) => {
      userIdRef.current = userId
      clearTimer()
      if (!userId) return
      if (resumeAuth) resumeAuthBlockedMutations(userId)
      runRef.current()
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!disposed) setAuthenticatedUser(data.session?.user.id ?? null, true)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (disposed) return
      setAuthenticatedUser(session?.user.id ?? null, Boolean(session))
    })

    const onQueueChange = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail
      if (detail?.userId && detail.userId !== userIdRef.current) return
      runRef.current()
    }
    const onOnline = () => {
      const userId = userIdRef.current
      if (!userId) return
      makeRetryableMutationsDueNow(userId)
      runRef.current()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') runRef.current()
    }

    window.addEventListener(OFFLINE_MUTATION_EVENT, onQueueChange)
    window.addEventListener(OFFLINE_MUTATION_REPLAY_EVENT, onQueueChange)
    window.addEventListener('online', onOnline)
    window.addEventListener('pageshow', runRef.current)
    document.addEventListener('visibilitychange', onVisible)

    if (isCapacitorNative()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) runRef.current()
      }).then(handle => {
        removeAppListener = () => void handle.remove()
      })
    }

    return () => {
      disposed = true
      clearTimer()
      authListener.subscription.unsubscribe()
      removeAppListener?.()
      window.removeEventListener(OFFLINE_MUTATION_EVENT, onQueueChange)
      window.removeEventListener(OFFLINE_MUTATION_REPLAY_EVENT, onQueueChange)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('pageshow', runRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}
