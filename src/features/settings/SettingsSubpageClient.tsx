'use client'

import type { ReactNode } from 'react'
import type { SettingsBundle } from '@/lib/app/settings-data'
import { useSettingsBundle } from '@/features/settings/useSettingsData'
import SettingsV2Skeleton from '@/features/settings/SettingsV2Skeleton'
import SettingsErrorState from '@/features/settings/SettingsErrorState'
import SettingsRefreshingBanner from '@/features/settings/SettingsRefreshingBanner'

interface Props {
  children: (bundle: SettingsBundle) => ReactNode
}

export default function SettingsSubpageClient({ children }: Props) {
  const { data, isLoading, isRefreshing, error, refetch } = useSettingsBundle()

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
      {children(data)}
    </div>
  )
}
