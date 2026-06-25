'use client'

import { useMemo } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { FoodLogEntry } from '@/lib/banks/types'
import { sumLoggedCarbs, sumLoggedFat } from '@/lib/food-log-macros'
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
}: Props) {
  const carbsLogged = sumLoggedCarbs(foodLogs)
  const fatLogged = sumLoggedFat(foodLogs)

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
          <h2 className="text-[17px] px-1" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            今日餐點
          </h2>
          <div className="space-y-3">
            {sortedLogs.map(log => (
              <MealLogCard key={log.id} log={log} onDelete={onDeleteLog ? () => onDeleteLog(log.id) : undefined} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
