'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loadTodayPageData, type TodayPageData } from '@/features/today/today-data-loader'
import { getNutritionDayKey } from '@/lib/timezone'
import { getLastActiveUserId, readCache, writeCache } from '@/lib/local-cache'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export interface UseTodayDataResult {
  data: TodayPageData | null
  isLoading: boolean
  isRefreshing: boolean
  isStale: boolean
  isOffline: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: (updater: (prev: TodayPageData | null) => TodayPageData | null) => void
}

function readInitialTodayCache(): { data: TodayPageData; isStale: boolean } | null {
  const userId = getLastActiveUserId()
  if (!userId) return null
  const hit = readCache<TodayPageData>('today', userId, [getNutritionDayKey()])
  if (!hit || hit.data.userId !== userId) return null
  return { data: hit.data, isStale: hit.isStale }
}

export function useTodayData(): UseTodayDataResult {
  const router = useRouter()
  const { isOffline } = useNetworkStatus()
  const initialCache = useMemo(() => readInitialTodayCache(), [])
  const [data, setData] = useState<TodayPageData | null>(initialCache?.data ?? null)
  const [isLoading, setIsLoading] = useState(!initialCache)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isStale, setIsStale] = useState(initialCache?.isStale ?? false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchToday = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true)
    else setIsRefreshing(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        router.replace('/login')
        return
      }

      // Cached data from a different account must never be shown.
      if (mountedRef.current) {
        setData(prev => (prev && prev.userId !== session.user.id ? null : prev))
      }

      const loaded = await loadTodayPageData(supabase, session.user)
      if (!mountedRef.current) return
      setData(loaded)
      setIsStale(false)
      writeCache('today', loaded.userId, [loaded.todayStr], loaded)
    } catch (err) {
      if (!mountedRef.current) return
      const message = err instanceof Error ? err.message : '目前連線不穩，請稍後再試'
      // Keep last-known data on screen; only surface a blocking error when empty.
      setError(message)
    } finally {
      if (!mountedRef.current) return
      if (mode === 'initial') setIsLoading(false)
      else setIsRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    void fetchToday(initialCache ? 'refresh' : 'initial')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchToday])

  const refetch = useCallback(async () => {
    await fetchToday(data ? 'refresh' : 'initial')
  }, [data, fetchToday])

  const mutate = useCallback((updater: (prev: TodayPageData | null) => TodayPageData | null) => {
    setData(prev => updater(prev))
  }, [])

  return {
    data,
    isLoading,
    isRefreshing,
    isStale,
    isOffline,
    error,
    refetch,
    mutate,
  }
}
