'use client'

import { colors } from '@/lib/design-system'
import { GENTLE_ERROR_MESSAGE } from '@/lib/copy/gentle-errors'
import NotificationPrompt from '@/components/dashboard/NotificationPrompt'
import BetterBitHome from '@/components/dashboard/BetterBitHome'
import GeneratePlanButton from '@/components/dashboard/GeneratePlanButton'
import TodayPlanEmpty from '@/components/dashboard/today/TodayPlanEmpty'
import ZaiJianPanel from '@/components/character/ZaiJianPanel'
import ZaiJian from '@/components/character/ZaiJian'
import { userMemoryFromCheckin } from '@/lib/checkin-utils'
import { useTodayData } from '@/features/today/useTodayData'
import TodayV2Skeleton from '@/features/today/TodayV2Skeleton'
import TodayErrorState from '@/features/today/TodayErrorState'
import TodayRefreshingBanner from '@/features/today/TodayRefreshingBanner'

const PLAN_FAILED_LINE = {
  text: GENTLE_ERROR_MESSAGE,
  expression: 'normal' as const,
  subtext: '再試一次就好。',
}

export default function TodayPageClient() {
  const { data, isLoading, isRefreshing, error, refetch } = useTodayData()

  if (isLoading && !data) {
    return <TodayV2Skeleton />
  }

  if (error && !data) {
    return <TodayErrorState onRetry={() => void refetch()} />
  }

  if (!data) {
    return <TodayV2Skeleton />
  }

  const {
    userId,
    todayStr,
    weeklyPlan,
    planData,
    todayPlan,
    checkin,
    goalSnapshot,
    safeDayIndex,
    profile,
    foodDna,
    dayOfWeek,
    recentMissedDays,
    recentFoodLogs,
    trialDaysLeft,
    initialFoodLogs,
    planGenerateError,
  } = data

  return (
    <div className="max-w-lg mx-auto relative" style={{ backgroundColor: colors.bg.canvas }}>
      {isRefreshing ? <TodayRefreshingBanner /> : null}
      <NotificationPrompt />

      {weeklyPlan?.generation_status === 'generating' && <ZaiJianPanel moment="loading" />}

      {weeklyPlan?.generation_status === 'failed' && (
        <div className="m-4 space-y-4">
          <ZaiJian size="md" line={PLAN_FAILED_LINE} layout="bubble" />
          <GeneratePlanButton onPlanGenerated={() => void refetch()} />
        </div>
      )}

      {!weeklyPlan || !planData?.days?.length ? (
        <TodayPlanEmpty
          failed={Boolean(planGenerateError)}
          errorMessage={planGenerateError}
          onPlanGenerated={() => void refetch()}
        />
      ) : todayPlan ? (
        <BetterBitHome
          key={`${userId}:${todayStr}`}
          todayPlan={todayPlan}
          checkin={checkin}
          weeklyPlanId={weeklyPlan?.id ?? null}
          goalSnapshot={goalSnapshot}
          dayIndex={safeDayIndex}
          profile={profile}
          foodDna={foodDna}
          dayOfWeek={dayOfWeek}
          recentMissedDays={recentMissedDays}
          recentFoodLogs={recentFoodLogs}
          trialDaysLeft={trialDaysLeft}
          initialFoodLogs={initialFoodLogs.length ? initialFoodLogs : (userMemoryFromCheckin(checkin ?? null).food_logs_today ?? [])}
        />
      ) : (
        <TodayPlanEmpty
          failed={Boolean(planGenerateError)}
          errorMessage={planGenerateError}
          onPlanGenerated={() => void refetch()}
        />
      )}
    </div>
  )
}
