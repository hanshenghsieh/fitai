'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AccessStatus } from '@/lib/subscription-access'
import PremiumScreen from '@/components/premium/PremiumScreen'
import { loadPremiumPageData } from '@/features/settings/settings-data-loader'
import SettingsV2Skeleton from '@/features/settings/SettingsV2Skeleton'
import SettingsErrorState from '@/features/settings/SettingsErrorState'
import SettingsRefreshingBanner from '@/features/settings/SettingsRefreshingBanner'
import { appRoute } from '@/lib/navigation/routes'

export default function PremiumPageClient() {
  const router = useRouter()
  const [access, setAccess] = useState<AccessStatus | null>(null)
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

  const fetchPremium = useCallback(async (mode: 'initial' | 'refresh') => {
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
        router.replace(appRoute('/login'))
        return
      }

      const loaded = await loadPremiumPageData(supabase, session.user.id, session.user.email)
      if (!mountedRef.current) return
      setAccess(loaded.access)
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
    void fetchPremium('initial')
  }, [fetchPremium])

  const refetch = useCallback(async () => {
    await fetchPremium(access ? 'refresh' : 'initial')
  }, [access, fetchPremium])

  if (isLoading && !access) {
    return <SettingsV2Skeleton />
  }

  if (error && !access) {
    return <SettingsErrorState onRetry={() => void refetch()} />
  }

  if (!access) {
    return <SettingsV2Skeleton />
  }

  return (
    <div className="relative">
      {isRefreshing ? <SettingsRefreshingBanner /> : null}
      <PremiumScreen access={access} />
    </div>
  )
}
