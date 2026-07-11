'use client'

import RecordV2Screen from '@/components/record/RecordV2Screen'
import { useRecordData } from '@/features/record/useRecordData'
import RecordV2Skeleton from '@/features/record/RecordV2Skeleton'
import RecordErrorState from '@/features/record/RecordErrorState'
import RecordRefreshingBanner from '@/features/record/RecordRefreshingBanner'
import StaleDataBanner from '@/features/shared/StaleDataBanner'

export default function RecordPageClient() {
  const {
    selectedDate,
    setSelectedDate,
    data,
    isLoading,
    isRefreshing,
    isDateTransitioning,
    isOffline,
    error,
    refetch,
  } = useRecordData()

  if (isLoading && !data) {
    return <RecordV2Skeleton />
  }

  if (error && !data) {
    return <RecordErrorState onRetry={() => void refetch()} />
  }

  if (!data || !selectedDate) {
    return <RecordV2Skeleton />
  }

  const showRefreshing = isRefreshing || isDateTransitioning
  const showStaleBanner = (Boolean(error) || isOffline) && !showRefreshing

  return (
    <div className="relative">
      {showRefreshing ? (
        <RecordRefreshingBanner label={isDateTransitioning ? '載入中...' : '同步中...'} />
      ) : null}
      {showStaleBanner ? <StaleDataBanner /> : null}
      <RecordV2Screen
        todayStr={data.todayStr}
        checkins={data.checkins}
        dayPlansByDate={data.dayPlansByDate}
        fallbackTargets={data.fallbackTargets}
        calorieBankEnabled={data.calorieBankEnabled}
        weeklyPlanId={data.weeklyPlanId}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        onRefresh={() => void refetch()}
        contentFadeKey={showRefreshing ? selectedDate : undefined}
      />
    </div>
  )
}
