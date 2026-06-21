'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { colors } from '@/lib/design-system'
import { simplifyWorkout } from '@/lib/weekly-journey'
import type { DayJourneyNode } from '@/lib/weekly-journey'
import type { DayPlan } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  node: DayJourneyNode | null
  dayPlan: DayPlan | null
  isToday: boolean
}

export default function WeekDaySheet({ open, onClose, node, dayPlan, isToday }: Props) {
  if (!open || !node) return null

  const workout = dayPlan?.workout ? simplifyWorkout(dayPlan.workout) : null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(58, 56, 53, 0.24)' }}
      onClick={onClose}
    >
      <div
        className="max-w-lg mx-auto w-full rounded-t-2xl px-5 pt-5 pb-8"
        style={{ backgroundColor: colors.bg.elevated }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-[13px]" style={{ color: colors.text.tertiary }}>
              {node.dateLabel}
            </p>
            <p className="text-[20px] font-medium mt-1" style={{ color: colors.text.primary }}>
              {node.label}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉" className="p-1">
            <X className="h-5 w-5" style={{ color: colors.text.tertiary }} />
          </button>
        </div>

        <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
          {node.journal}
        </p>

        {workout && (
          <div
            className="mt-5 px-4 py-3.5 rounded-xl space-y-1"
            style={{ backgroundColor: colors.bg.muted }}
          >
            <p className="text-[11px] font-medium tracking-wide" style={{ color: colors.text.tertiary }}>
              這天的運動
            </p>
            <p className="text-[15px] font-medium" style={{ color: colors.text.primary }}>
              {workout.title}
            </p>
            {workout.duration && (
              <p className="text-[13px]" style={{ color: colors.text.tertiary }}>
                {workout.duration}
              </p>
            )}
          </div>
        )}

        {isToday && (
          <Link
            href="/dashboard"
            className="mt-6 block w-full py-3.5 rounded-xl text-center text-[15px] font-medium"
            style={{ backgroundColor: colors.accent.action, color: colors.bg.elevated }}
          >
            去 Today 記今天
          </Link>
        )}

        {!isToday && (
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full py-3 rounded-xl text-[14px] font-medium"
            style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
          >
            關閉
          </button>
        )}
      </div>
    </div>
  )
}
