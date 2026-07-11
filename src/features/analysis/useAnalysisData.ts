'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { endOfWeek, format, startOfWeek } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import {
  canNavigateAnalysisWeek,
  initialAnalysisWeekAnchor,
  shiftAnalysisWeekAnchor,
} from '@/lib/analysis/analysis-page-data'
import { loadAnalysisPageData, type AnalysisPageData } from '@/features/analysis/analysis-data-loader'
import { getNutritionDayKey } from '@/lib/timezone'
import { getLastActiveUserId, readCache, writeCache } from '@/lib/local-cache'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export interface UseAnalysisDataResult {
  selectedWeekStart: string | null
  selectedWeekEnd: string | null
  goPreviousWeek: () => void
  goNextWeek: () => void
  canGoNextWeek: boolean
  anchorDate: Date | null
  data: AnalysisPageData | null
  isLoading: boolean
  isRefreshing: boolean
  isWeekTransitioning: boolean
  isStale: boolean
  isOffline: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface AnalysisCacheEntry {
  userId: string
  data: AnalysisPageData
}

function readInitialAnalysisCache(): { data: AnalysisPageData; isStale: boolean } | null {
  const userId = getLastActiveUserId()
  if (!userId) return null
  const hit = readCache<AnalysisCacheEntry>('analysis', userId, [getNutritionDayKey()])
  if (!hit || hit.data.userId !== userId) return null
  return { data: hit.data.data, isStale: hit.isStale }
}

export function useAnalysisData(): UseAnalysisDataResult {
  const router = useRouter()
  const { isOffline } = useNetworkStatus()
  const initialCache = useMemo(() => readInitialAnalysisCache(), [])
  const [data, setData] = useState<AnalysisPageData | null>(initialCache?.data ?? null)
  const [anchorDate, setAnchorDate] = useState<Date | null>(
    initialCache ? initialAnalysisWeekAnchor(initialCache.data.todayStr) : null
  )
  const [isLoading, setIsLoading] = useState(!initialCache)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isWeekTransitioning, setIsWeekTransitioning] = useState(false)
  const [isStale, setIsStale] = useState(initialCache?.isStale ?? false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const weekTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (weekTransitionTimerRef.current) clearTimeout(weekTransitionTimerRef.current)
    }
  }, [])

  const fetchAnalysis = useCallback(async (mode: 'initial' | 'refresh') => {
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

      const loaded = await loadAnalysisPageData(supabase, session.user.id)
      if (!mountedRef.current) return
      setData(loaded)
      setIsStale(false)
      setAnchorDate(prev => prev ?? initialAnalysisWeekAnchor(loaded.todayStr))
      writeCache('analysis', session.user.id, [loaded.todayStr], {
        userId: session.user.id,
        data: loaded,
      })
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
    void fetchAnalysis(initialCache ? 'refresh' : 'initial')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAnalysis])

  const refetch = useCallback(async () => {
    await fetchAnalysis(data ? 'refresh' : 'initial')
  }, [data, fetchAnalysis])

  const beginWeekTransition = useCallback(() => {
    setIsWeekTransitioning(true)
    if (weekTransitionTimerRef.current) clearTimeout(weekTransitionTimerRef.current)
    weekTransitionTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setIsWeekTransitioning(false)
    }, 220)
  }, [])

  const goPreviousWeek = useCallback(() => {
    if (!anchorDate) return
    beginWeekTransition()
    setAnchorDate(prev => shiftAnalysisWeekAnchor(prev!, -1))
  }, [anchorDate, beginWeekTransition])

  const goNextWeek = useCallback(() => {
    if (!anchorDate || !data) return
    if (!canNavigateAnalysisWeek(anchorDate, 1, data.todayStr)) return
    beginWeekTransition()
    setAnchorDate(prev => shiftAnalysisWeekAnchor(prev!, 1))
  }, [anchorDate, data, beginWeekTransition])

  const selectedWeekStart = anchorDate
    ? format(startOfWeek(anchorDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    : null
  const selectedWeekEnd = anchorDate
    ? format(endOfWeek(anchorDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    : null
  const canGoNextWeek = anchorDate && data
    ? canNavigateAnalysisWeek(anchorDate, 1, data.todayStr)
    : false

  return {
    selectedWeekStart,
    selectedWeekEnd,
    goPreviousWeek,
    goNextWeek,
    canGoNextWeek,
    anchorDate,
    data,
    isLoading,
    isRefreshing,
    isWeekTransitioning,
    isStale,
    isOffline,
    error,
    refetch,
  }
}
