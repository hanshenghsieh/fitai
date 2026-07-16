'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Dumbbell, ChevronRight, Lightbulb, Repeat2 } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import type { DailyExcessDriver } from '@/lib/engines/calorie-bank-engine'
import type { FoodSlot } from '@/lib/food-slots'
import { sumLoggedCarbs, sumLoggedFat } from '@/lib/food-log-macros'
import { countPendingNutritionLogs } from '@/lib/nutrition/food-log-display'
import TodayMealActions, {
  resolveTodayPrimaryAction,
  type TodayPrimaryAction,
} from '@/components/dashboard/today/TodayMealActions'
import V2PageBackground from './V2PageBackground'
import V2Header from './V2Header'
import V2Card from './V2Card'
import V2ProgressRing from './V2ProgressRing'
import V2NutrientTile from './V2NutrientTile'
import V2MealOverviewPanel, { type MealLabelMode } from './V2MealOverviewPanel'
import V2SectionTitle from './V2SectionTitle'
import CalorieBankMiniCard from './CalorieBankMiniCard'

function calorieTip(remaining: number, overTarget: boolean): string {
  if (overTarget || remaining < 0) return '今天稍微超標了，明天慢慢走回來就好 💚'
  if (remaining > 400) return '熱量還有空間，繼續保持！💪'
  if (remaining > 0) return '快達成今日目標了，下一餐記得均衡搭配'
  return '今天的目標已達成，做得很好！'
}

export interface TodayV2DashboardProps {
  caloriesLogged: number
  caloriesTarget: number
  proteinLogged: number
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  remainingCalories: number
  effectiveMealCalTarget?: number
  proteinGap: number
  overTarget?: boolean
  calorieBank?: CalorieBankRow | null
  excessDriver?: DailyExcessDriver
  calorieFloor?: number
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
  onMoveLog?: (logId: string, slot: FoodSlot) => void
  onEditLog?: (log: FoodLogEntry) => void
  onDeleteLog?: (logId: string) => void
  onOpenPendingQueue?: () => void
  interstitial?: ReactNode
}

