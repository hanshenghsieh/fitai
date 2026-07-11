'use client'

import type { ReactNode } from 'react'
import type { SettingsBundle } from '@/lib/app/settings-data'
import { useSettingsBundle } from '@/features/settings/useSettingsData'
import SettingsV2Skeleton from '@/features/settings/SettingsV2Skeleton'
import SettingsErrorState from '@/features/settings/SettingsErrorState'
import SettingsRefreshingBanner from '@/features/settings/SettingsRefreshingBanner'
import StaleDataBanner from '@/features/shared/StaleDataBanner'

interface Props {
  children: (bundle: SettingsBundle) => ReactNode
}

export default function SettingsSubpageClient({ children }: Props) {
  const { data, isLoading, isRefreshing, isOffline, error, refetch } = useSettingsBundle()

  if (isLoading && !data) {
    return <SettingsV2Skeleton />
  }

  if (error && !data) {
    return <SettingsErrorState onRetry={() => void refetch()} />
  }

  if (!data) {
    return <SettingsV2Skeleton />
  }

  const showStaleBanner = (Boolean(error) || isOffline) && !isRefreshing

  return (
    <div className="relative">
      {isRefreshing ? <SettingsRefreshingBanner /> : null}
      {showStaleBanner ? <StaleDataBanner /> : null}
      {children(data)}
    </div>
  )
}
