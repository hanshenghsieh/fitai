/**
 * @deprecated Legacy journal timeline (週一–週日 + workout hints).
 * Do not use in tab routes — `/weekly` renders `WeekScreen` (Week V2 AI Coach).
 */
'use client'

import { useMemo, useState } from 'react'
import { buildWeekJourney, buildWeekPosture } from '@/lib/weekly-journey'
import WeekHeader from '@/components/dashboard/week/WeekHeader'
import WeekTimeline from '@/components/dashboard/week/WeekTimeline'
import WeekDaySheet from '@/components/dashboard/week/WeekDaySheet'
import WeekReflection from '@/components/dashboard/week/WeekReflection'
import type { WeeklyPlanData, WeeklyFeedback } from '@/types'

interface Props {
  planData: WeeklyPlanData
  weekStart: string
  todayDayIndex: number
  checkinMap: Record<string, { diet_items: { completed: boolean }[]; workout_items: { completed: boolean }[] } | null>
  existingFeedback: WeeklyFeedback | null
}

export default function LegacyWeekTimeline({
  planData,
  weekStart,
  todayDayIndex,
  checkinMap,
  existingFeedback,
}: Props) {
  const safeToday = Math.min(Math.max(todayDayIndex, 0), (planData.days?.length ?? 1) - 1)
  const [sheetDay, setSheetDay] = useState<number | null>(null)

  const journey = useMemo(
    () =>
      buildWeekJourney({
        todayDayIndex: safeToday,
        checkinMap,
        weekStart,
        workoutTypes: planData.days.map(d => d.workout.type),
        workoutLabels: planData.days.map(d => d.workout.type_zh),
      }),
    [safeToday, checkinMap, weekStart, planData.days]
  )

  const posture = useMemo(() => buildWeekPosture(safeToday, journey), [safeToday, journey])

  const sheetNode = sheetDay != null ? journey[sheetDay] ?? null : null
  const sheetPlan = sheetDay != null ? planData.days[sheetDay] ?? null : null
  const showReflection = safeToday >= 4 || !!existingFeedback

  if (!planData.days?.length) {
    return (
      <div className="m-4 p-6 text-center text-[15px]" style={{ color: '#9A9690' }}>
        無法載入計畫
      </div>
    )
  }

  return (
    <>
      <WeekHeader posture={posture} />
      <WeekTimeline
        journey={journey}
        todayDayIndex={safeToday}
        selectedDay={sheetDay}
        onSelectDay={setSheetDay}
      />
      <WeekReflection existing={existingFeedback} showPrompt={showReflection} />
      <WeekDaySheet
        open={sheetDay != null}
        onClose={() => setSheetDay(null)}
        node={sheetNode}
        dayPlan={sheetPlan}
        isToday={sheetDay === safeToday}
      />
    </>
  )
}
