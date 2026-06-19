'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { colors, cardStyle } from '@/lib/design-system'
import type { UserBanks } from '@/lib/banks/types'

interface GoalSnapshot {
  weeks_remaining?: number
  target_weight?: number | null
  weekly_fat_loss_g?: number
}

interface Props {
  banks: UserBanks
  goalSnapshot?: GoalSnapshot | null
}

export default function SystemStatus({ banks, goalSnapshot }: Props) {
  const [open, setOpen] = useState(false)

  const weeks = goalSnapshot?.weeks_remaining
  const exerciseLeft = banks.exercise.remainingSessions

  return (
    <div className="px-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-2xl p-4 flex items-center justify-between text-left"
        style={{ ...cardStyle, backgroundColor: colors.bg.muted }}
      >
        <span className="text-[12px]" style={{ color: colors.text.tertiary }}>
          系統狀態（可選）
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" style={{ color: colors.text.tertiary }} />
        ) : (
          <ChevronDown className="h-4 w-4" style={{ color: colors.text.tertiary }} />
        )}
      </button>

      {open && (
        <div
          className="mt-2 rounded-2xl p-4 space-y-2 text-[13px]"
          style={{ ...cardStyle, backgroundColor: colors.bg.elevated }}
        >
          {weeks != null && (
            <p style={{ color: colors.text.secondary }}>
              目標軌道：約 {weeks} 週
              {goalSnapshot?.weekly_fat_loss_g
                ? ` · 每週約 ${(goalSnapshot.weekly_fat_loss_g / 1000).toFixed(1)} kg`
                : ''}
            </p>
          )}
          {exerciseLeft > 0 && (
            <p style={{ color: colors.text.secondary }}>
              這週運動：還有 {exerciseLeft} 次可補
            </p>
          )}
          {banks.protein.gapG > 10 && (
            <p style={{ color: colors.text.secondary }}>
              蛋白質：還差約 {Math.round(banks.protein.gapG)}g（睡前補一點就好）
            </p>
          )}
          <p className="text-[11px] pt-1" style={{ color: colors.text.tertiary }}>
            數字在背後跑。你不用盯。
          </p>
        </div>
      )}
    </div>
  )
}
