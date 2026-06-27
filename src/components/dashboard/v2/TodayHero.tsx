'use client'

import { useMemo } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { FoodLogEntry } from '@/lib/banks/types'
import { sumLoggedCarbs, sumLoggedFat } from '@/lib/food-log-macros'
import { countPendingNutritionLogs, filterPendingNutritionLogs } from '@/lib/nutrition/food-log-display'
import CalorieRing from './CalorieRing'
import MacroBars from './MacroBars'
import MealLogCard from './MealLogCard'
import BBCard from '@/components/ui/BBCard'

interface Props {
  caloriesLogged: number
  caloriesTarget: number
  proteinLogged: number
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  overTarget?: boolean
  foodLogs?: FoodLogEntry[]
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
  overTarget = false,
  foodLogs = [],
  onDeleteLog,
  onConfirmNutrition,
  onOpenPendingQueue,
  onRollDice,
  onOpenTextLog,
  showMealActions = false,
}: Props) {
  const carbsLogged = sumLoggedCarbs(foodLogs)
  const fatLogged = sumLoggedFat(foodLogs)
  const pendingCount = countPendingNutritionLogs(foodLogs)

  const sortedLogs = useMemo(
    () => [...foodLogs].sort((a, b) => b.logged_at.localeCompare(a.logged_at)),
    [foodLogs]
  )

  return (
    <div className="px-5 pb-2 max-w-[640px] mx-auto space-y-6" style={{ fontFamily: BB_V2.font }}>
      <BBCard>
        <CalorieRing logged={caloriesLogged} target={caloriesTarget} />
        <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${BB_V2.divider}` }}>
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