export default function TodayV2Dashboard({
  caloriesLogged,
  caloriesTarget,
  proteinLogged,
  proteinTarget,
  carbsTarget,
  fatTarget,
  remainingCalories,
  proteinGap,
  overTarget = false,
  calorieBank = null,
  excessDriver = null,
  calorieFloor,
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
  onMoveLog,
  onEditLog,
  onDeleteLog,
  onOpenPendingQueue,
  interstitial,
}: TodayV2DashboardProps) {
  const [mealLabelMode, setMealLabelMode] = useState<MealLabelMode>('named')
  const carbsLogged = sumLoggedCarbs(foodLogs)
  const fatLogged = sumLoggedFat(foodLogs)
  const todayLabel = format(new Date(), 'M月d日 · EEEE', { locale: zhTW })
  const remaining = Math.max(0, remainingCalories)
  const pendingCount = countPendingNutritionLogs(foodLogs)
  const hasAnyFoodLogs = foodLogs.length > 0
  const primaryAction: TodayPrimaryAction = useMemo(
    () => resolveTodayPrimaryAction({ hasAnyFoodLogs, hasDicePreview }),
    [hasAnyFoodLogs, hasDicePreview]
  )
  const showMealActions = Boolean(onPrimaryMealAction && onTextLog && onPhotoLog && onReroll && !overTarget)

  const toggleMealLabels = () => {
    setMealLabelMode(prev => (prev === 'named' ? 'numbered' : 'named'))
  }

  return (
    <V2PageBackground>
      <V2Header hideRight />

      <div
        className="app-tab-column pb-4 space-y-4"
        style={{ paddingLeft: BB_V2.pagePadding, paddingRight: BB_V2.pagePadding }}
      >
        {/* Main calorie card */}
        <V2Card padding="20px 18px">
          <div className="mb-4">
            <p className="text-[18px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              今天
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
              {todayLabel}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <V2ProgressRing
              label="已攝取"
              value={caloriesLogged}
              consumed={caloriesLogged}
              target={caloriesTarget}
            />
            <div className="flex-1 min-w-0 space-y-3 pl-1">
              <div>
                <p className="text-[12px]" style={{ color: BB_V2.text.secondary }}>
                  每日預算
                </p>
                <p className="text-[20px] tabular-nums" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                  {Math.round(caloriesTarget).toLocaleString()}{' '}
                  <span className="text-[13px] font-normal" style={{ color: BB_V2.text.secondary }}>
                    kcal
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[12px]" style={{ color: BB_V2.text.secondary }}>
                  剩餘可吃
                </p>
                <p className="text-[22px] tabular-nums" style={{ color: BB_V2.accent.green, fontWeight: 700 }}>
                  {remaining.toLocaleString()}{' '}
                  <span className="text-[13px] font-normal" style={{ color: BB_V2.text.secondary }}>
                    kcal
                  </span>
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 self-center" style={{ color: BB_V2.text.muted }} />
          </div>

          <div className="v2-tip-bar mt-4 px-4 py-2.5 flex items-center gap-2 text-[13px]">
            <Lightbulb className="h-4 w-4 shrink-0" style={{ color: BB_V2.accent.green }} />
            <span>{calorieTip(remainingCalories, overTarget)}</span>
          </div>

          <CalorieBankMiniCard
            bank={calorieBank}
            excessDriver={excessDriver}
            overTarget={overTarget}
            calorieFloor={calorieFloor}
            embedded
          />
        </V2Card>

        {/* Protein gap */}
        {proteinTarget > 0 && (
          <V2Card padding="18px">
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="h-5 w-5" style={{ color: BB_V2.accent.green }} />
              <p className="text-[16px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                蛋白質缺口
              </p>
            </div>
            <p className="text-[32px] tabular-nums leading-none" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              {Math.max(0, Math.round(proteinGap))}{' '}
              <span className="text-[16px] font-normal" style={{ color: BB_V2.text.secondary }}>
                g
              </span>
            </p>
            <div className="flex gap-4 mt-2 text-[12px]" style={{ color: BB_V2.text.secondary }}>
              <span>目標 {Math.round(proteinTarget)} g</span>
              <span>已攝取 {Math.round(proteinLogged)} g</span>
            </div>
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: BB_V2.ring.track }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, proteinTarget > 0 ? (proteinLogged / proteinTarget) * 100 : 0)}%`,
                  backgroundColor: BB_V2.accent.green,
                }}
              />
            </div>
            {proteinGap > 0 && (
              <p className="text-[12px] mt-3 px-3 py-2 rounded-xl" style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.secondary }}>
                💡 再攝取約 {Math.round(proteinGap)} g 蛋白質即可達標
              </p>
            )}
          </V2Card>
        )}

        {/* Macros row */}
        <div>
          <V2SectionTitle>三大營養素進度</V2SectionTitle>
          <div className="flex gap-2.5">
            <V2NutrientTile title="碳水化合物" current={carbsLogged} target={carbsTarget} color={BB_V2.macro.carbs} />
            <V2NutrientTile title="蛋白質" current={proteinLogged} target={proteinTarget} color={BB_V2.macro.protein} />
            <V2NutrientTile title="脂肪" current={fatLogged} target={fatTarget} color={BB_V2.macro.fat} />
          </div>
        </div>

        {showMealActions && (
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

        {interstitial}

        {overTarget && (
          <p className="text-[13px] text-center px-2 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
            今天營養量已經很足夠了
          </p>
        )}

        {/* Meal overview stays visible after recommendation and directly above water. */}
        <div>
          <V2SectionTitle
            action={
              <div className="flex items-center gap-2">
                {pendingCount > 0 && onOpenPendingQueue && (
                  <button
                    type="button"
                    onClick={onOpenPendingQueue}
                    className="text-[12px] px-2.5 py-1 rounded-full"
                    style={{ color: BB_V2.accent.green, fontWeight: 600, backgroundColor: BB_V2.bg.softGreen }}
                  >
                    待確認 {pendingCount}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleMealLabels}
                  className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-full touch-manipulation"
                  style={{
                    color: BB_V2.text.secondary,
                    fontWeight: 600,
                    backgroundColor: BB_V2.bg.pill,
                    border: `1px solid ${BB_V2.border}`,
                  }}
                  aria-label={mealLabelMode === 'named' ? '切換為第幾餐' : '切換為早午晚餐'}
                >
                  <Repeat2 className="h-3.5 w-3.5" strokeWidth={BB_V2.iconStroke} />
                  {mealLabelMode === 'named' ? '第幾餐' : '早午晚'}
                </button>
              </div>
            }
          >
            今日飲食總覽
          </V2SectionTitle>
          <V2MealOverviewPanel
            foodLogs={foodLogs}
            labelMode={mealLabelMode}
            onMoveLog={onMoveLog}
            onEditLog={onEditLog}
            onDeleteLog={onDeleteLog}
          />
        </div>
      </div>
    </V2PageBackground>
  )
}
