'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import type { SettingsBundle } from '@/lib/app/settings-data'
import {
  loadSettingsBundleData,
  loadSettingsMainPageData,
  type SettingsMainPageData,
} from '@/features/settings/settings-data-loader'

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
  error: string | null
  refetch: () => Promise<void>
  updateProfile: (body: unknown) => Promise<unknown>
  updateGoals: (body: unknown) => Promise<unknown>
  updateSettings: (body: unknown) => Promise<unknown>
  updatePreferences: (body: unknown) => Promise<unknown>
}

export function useSettingsData(): UseSettingsDataResult {
  const router = useRouter()
  const [data, setData] = useState<SettingsMainPageData | null>(null)
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
    void fetchSettings('initial')
  }, [fetchSettings])

  const refetch = useCallback(async () => {
    await fetchSettings(data ? 'refresh' : 'initial')
  }, [data, fetchSettings])

  const updateProfile = useCallback((body: unknown) => patchJson('/api/settings/profile', body), [])
  const updateGoals = useCallback((body: unknown) => patchJson('/api/settings/goals', body), [])
  const updateSettings = useCallback((body: unknown) => patchJson('/api/settings/body', body), [])
  const updatePreferences = useCallback(
    (body: unknown) => patchJson('/api/settings/preferences', body),
    []
  )

  return {
    data,
    isLoading,
    isRefreshing,
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
  error: string | null
  refetch: () => Promise<void>
  updateProfile: (body: unknown) => Promise<unknown>
  updateGoals: (body: unknown) => Promise<unknown>
  updateSettings: (body: unknown) => Promise<unknown>
  updatePreferences: (body: unknown) => Promise<unknown>
}

export function useSettingsBundle(): UseSettingsBundleResult {
  const router = useRouter()
  const [data, setData] = useState<SettingsBundle | null>(null)
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
    void fetchBundle('initial')
  }, [fetchBundle])

  const refetch = useCallback(async () => {
    await fetchBundle(data ? 'refresh' : 'initial')
  }, [data, fetchBundle])

  const updateProfile = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/profile', body)
    await refetch()
    return result
  }, [refetch])

  const updateGoals = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/goals', body)
    await refetch()
    return result
  }, [refetch])

  const updateSettings = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/body', body)
    await refetch()
    return result
  }, [refetch])

  const updatePreferences = useCallback(async (body: unknown) => {
    const result = await patchJson('/api/settings/preferences', body)
    await refetch()
    return result
  }, [refetch])

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch,
    updateProfile,
    updateGoals,
    updateSettings,
    updatePreferences,
  }
}
