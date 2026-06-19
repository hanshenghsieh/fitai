'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import { colors, cardStyle } from '@/lib/design-system'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import { buildPlateauStory } from '@/lib/plateau-story'
import { detectWeightPlateau } from '@/lib/companion-state'
import { buildFatBank } from '@/lib/fat-bank'
import ZaiJian from '@/components/character/ZaiJian'
import type { BodyMeasurement, Goal } from '@/types'

interface GoalSnapshot {
  fat_to_lose_kg?: number
  weekly_fat_loss_g?: number
  weeks_remaining?: number
  target_weight?: number | null
}

interface WeekStats {
  week_start: string
  week_number: number
  previous_completion_rate: number | null
  previous_workout_rate: number | null
}

interface Props {
  measurements: BodyMeasurement[]
  plans: WeekStats[]
  goal: Goal | null
  goalSnapshot?: GoalSnapshot | null
}

export default function ProgressCharts({ measurements, plans, goal, goalSnapshot }: Props) {
  const weightData = measurements
    .filter(m => m.weight_kg !== null)
    .map(m => ({ date: format(new Date(m.measured_at), 'M/d'), weight: m.weight_kg }))

  const latestWeight = measurements[measurements.length - 1]?.weight_kg ?? null
  const fatBank = buildFatBank(goalSnapshot, goal, latestWeight)

  const isPlateau = detectWeightPlateau(measurements)
  const plateauStory = buildPlateauStory({
    measurements,
    mealAdherence: plans[plans.length - 1]?.previous_completion_rate,
    workoutAdherence: plans[plans.length - 1]?.previous_workout_rate,
  })

  if (measurements.length === 0 && plans.length === 0) {
    return (
      <div className="p-6 rounded-2xl" style={cardStyle}>
        <ZaiJian
          size="sm"
          layout="whisper"
          line={{ text: '還沒記錄。', expression: 'normal', subtext: '量個體重，我幫你看趨勢。' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {fatBank && (
        <div className="p-5 space-y-4" style={cardStyle}>
          <h3 className="text-[15px] font-medium" style={{ color: colors.text.primary }}>脂肪銀行</h3>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <p style={{ color: colors.text.tertiary }}>目標減脂</p>
              <p className="font-medium text-[15px]" style={{ color: colors.text.primary }}>
                {fatBank.targetFatLossKg.toFixed(1)} kg
              </p>
            </div>
            <div>
              <p style={{ color: colors.text.tertiary }}>已完成</p>
              <p className="font-semibold text-[16px]" style={{ color: colors.accent.action }}>
                {fatBank.completedKg.toFixed(1)} kg
              </p>
            </div>
            <div>
              <p style={{ color: colors.text.tertiary }}>還差</p>
              <p className="font-medium text-[15px]" style={{ color: colors.text.primary }}>
                {fatBank.remainingKg.toFixed(1)} kg
              </p>
            </div>
            <div>
              <p style={{ color: colors.text.tertiary }}>預估達成</p>
              <p className="font-medium text-[15px]" style={{ color: colors.text.primary }}>
                {fatBank.estimatedDate ?? '—'}
              </p>
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg.muted }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${fatBank.progressPct}%`, backgroundColor: colors.accent.action }}
            />
          </div>
          <p className="text-[12px]" style={{ color: colors.text.secondary }}>
            速度約每週 {(fatBank.weeklySpeedG / 1000).toFixed(1)} kg · 看趨勢，不用每天量
          </p>
        </div>
      )}

      {plateauStory && (
        <ZaiJian size="sm" layout="whisper" line={{ text: plateauStory.text, subtext: plateauStory.subtext, expression: 'plateau' }} />
      )}

      {!plateauStory && isPlateau && (
        <ZaiJian size="sm" layout="whisper" line={pickZaiJianLine('plateau')} />
      )}

      {weightData.length >= 2 && (
        <div className="rounded-2xl p-5" style={cardStyle}>
          <h3 className="text-[15px] font-semibold mb-3" style={{ color: colors.text.primary }}>體重趨勢</h3>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={weightData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.text.tertiary }} />
              <YAxis tick={{ fontSize: 11, fill: colors.text.tertiary }} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip formatter={(val) => [`${val} kg`, '體重']} />
              {goal?.target_weight_kg && (
                <ReferenceLine y={goal.target_weight_kg} stroke={colors.accent.action} strokeDasharray="4 4" />
              )}
              <Line type="monotone" dataKey="weight" stroke={colors.accent.action} strokeWidth={2} dot={{ fill: colors.accent.action, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {measurements.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="px-4 py-3 border-b" style={{ borderColor: colors.border.subtle }}>
            <h3 className="text-[15px] font-semibold" style={{ color: colors.text.primary }}>最近記錄</h3>
          </div>
          <div>
            {[...measurements].reverse().slice(0, 6).map(m => (
              <div key={m.id} className="px-4 py-3 flex items-center border-b last:border-0" style={{ borderColor: colors.border.subtle }}>
                <span className="text-[13px] w-16 flex-shrink-0" style={{ color: colors.text.tertiary }}>
                  {format(new Date(m.measured_at), 'M/d')}
                </span>
                {m.weight_kg && (
                  <span className="text-[15px] font-medium" style={{ color: colors.text.primary }}>
                    {m.weight_kg} kg
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
