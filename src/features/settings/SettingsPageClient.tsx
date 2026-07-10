'use client'

import SettingsV2Screen from '@/components/betterbit-v2/settings/SettingsV2Screen'
import { useSettingsData } from '@/features/settings/useSettingsData'
import SettingsV2Skeleton from '@/features/settings/SettingsV2Skeleton'
import SettingsErrorState from '@/features/settings/SettingsErrorState'
import SettingsRefreshingBanner from '@/features/settings/SettingsRefreshingBanner'

export default function SettingsPageClient() {
  const { data, isLoading, isRefreshing, error, refetch } = useSettingsData()

  if (isLoading && !data) {
    return <SettingsV2Skeleton />
  }

  if (error && !data) {
    return <SettingsErrorState onRetry={() => void refetch()} />
  }

  if (!data) {
    return <SettingsV2Skeleton />
  }

  return (
    <div className="relative">
      {isRefreshing ? <SettingsRefreshingBanner /> : null}
      <SettingsV2Screen access={data.access} appVersion={data.appVersion} />
    </div>
  )
}
