'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loadRecordPageData, type RecordPageData } from '@/features/record/record-data-loader'

export interface UseRecordDataResult {
  selectedDate: string | null
  setSelectedDate: (date: string) => void
  data: RecordPageData | null
  isLoading: boolean
  isRefreshing: boolean
  isDateTransitioning: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: (updater: (prev: RecordPageData | null) => RecordPageData | null) => void
}

export function useRecordData(): UseRecordDataResult {
  const router = useRouter()
  const [data, setData] = useState<RecordPageData | null>(null)
  const [selectedDate, setSelectedDateState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDateTransitioning, setIsDateTransitioning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const dateTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (dateTransitionTimerRef.current) clearTimeout(dateTransitionTimerRef.current)
    }
  }, [])

  const fetchRecord = useCallback(async (mode: 'initial' | 'refresh') => {
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

      const loaded = await loadRecordPageData(supabase, session.user.id)
      if (!mountedRef.current) return
      setData(loaded)
      setSelectedDateState(prev => prev ?? loaded.todayStr)
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
    void fetchRecord('initial')
  }, [fetchRecord])

  const refetch = useCallback(async () => {
    await fetchRecord(data ? 'refresh' : 'initial')
  }, [data, fetchRecord])

  const mutate = useCallback((updater: (prev: RecordPageData | null) => RecordPageData | null) => {
    setData(prev => updater(prev))
  }, [])

  const setSelectedDate = useCallback((date: string) => {
    setIsDateTransitioning(true)
    setSelectedDateState(date)
    if (dateTransitionTimerRef.current) clearTimeout(dateTransitionTimerRef.current)
    dateTransitionTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setIsDateTransitioning(false)
    }, 220)
  }, [])

  return {
    selectedDate,
    setSelectedDate,
    data,
    isLoading,
    isRefreshing,
    isDateTransitioning,
    error,
    refetch,
    mutate,
  }
}
