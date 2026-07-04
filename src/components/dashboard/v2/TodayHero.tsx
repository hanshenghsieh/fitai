'use client'

import { useMemo } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import { sumLoggedCarbs, sumLoggedFat } from '@/lib/food-log-macros'
import { countPendingNutritionLogs, filterPendingNutritionLogs } from '@/lib/nutrition/food-log-display'
import CalorieRing from './CalorieRing'
import MacroBars from './MacroBars'
import MealLogCard from './MealLogCard'
import BBCard from '@/components/ui/BBCard'
import CalorieBankBanner from '@/components/dashboard/today/CalorieBankBanner'
import TodayMealActions, {
  resolveTodayPrimaryAction,
  type TodayPrimaryAction,
} from '@/components/dashboard/today/TodayMealActions'

interface Props {
  caloriesLogged: number
  caloriesTarget: number
  proteinLogged: number
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  remainingCalories: number
  effectiveMealCalTarget: number
  proteinGap: number
  overTarget?: boolean
  calorieBank?: CalorieBankRow | null
  foodLogs?: FoodLogEntry[]
  hasDicePreview?: boolean
  mealActionsLoading?: boolean
  rerollDisabled?: boolean
  textPhotoDisabled?: boolean
  onPrimaryMealAction?: () => void
  onTextLog?: () => void
  onPhotoLog?: () => void
  onReroll?: () => void
  showReroll?: boolean
  onDeleteLog?: (id: string) => void
  onConfirmNutrition?: (log: FoodLogEntry) => void
  onOpenPendingQueue?: () => void
}

export default function TodayHero({
  caloriesLogged,
  caloriesTarget,
  proteinLogged,
  proteinTarget,
  carbsTarget,
  fatTarget,
  remainingCalories,
  effectiveMealCalTarget,
  proteinGap,
  overTarget = false,
  calorieBank = null,
  foodLogs = [],
  hasDicePreview = false,
  mealActionsLoading = false,
  rerollDisabled = false,
  textPhotoDisabled = false,
  onPrimaryMealAction,
  onTextLog,
  onPhotoLog,
  onReroll,
  showReroll = true,
  onDeleteLog,
  onConfirmNutrition,
  onOpenPendingQueue,
}: Props) {
  const carbsLogged = sumLoggedCarbs(foodLogs)
  const fatLogged = sumLoggedFat(foodLogs)
  const pendingCount = countPendingNutritionLogs(foodLogs)
  const hasAnyFoodLogs = foodLogs.length > 0

  const primaryAction: TodayPrimaryAction = useMemo(
    () => resolveTodayPrimaryAction({ hasAnyFoodLogs, hasDicePreview }),
    [hasAnyFoodLogs, hasDicePreview]
  )

  const sortedLogs = useMemo(
    () => [...foodLogs].sort((a, b) => b.logged_at.localeCompare(a.logged_at)),
    [foodLogs]
  )

  const showMealActions = Boolean(onPrimaryMealAction && onTextLog && onPhotoLog && onReroll)

  return (
    <div className="px-5 pb-2 max-w-[640px] mx-auto space-y-4" style={{ fontFamily: BB_V2.font }}>
      <BBCard className="space-y-5">
        <CalorieRing
          logged={caloriesLogged}
          target={caloriesTarget}
          remaining={remainingCalories}
        />

        {!overTarget && remainingCalories > 0 && effectiveMealCalTarget > 0 && (
          <p className="text-[14px] text-center leading-relaxed px-2" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
            下一餐建議控制在約{' '}
            <span style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
              {Math.round(effectiveMealCalTarget).toLocaleString()} kcal
            </span>
          </p>
        )}

        {proteinGap > 8 && !overTarget && hasAnyFoodLogs && (
          <p className="text-[13px] text-center leading-relaxed px-2" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
            蛋白質還差約 {Math.round(proteinGap)}g，下一餐可以多選肉類或豆製品
          </p>
        )}

        <CalorieBankBanner bank={calorieBank} />

        <div className="pt-2" style={{ borderTop: `1px solid ${BB_V2.divider}` }}>
          <MacroBars
            proteinLogged={proteinLogged}
            proteinTarget={proteinTarget}
            carbsLogged={carbsLogged}
            carbsTarget={carbsTarget}
            fatLogged={fatLogged}
            fatTarget={fatTarget}
          />
        </div>
      </BBCard>

      {showMealActions && !overTarget && (
        <TodayMealActions
          primaryAction={primaryAction}
          primaryLoading={mealActionsLoading}
          primaryDisabled={mealActionsLoading || (primaryAction === 'recommend-meal' && rerollDisabled)}
          rerollDisabled={rerollDisabled}
          textPhotoDisabled={textPhotoDisabled}
          onPrimary={onPrimaryMealAction!}
          onTextLog={onTextLog!}
          onPhotoLog={onPhotoLog!}
          onReroll={onReroll!}
          showReroll={showReroll}
        />
      )}

      {overTarget && (
        <p className="text-[13px] text-center px-4 leading-relaxed" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
          今天營養量已經很足夠了
        </p>
      )}

      {sortedLogs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-[17px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              今日餐點
            </h2>
            {pendingCount > 0 && onOpenPendingQueue && (
              <button
                type="button"
                onClick={onOpenPendingQueue}
                className="text-[13px] px-3 py-1 rounded-full active:opacity-80"
                style={{
                  color: BB_V2.accent.orange,
                  fontWeight: 600,
                  backgroundColor: 'rgba(232, 146, 74, 0.12)',
                }}
              >
                待確認 {pendingCount}
              </button>
            )}
          </div>
          <div className="space-y-3">
            {sortedLogs.map(log => (
              <MealLogCard
                key={log.id}
                log={log}
                onDelete={onDeleteLog ? () => onDeleteLog(log.id) : undefined}
                onConfirmNutrition={onConfirmNutrition}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { filterPendingNutritionLogs }
