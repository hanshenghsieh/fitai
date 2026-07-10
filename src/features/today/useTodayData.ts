'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loadTodayPageData, type TodayPageData } from '@/features/today/today-data-loader'

export interface UseTodayDataResult {
  data: TodayPageData | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: (updater: (prev: TodayPageData | null) => TodayPageData | null) => void
}

export function useTodayData(): UseTodayDataResult {
  const router = useRouter()
  const [data, setData] = useState<TodayPageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
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

      const loaded = await loadTodayPageData(supabase, session.user)
      if (!mountedRef.current) return
      setData(loaded)
    } catch (err) {
      if (!mountedRef.current) return
      const message = err instanceof Error ? err.message : '目前連線不穩，請稍後再試'
      setError(message)
    } finally {
      if (!mountedRef.current) return
      if (mode === 'initial') setIsLoading(false)
      else setIsRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    void fetchToday('initial')
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
    error,
    refetch,
    mutate,
  }
}
