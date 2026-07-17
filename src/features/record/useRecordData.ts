'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loadRecordPageData, type RecordPageData } from '@/features/record/record-data-loader'
import { getNutritionDayKey } from '@/lib/timezone'
import { getLastActiveUserId, readCache, writeCache } from '@/lib/local-cache'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { isLocalDateKey } from '@/lib/timezone'
import { traceRecordDate } from '@/lib/record-date-trace'

const RECORD_SELECTED_DATE_KEY = 'betterbit:record:selected-date'

function readStoredSelectedDate(): string | null {
  if (typeof window === 'undefined') return null
  const value = window.sessionStorage.getItem(RECORD_SELECTED_DATE_KEY)
  return isLocalDateKey(value) ? value : null
}

export interface UseRecordDataResult {
  selectedDate: string | null
  setSelectedDate: (date: string) => void
  data: RecordPageData | null
  isLoading: boolean
  isRefreshing: boolean
  isDateTransitioning: boolean
  isStale: boolean
  isOffline: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: (updater: (prev: RecordPageData | null) => RecordPageData | null) => void
}

interface RecordCacheEntry {
  userId: string
  data: RecordPageData
}

function readInitialRecordCache(): { data: RecordPageData; isStale: boolean } | null {
  const userId = getLastActiveUserId()
  if (!userId) return null
  const hit = readCache<RecordCacheEntry>('record', userId, [getNutritionDayKey()])
  if (!hit || hit.data.userId !== userId) return null
  return { data: hit.data.data, isStale: hit.isStale }
}

export function useRecordData(): UseRecordDataResult {
  const router = useRouter()
  const { isOffline } = useNetworkStatus()
  const initialCache = useMemo(() => readInitialRecordCache(), [])
  const [data, setData] = useState<RecordPageData | null>(initialCache?.data ?? null)
  const [selectedDate, setSelectedDateState] = useState<string | null>(
    readStoredSelectedDate() ?? initialCache?.data.todayStr ?? null
  )
  const [isLoading, setIsLoading] = useState(!initialCache)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDateTransitioning, setIsDateTransitioning] = useState(false)
  const [isStale, setIsStale] = useState(initialCache?.isStale ?? false)
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
      for (const row of loaded.checkins) {
        try {
          const logs = (
            JSON.parse(row.notes || '{}') as {
              user_memory?: { food_logs_today?: Array<{ id?: string; logged_at?: string; slot?: string }> }
            }
          ).user_memory?.food_logs_today ?? []
          for (const log of logs) {
            traceRecordDate('record-loader-persisted-row', {
              checkinDate: row.checkin_date,
              loggedAt: log.logged_at,
              loggedAtLocalDate: log.logged_at
                ? getNutritionDayKey(new Date(log.logged_at))
                : null,
              mealSlot: log.slot,
              foodLogId: log.id,
              persisted: true,
            })
          }
        } catch {
          traceRecordDate('record-loader-row-parse-failed', {
            checkinDate: row.checkin_date,
            reason: 'invalid-notes-json',
          })
        }
      }
      setData(loaded)
      setIsStale(false)
      setSelectedDateState(prev =>
        prev && isLocalDateKey(prev) && prev <= loaded.todayStr ? prev : loaded.todayStr
      )
      writeCache('record', session.user.id, [loaded.todayStr], {
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
    void fetchRecord(initialCache ? 'refresh' : 'initial')
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    window.sessionStorage.setItem(RECORD_SELECTED_DATE_KEY, date)
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
    isStale,
    isOffline,
    error,
    refetch,
    mutate,
  }
}
