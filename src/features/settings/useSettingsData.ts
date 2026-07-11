'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import type { SettingsBundle } from '@/lib/app/settings-data'
import {
  loadSettingsBundleData,
  loadSettingsMainPageData,
  type SettingsMainPageData,
} from '@/features/settings/settings-data-loader'
import { getLastActiveUserId, readCache, writeCache } from '@/lib/local-cache'
import { invalidateSettingsSave } from '@/lib/local-cache/invalidate'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

async function patchJson(path: string, body: unknown) {
  const res = await apiFetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? '儲存失敗，請稍後再試')
  }
  return res.json().catch(() => null)
}

export interface UseSettingsDataResult {
  data: SettingsMainPageData | null
  isLoading: boolean
  isRefreshing: boolean
  isStale: boolean
  isOffline: boolean
  error: string | null
  refetch: () => Promise<void>
  updateProfile: (body: unknown) => Promise<unknown>
  updateGoals: (body: unknown) => Promise<unknown>
  updateSettings: (body: unknown) => Promise<unknown>
  updatePreferences: (body: unknown) => Promise<unknown>
}

interface SettingsMainCacheEntry {
  userId: string
  data: SettingsMainPageData
}

function readInitialSettingsMainCache(): { data: SettingsMainPageData; isStale: boolean } | null {
  const userId = getLastActiveUserId()
  if (!userId) return null
  const hit = readCache<SettingsMainCacheEntry>('settings', userId, [])
  if (!hit || hit.data.userId !== userId) return null
  return { data: hit.data.data, isStale: hit.isStale }
}

export function useSettingsData(): UseSettingsDataResult {
  const router = useRouter()
  const { isOffline } = useNetworkStatus()
  const initialCache = useMemo(() => readInitialSettingsMainCache(), [])
  const [data, setData] = useState<SettingsMainPageData | null>(initialCache?.data ?? null)
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

  const fetchSettings = useCallback(async (mode: 'initial' | 'refresh') => {
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

      const loaded = await loadSettingsMainPageData(supabase, session.user.id, session.user.email)
      if (!mountedRef.current) return
      setData(loaded)
      setIsStale(false)
      writeCache('settings', session.user.id, [], { userId: session.user.id, data: loaded })
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
    void fetchSettings(initialCache ? 'refresh' : 'initial')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSettings])

  const refetch = useCallback(async () => {
    await fetchSettings(data ? 'refresh' : 'initial')
  }, [data, fetchSettings])

  // Only invalidate after the server confirms the save (patchJson throws on failure).
  const updateProfile = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/profile', body)
    invalidateSettingsSave()
    return result
  }, [])
  const updateGoals = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/goals', body)
    invalidateSettingsSave()
    return result
  }, [])
  const updateSettings = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/body', body)
    invalidateSettingsSave()
    return result
  }, [])
  const updatePreferences = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/preferences', body)
    invalidateSettingsSave()
    return result
  }, [])

  return {
    data,
    isLoading,
    isRefreshing,
    isStale,
    isOffline,
    error,
    refetch,
    updateProfile,
    updateGoals,
    updateSettings,
    updatePreferences,
  }
}

export interface UseSettingsBundleResult {
  data: SettingsBundle | null
  isLoading: boolean
  isRefreshing: boolean
  isStale: boolean
  isOffline: boolean
  error: string | null
  refetch: () => Promise<void>
  updateProfile: (body: unknown) => Promise<unknown>
  updateGoals: (body: unknown) => Promise<unknown>
  updateSettings: (body: unknown) => Promise<unknown>
  updatePreferences: (body: unknown) => Promise<unknown>
}

interface SettingsBundleCacheEntry {
  userId: string
  data: SettingsBundle
}

function readInitialSettingsBundleCache(): { data: SettingsBundle; isStale: boolean } | null {
  const userId = getLastActiveUserId()
  if (!userId) return null
  const hit = readCache<SettingsBundleCacheEntry>('settings-bundle', userId, [])
  if (!hit || hit.data.userId !== userId) return null
  return { data: hit.data.data, isStale: hit.isStale }
}

export function useSettingsBundle(): UseSettingsBundleResult {
  const router = useRouter()
  const { isOffline } = useNetworkStatus()
  const initialCache = useMemo(() => readInitialSettingsBundleCache(), [])
  const [data, setData] = useState<SettingsBundle | null>(initialCache?.data ?? null)
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

  const fetchBundle = useCallback(async (mode: 'initial' | 'refresh') => {
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

      const loaded = await loadSettingsBundleData(supabase, session.user)
      if (!mountedRef.current) return
      setData(loaded)
      setIsStale(false)
      writeCache('settings-bundle', session.user.id, [], {
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
    void fetchBundle(initialCache ? 'refresh' : 'initial')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBundle])

  const refetch = useCallback(async () => {
    await fetchBundle(data ? 'refresh' : 'initial')
  }, [data, fetchBundle])

  // Save must succeed online (patchJson throws on failure). Invalidate cross-page
  // caches only on success, then refetch to rewrite the bundle cache with fresh data.
  const updateProfile = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/profile', body)
    invalidateSettingsSave()
    await refetch()
    return result
  }, [refetch])

  const updateGoals = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/goals', body)
    invalidateSettingsSave()
    await refetch()
    return result
  }, [refetch])

  const updateSettings = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/body', body)
    invalidateSettingsSave()
    await refetch()
    return result
  }, [refetch])

  const updatePreferences = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/preferences', body)
    invalidateSettingsSave()
    await refetch()
    return result
  }, [refetch])

  return {
    data,
    isLoading,
    isRefreshing,
    isStale,
    isOffline,
    error,
    refetch,
    updateProfile,
    updateGoals,
    updateSettings,
    updatePreferences,
  }
}
