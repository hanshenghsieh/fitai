'use client'

import { colors } from '@/lib/design-system'
import { GENTLE_ERROR_MESSAGE } from '@/lib/copy/gentle-errors'
import NotificationPrompt from '@/components/dashboard/NotificationPrompt'
import BetterBitHome from '@/components/dashboard/BetterBitHome'
import ZaiJianPanel from '@/components/character/ZaiJianPanel'
import ZaiJian from '@/components/character/ZaiJian'
import { userMemoryFromCheckin } from '@/lib/checkin-utils'
import { useTodayData } from '@/features/today/useTodayData'
import { buildFallbackTodayPlan } from '@/features/today/fallback-today-plan'
import TodayV2Skeleton from '@/features/today/TodayV2Skeleton'
import TodayErrorState from '@/features/today/TodayErrorState'
import TodayRefreshingBanner from '@/features/today/TodayRefreshingBanner'
import StaleDataBanner from '@/features/shared/StaleDataBanner'
import { safeGeneratePlanErrorForDisplay } from '@/lib/generate-plan-errors'

const PLAN_FAILED_LINE = {
  text: GENTLE_ERROR_MESSAGE,
  expression: 'normal' as const,
  subtext: '再試一次就好。',
}

export default function TodayPageClient() {
  const { data, isLoading, isRefreshing, isOffline, error, refetch } = useTodayData()

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
    goal,
    foodDna,
    dayOfWeek,
    recentMissedDays,
    recentFoodLogs,
    trialDaysLeft,
    initialFoodLogs,
    planGenerateError,
  } = data

  const showStaleBanner = Boolean(data) && (Boolean(error) || isOffline) && !isRefreshing

  if (!todayPlan && planGenerateError) {
    return (
      <TodayErrorState
        onRetry={() => void refetch()}
        title="個人計畫暫時無法載入"
        detail={safeGeneratePlanErrorForDisplay(planGenerateError)}
      />
    )
  }

  const resolvedTodayPlan =
    todayPlan ?? buildFallbackTodayPlan(todayStr, profile, goal, safeDayIndex)

  if (!profile?.onboarding_completed) {
    return <TodayV2Skeleton />
  }

  if (!resolvedTodayPlan) {
    return (
      <TodayErrorState
        onRetry={() => void refetch()}
        title="個人計畫尚未完成"
        detail={planGenerateError ?? '請重新整理；若仍未完成，請回到設定確認身體資料與目標。'}
      />
    )
  }

  return (
    <div className="relative w-full" style={{ backgroundColor: colors.bg.canvas }}>
      {isRefreshing ? <TodayRefreshingBanner /> : null}
      {showStaleBanner ? <StaleDataBanner /> : null}
      <NotificationPrompt />

      {weeklyPlan?.generation_status === 'generating' && <ZaiJianPanel moment="loading" />}

      {weeklyPlan?.generation_status === 'failed' && (
        <div className="m-4">
          <ZaiJian size="md" line={PLAN_FAILED_LINE} layout="bubble" />
        </div>
      )}

      <BetterBitHome
        key={`${userId}:${todayStr}:${planData?.days?.length ?? 0}`}
        userId={userId}
        todayPlan={resolvedTodayPlan}
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
        initialFoodLogs={
          initialFoodLogs.length ? initialFoodLogs : (userMemoryFromCheckin(checkin ?? null).food_logs_today ?? [])
        }
      />
    </div>
  )
}
