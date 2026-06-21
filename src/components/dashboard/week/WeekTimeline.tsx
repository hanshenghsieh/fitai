'use client'

import { colors } from '@/lib/design-system'
import type { DayJourneyNode } from '@/lib/weekly-journey'

interface Props {
  journey: DayJourneyNode[]
  todayDayIndex: number
  selectedDay: number | null
  onSelectDay: (dayIndex: number) => void
}

export default function WeekTimeline({ journey, todayDayIndex, selectedDay, onSelectDay }: Props) {
  return (
    <div className="px-5 pb-2">
      <div className="relative pl-6">
        <div
          className="absolute left-[7px] top-3 bottom-3 w-px"
          style={{ backgroundColor: colors.border.subtle }}
        />

        <ul className="space-y-3">
          {journey.map(node => {
            const isToday = node.dayIndex === todayDayIndex
            const isPast = node.dayIndex < todayDayIndex
            const isFuture = node.dayIndex > todayDayIndex
            const isSelected = selectedDay === node.dayIndex

            const dotColor = isToday
              ? colors.accent.action
              : isPast && (node.status === 'done' || node.status === 'rest')
                ? colors.state.complete
                : colors.border.subtle

            return (
              <li key={node.dayIndex} className="relative">
                <span
                  className="absolute -left-6 top-[18px] h-2.5 w-2.5 rounded-full border-2"
                  style={{
                    backgroundColor: isFuture ? colors.bg.canvas : dotColor,
                    borderColor: dotColor,
                    opacity: isFuture ? 0.55 : 1,
                  }}
                />

                <button
                  type="button"
                  onClick={() => onSelectDay(node.dayIndex)}
                  className="w-full text-left rounded-2xl px-4 py-3.5 transition-all"
                  style={{
                    backgroundColor: isToday
                      ? colors.bg.elevated
                      : isSelected
                        ? colors.accent.actionSoft
                        : 'transparent',
                    border: `1px solid ${
                      isToday ? colors.accent.action : isSelected ? colors.border.focus : 'transparent'
                    }`,
                    opacity: isFuture ? 0.72 : isPast && !isSelected ? 0.88 : 1,
                    boxShadow: isToday ? '0 1px 0 rgba(58,56,53,0.04)' : undefined,
                  }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className="text-[15px] font-medium"
                      style={{ color: isToday ? colors.text.primary : colors.text.secondary }}
                    >
                      {node.label}
                      {isToday && (
                        <span className="ml-2 text-[11px] font-normal" style={{ color: colors.accent.action }}>
                          今天
                        </span>
                      )}
                    </p>
                    <span className="text-[11px] shrink-0" style={{ color: colors.text.tertiary }}>
                      {node.workoutHint}
                    </span>
                  </div>
                  <p
                    className="text-[13px] mt-1 leading-relaxed"
                    style={{
                      color: isToday ? colors.text.secondary : colors.text.tertiary,
                    }}
                  >
                    {node.journal}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
