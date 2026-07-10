'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { endOfWeek, format, startOfWeek } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import {
  canNavigateAnalysisWeek,
  initialAnalysisWeekAnchor,
  shiftAnalysisWeekAnchor,
} from '@/lib/analysis/analysis-page-data'
import { loadAnalysisPageData, type AnalysisPageData } from '@/features/analysis/analysis-data-loader'

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
  error: string | null
  refetch: () => Promise<void>
}

export function useAnalysisData(): UseAnalysisDataResult {
  const router = useRouter()
  const [data, setData] = useState<AnalysisPageData | null>(null)
  const [anchorDate, setAnchorDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isWeekTransitioning, setIsWeekTransitioning] = useState(false)
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
      setAnchorDate(prev => prev ?? initialAnalysisWeekAnchor(loaded.todayStr))
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
    void fetchAnalysis('initial')
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
    error,
    refetch,
  }
}
