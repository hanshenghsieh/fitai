'use client'

import { useMemo, useState } from 'react'
import { format, addDays } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ShoppingCart, MessageSquare } from 'lucide-react'
import {
  buildWeekJourney,
  simplifyWorkout,
  statusLabel,
} from '@/lib/weekly-journey'
import { colors, cardStyle } from '@/lib/design-system'
import type { WeeklyPlanData, WeeklyFeedback } from '@/types'
import type { UserProfile } from '@/types'
import WeeklyFeedbackForm from './WeeklyFeedbackForm'

interface Props {
  planData: WeeklyPlanData
  weekStart: string
  todayDayIndex: number
  profile?: UserProfile | null
  checkinMap: Record<string, { diet_items: { completed: boolean }[]; workout_items: { completed: boolean }[] } | null>
  existingFeedback: WeeklyFeedback | null
  weekNumber?: number
}

export default function WeeklyPlanView({
  planData,
  weekStart,
  todayDayIndex,
  profile,
  checkinMap,
  existingFeedback,
  weekNumber = 1,
}: Props) {
  const [selectedDay, setSelectedDay] = useState(Math.min(Math.max(todayDayIndex, 0), (planData?.days?.length ?? 1) - 1))
  const [showGrocery, setShowGrocery] = useState(false)
  const [showFeedback, setShowFeedback] = useState(todayDayIndex >= 6)

  const todayPlan = planData?.days?.[selectedDay]

  const journey = useMemo(
    () =>
      buildWeekJourney({
        todayDayIndex,
        checkinMap,
        weekStart,
        workoutTypes: planData.days.map(d => d.workout.type),
        dayCalories: planData.days.map(d => d.daily_targets.calories),
      }),
    [todayDayIndex, checkinMap, weekStart, planData.days]
  )

  if (!todayPlan) {
    return (
      <div className="m-4 p-6 text-center text-[15px]" style={{ color: colors.text.tertiary }}>
        無法載入計畫
      </div>
    )
  }

  const workoutSimple = simplifyWorkout(todayPlan.workout)
  const isWeekend = selectedDay >= 5

  return (
    <div className="px-4 pb-8 space-y-6">
      <Link
        href="/dashboard"
        className="block rounded-2xl p-4 text-[13px] font-medium"
        style={{ ...cardStyle, backgroundColor: colors.accent.actionSoft, color: colors.accent.action }}
      >
        想吃什麼？去 Today 搜尋或記錄 →
      </Link>

      {/* Weekly rhythm — 熱量/蛋白/運動/睡眠 */}
      <div className="rounded-3xl p-5 space-y-3" style={{ ...cardStyle, backgroundColor: colors.bg.elevated }}>
        <p className="text-[13px] font-medium" style={{ color: colors.text.tertiary }}>本週節奏</p>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <Stat label="日均熱量" value={`${planData.weekly_targets.avg_daily_calories} kcal`} />
          <Stat label="日均蛋白" value={`${planData.weekly_targets.avg_daily_protein_g} g`} />
          <Stat label="運動" value={`${planData.weekly_targets.workout_days} 次/週`} />
          <Stat label="睡眠目標" value={`${profile?.sleep_hours_target ?? 7.5} 小時`} />
        </div>
        {planData.goal_snapshot?.weekly_fat_loss_g != null && (
          <p className="text-[12px]" style={{ color: colors.text.secondary }}>
            體重趨勢：每週約 {(planData.goal_snapshot.weekly_fat_loss_g / 1000).toFixed(1)} kg（趨勢，不是考試）
          </p>
        )}
      </div>

      {/* Section 3 — Week Journey */}
      <div className="space-y-2">
        <p className="text-[13px] font-medium px-1" style={{ color: colors.text.tertiary }}>
          這週每天
        </p>
        <div className="space-y-1.5">
          {journey.map(node => {
            const isSelected = node.dayIndex === selectedDay
            const isToday = node.dayIndex === todayDayIndex
            return (
              <button
                key={node.dayIndex}
                type="button"
                onClick={() => setSelectedDay(node.dayIndex)}
                className="w-full text-left rounded-2xl px-4 py-3 transition-all"
                style={{
                  backgroundColor: isSelected ? colors.accent.actionSoft : colors.bg.elevated,
                  border: `1px solid ${isToday ? colors.accent.action : colors.border.subtle}`,
                  opacity: node.dayIndex > todayDayIndex && !isSelected ? 0.85 : 1,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold" style={{ color: colors.text.primary }}>
                      {node.label}
                      {isToday && (
                        <span className="ml-2 text-[11px] font-medium" style={{ color: colors.accent.action }}>
                          今天
                        </span>
                      )}
                    </p>
                    <p className="text-[13px] mt-0.5 truncate" style={{ color: colors.text.secondary }}>
                      {node.mood}
                    </p>
                  </div>
                  <span
                    className="text-[11px] flex-shrink-0 px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: colors.bg.muted,
                      color: colors.text.tertiary,
                    }}
                  >
                    {statusLabel(node.status)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Section 4 — Day detail */}
      <div className="space-y-4">
        <p className="text-[13px] px-1" style={{ color: colors.text.tertiary }}>
          {format(addDays(new Date(weekStart), selectedDay), 'M月d日 EEEE', { locale: zhTW })}
          {isWeekend && ' · 週末模式'}
        </p>

        {isWeekend && (
          <p className="text-[13px] px-1" style={{ color: colors.text.secondary }}>
            週末照你能做到的走，不用報復性節食。
          </p>
        )}

        {/* Workout — simplified */}
        <div className="rounded-2xl p-5 space-y-2" style={cardStyle}>
          <p className="text-[13px] font-medium" style={{ color: colors.text.tertiary }}>
            今天動一下
          </p>
          <p className="text-[17px] font-semibold" style={{ color: colors.text.primary }}>
            {workoutSimple.title}
          </p>
          <p className="text-[14px]" style={{ color: colors.text.secondary }}>
            {workoutSimple.subtitle}
          </p>
          {workoutSimple.duration && (
            <p className="text-[13px]" style={{ color: colors.text.tertiary }}>
              {workoutSimple.duration}
            </p>
          )}
        </div>
      </div>

      {/* Sunday grocery preview */}
      {todayDayIndex >= 6 && planData.grocery_list.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <button
            type="button"
            className="w-full px-4 py-3 flex items-center gap-2 text-left"
            onClick={() => setShowGrocery(!showGrocery)}
          >
            <ShoppingCart className="h-5 w-5" style={{ color: colors.accent.action }} />
            <span className="font-semibold text-[15px] flex-1" style={{ color: colors.text.primary }}>
              下週採買預覽
            </span>
            {showGrocery ? <ChevronUp className="h-4 w-4" style={{ color: colors.text.tertiary }} /> : <ChevronDown className="h-4 w-4" style={{ color: colors.text.tertiary }} />}
          </button>
          {showGrocery && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-[13px]" style={{ color: colors.text.secondary }}>
                週日先看一下，下週比較不用想。
              </p>
              {planData.grocery_list.map(cat => (
                <div key={cat.category}>
                  <p className="text-[12px] font-medium mb-1" style={{ color: colors.text.tertiary }}>
                    {cat.category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map(item => (
                      <span
                        key={item}
                        className="px-2.5 py-1 rounded-full text-[12px]"
                        style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <button
          type="button"
          className="w-full px-4 py-3 flex items-center gap-2 text-left"
          onClick={() => setShowFeedback(!showFeedback)}
        >
          <MessageSquare className="h-5 w-5" style={{ color: colors.accent.action }} />
          <span className="font-semibold text-[15px] flex-1" style={{ color: colors.text.primary }}>
            {existingFeedback ? '本週回饋（已提交）' : '本週回饋（影響下週計畫）'}
          </span>
          {showFeedback ? <ChevronUp className="h-4 w-4" style={{ color: colors.text.tertiary }} /> : <ChevronDown className="h-4 w-4" style={{ color: colors.text.tertiary }} />}
        </button>
        {showFeedback && (
          <div className="px-4 pb-4">
            <WeeklyFeedbackForm existing={existingFeedback} />
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ backgroundColor: colors.bg.muted }}>
      <p className="text-[10px]" style={{ color: colors.text.tertiary }}>{label}</p>
      <p className="font-semibold text-[14px]" style={{ color: colors.text.primary }}>{value}</p>
    </div>
  )
}
