'use client'

import SettingsV2Screen from '@/components/betterbit-v2/settings/SettingsV2Screen'
import { useSettingsData } from '@/features/settings/useSettingsData'
import SettingsV2Skeleton from '@/features/settings/SettingsV2Skeleton'
import SettingsErrorState from '@/features/settings/SettingsErrorState'
import SettingsRefreshingBanner from '@/features/settings/SettingsRefreshingBanner'
import StaleDataBanner from '@/features/shared/StaleDataBanner'

export default function SettingsPageClient() {
  const { data, isLoading, isRefreshing, isOffline, error, refetch } = useSettingsData()

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
      <SettingsV2Screen access={data.access} appVersion={data.appVersion} />
    </div>
  )
}
