'use client'

import AnalysisV2Screen from '@/components/analysis/AnalysisV2Screen'
import { useAnalysisData } from '@/features/analysis/useAnalysisData'
import AnalysisV2Skeleton from '@/features/analysis/AnalysisV2Skeleton'
import AnalysisErrorState from '@/features/analysis/AnalysisErrorState'
import AnalysisRefreshingBanner from '@/features/analysis/AnalysisRefreshingBanner'
import StaleDataBanner from '@/features/shared/StaleDataBanner'

export default function AnalysisPageClient() {
  const {
    anchorDate,
    goPreviousWeek,
    goNextWeek,
    canGoNextWeek,
    data,
    isLoading,
    isRefreshing,
    isWeekTransitioning,
    isOffline,
    error,
    refetch,
  } = useAnalysisData()

  if (isLoading && !data) {
    return <AnalysisV2Skeleton />
  }

  if (error && !data) {
    return <AnalysisErrorState onRetry={() => void refetch()} />
  }

  if (!data || !anchorDate) {
    return <AnalysisV2Skeleton />
  }

  const showRefreshing = isRefreshing || isWeekTransitioning
  const showStaleBanner = (Boolean(error) || isOffline) && !showRefreshing

  return (
    <div className="relative">
      {showRefreshing ? (
        <AnalysisRefreshingBanner label={isWeekTransitioning ? '載入中...' : '同步中...'} />
      ) : null}
      {showStaleBanner ? <StaleDataBanner /> : null}
      <AnalysisV2Screen
        todayStr={data.todayStr}
        measurements={data.measurements}
        checkins={data.checkins}
        targets={data.targets}
        dayPlansByDate={data.dayPlansByDate}
        currentWeightKg={data.currentWeightKg}
        profileWeightKg={data.profileWeightKg}
        anchorDate={anchorDate}
        onNavigateWeek={direction => {
          if (direction === -1) goPreviousWeek()
          else goNextWeek()
        }}
        canGoNextWeek={canGoNextWeek}
        onRefresh={() => void refetch()}
        isWeekTransitioning={isWeekTransitioning}
      />
    </div>
  )
}
