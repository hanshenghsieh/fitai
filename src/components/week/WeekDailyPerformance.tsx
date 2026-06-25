'use client'

import { BB_V2 } from '@/lib/betterbit-v2'
import type { WeekDayCard } from '@/lib/analytics/week-summary'
import BBIcon from '@/components/icons/BBIcon'
import { scoreSignalIcon } from '@/components/icons'
import BBCard from '@/components/ui/BBCard'
import {
  daySignalBorder,
  daySignalSurface,
  daySignalTextColor,
} from './week-colors'

interface Props {
  days: WeekDayCard[]
  selectedDate: string | null
  onSelect: (date: string | null) => void
}

const signalTone: Record<WeekDayCard['signal'], 'success' | 'warning' | 'danger' | 'muted'> = {
  green: 'success',
  yellow: 'warning',
  red: 'danger',
  neutral: 'muted',
}

export default function WeekDailyPerformance({ days, selectedDate, onSelect }: Props) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h2 className="text-[17px]" style={{ color: 'var(--bb-text-primary)', fontWeight: 700 }}>
          本週每日表現
        </h2>
        <span className="text-[12px]" style={{ color: 'var(--bb-text-secondary)' }}>
          點擊查看每日細節
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {days.map(day => {
          const selected = selectedDate === day.date
          const scoreColor = day.score != null ? daySignalTextColor(day.signal) : 'var(--bb-text-secondary)'
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(selected ? null : day.date)}
              className="shrink-0 w-[52px] rounded-2xl transition-transform active:scale-95"
              style={{
                border: `2px solid ${daySignalBorder(day.signal, day.isToday)}`,
                backgroundColor: daySignalSurface(day.signal, day.isToday),
                boxShadow: selected ? BB_V2.shadow.card : 'none',
                padding: '10px 6px',
              }}
              aria-pressed={selected}
            >
              {day.isToday && (
                <p className="text-[10px] mb-0.5" style={{ color: 'var(--bb-text-accent)', fontWeight: 600 }}>
                  今天
                </p>
              )}
              <p className="text-[12px]" style={{ color: 'var(--bb-text-secondary)' }}>
                {day.weekdayShort}
              </p>
              <p className="text-[18px] tabular-nums my-1" style={{ color: scoreColor, fontWeight: 700 }}>
                {day.score != null ? day.score : '—'}
              </p>
              <div className="flex justify-center" aria-hidden>
                <BBIcon name={scoreSignalIcon(day.signal)} size={18} tone={signalTone[day.signal]} />
              </div>
              {day.isToday && day.todayStatus && (
                <p
                  className="text-[9px] mt-1 leading-tight"
                  style={{ color: daySignalTextColor(day.signal), fontWeight: 600 }}
                >
                  {day.todayStatus}
                </p>
              )}
            </button>
          )
        })}
      </div>
      {selectedDate && (
        <BBCard className="mt-3" padding={16}>
          {(() => {
            const d = days.find(x => x.date === selectedDate)
            if (!d || d.score == null) {
              return (
                <p className="text-[14px]" style={{ color: 'var(--bb-text-secondary)' }}>
                  這天還沒有紀錄
                </p>
              )
            }
            return (
              <div className="space-y-2 text-[14px]">
                <p style={{ color: daySignalTextColor(d.signal), fontWeight: 600 }}>
                  {d.weekdayLabel} · {d.score} 分
                </p>
                <p style={{ color: 'var(--bb-text-secondary)' }}>
                  熱量 {d.calories} kcal · 蛋白質 {d.protein_g}g · 脂肪 {d.fat_g}g
                </p>
                {d.issues.length > 0 && (
                  <ul className="space-y-1">
                    {d.issues.map(issue => (
                      <li key={issue} className="flex items-start gap-1.5" style={{ color: 'var(--bb-text-danger)' }}>
                        <BBIcon name="warning" size={14} tone="danger" className="mt-0.5" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })()}
        </BBCard>
      )}
    </section>
  )
}
