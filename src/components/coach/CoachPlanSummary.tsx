'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { colors, cardStyle } from '@/lib/design-system'
import { formatDeficitPlain, formatProteinPlain, formatWeeklyFatLoss } from '@/lib/coach-copy'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'
import type { DayPlan } from '@/types'

interface GoalSnapshot {
  daily_deficit?: number
  lean_mass_kg?: number
  weekly_fat_loss_g?: number
  target_weight?: number | null
  tdee?: number
}

interface Props {
  todayPlan: DayPlan
  goalSnapshot?: GoalSnapshot | null
  weekNumber?: number
  coachNote?: string | null
  todayLabel?: string
  compact?: boolean
}

export default function CoachPlanSummary({
  todayPlan,
  goalSnapshot,
  weekNumber,
  coachNote,
  todayLabel,
  compact = false,
}: Props) {
  const targets = todayPlan.daily_targets
  const deficit = goalSnapshot?.daily_deficit ?? 0
  const workout = todayPlan.workout
  const [dateLabel, setDateLabel] = useState(todayLabel ?? '')

  useEffect(() => {
    if (!todayLabel) {
      setDateLabel(format(new Date(), 'M月d日 EEEE', { locale: zhTW }))
    }
  }, [todayLabel])

  const noteLines = coachNote?.split('\n').filter(Boolean).slice(0, compact ? 2 : 3) ?? []
  const wasRegenerated = coachNote?.startsWith('【已依最新數據重算】')
  const zaiLine = pickZaiJianLine('success')

  return (
    <div
      className={`rounded-2xl space-y-3 ${compact ? 'p-4' : 'p-5'}`}
      style={{ ...cardStyle, backgroundColor: colors.bg.elevated }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.accent.action }}>
            你的計畫
          </p>
          <p className="text-[15px] font-semibold mt-0.5" style={{ color: colors.text.primary }}>
            {dateLabel || '今日'}
            {weekNumber != null && weekNumber > 0 && (
              <span className="text-[13px] font-normal ml-2" style={{ color: colors.text.tertiary }}>
                第 {weekNumber} 週
              </span>
            )}
          </p>
        </div>
        {goalSnapshot?.target_weight != null && (
          <p className="text-[12px] text-right" style={{ color: colors.text.secondary }}>
            目標 {goalSnapshot.target_weight} kg
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="今日熱量" value={`${targets.calories} kcal`} />
        <Metric label="蛋白質" value={`${targets.protein_g} g`} />
        {deficit > 0 && (
          <Metric label="熱量缺口" value={`-${deficit}`} unit="kcal/天" span={2} />
        )}
        {workout && (
          <Metric
            label="今日運動"
            value={workout.type === 'rest' ? '休息' : workout.type_zh}
            unit={
              workout.type !== 'rest'
                ? `${workout.estimated_duration_mins} 分${
                    targets.exercise_burn_kcal
                      ? ` · 約 ${targets.exercise_burn_kcal} kcal`
                      : ''
                  }`
                : undefined
            }
            span={2}
          />
        )}
        {targets.net_deficit_kcal != null && targets.net_deficit_kcal > 0 && targets.exercise_burn_kcal > 0 && (
          <p className="text-[11px] col-span-2" style={{ color: colors.text.tertiary }}>
            運動日已調整攝取，淨赤字約 {targets.net_deficit_kcal} kcal
          </p>
        )}
      </div>

      {deficit > 0 && !compact && (
        <p className="text-[12px] leading-relaxed" style={{ color: colors.text.secondary }}>
          {formatDeficitPlain(deficit)}。{formatProteinPlain(targets.protein_g, goalSnapshot?.lean_mass_kg)}。
          {goalSnapshot?.weekly_fat_loss_g
            ? ` ${formatWeeklyFatLoss(goalSnapshot.weekly_fat_loss_g)}。`
            : ''}
        </p>
      )}

      {noteLines.length > 0 && (
        <div
          className="rounded-xl px-3 py-2.5 text-[12px] leading-relaxed space-y-1"
          style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
        >
          {noteLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      {wasRegenerated && (
        <ZaiJian size="xs" line={{ ...zaiLine, subtext: '照新計畫做就好。' }} layout="inline" />
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  unit,
  span = 1,
}: {
  label: string
  value: string
  unit?: string
  span?: number
}) {
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{
        backgroundColor: colors.bg.muted,
        gridColumn: span === 2 ? 'span 2 / span 2' : undefined,
      }}
    >
      <p className="text-[10px]" style={{ color: colors.text.tertiary }}>{label}</p>
      <p className="text-[14px] font-semibold" style={{ color: colors.text.primary }}>
        {value}
        {unit && <span className="text-[11px] font-normal ml-1" style={{ color: colors.text.tertiary }}>{unit}</span>}
      </p>
    </div>
  )
}
