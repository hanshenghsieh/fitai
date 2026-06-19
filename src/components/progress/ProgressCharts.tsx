'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import { colors, cardStyle } from '@/lib/design-system'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import { detectWeightPlateau } from '@/lib/companion-state'
import ZaiJian from '@/components/character/ZaiJian'
import type { BodyMeasurement, Goal } from '@/types'

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
}

export default function ProgressCharts({ measurements, plans, goal }: Props) {
  const weightData = measurements
    .filter(m => m.weight_kg !== null)
    .map(m => ({ date: format(new Date(m.measured_at), 'M/d'), weight: m.weight_kg }))

  const isPlateau = detectWeightPlateau(measurements)

  if (measurements.length === 0 && plans.length === 0) {
    return (
      <div className="p-6 rounded-2xl" style={cardStyle}>
        <ZaiJian
          size="lg"
          line={{ text: '還沒記錄。', expression: 'normal', subtext: '量個體重，我幫你看。' }}
          layout="bubble"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isPlateau && (
        <ZaiJian size="sm" line={pickZaiJianLine('plateau')} layout="bubble" />
      )}

      {goal && measurements.length > 0 && (
        <div className="rounded-2xl p-5" style={cardStyle}>
          <h3 className="text-[15px] font-semibold mb-3" style={{ color: colors.text.primary }}>離目標多遠</h3>
          <GoalProgressBar goal={goal} measurements={measurements} />
        </div>
      )}

      {weightData.length >= 2 && (
        <div className="rounded-2xl p-5" style={cardStyle}>
          <h3 className="text-[15px] font-semibold mb-3" style={{ color: colors.text.primary }}>體重</h3>
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

function GoalProgressBar({ goal, measurements }: { goal: Goal; measurements: BodyMeasurement[] }) {
  const latest = measurements[measurements.length - 1]
  if (!latest?.weight_kg || !goal.target_weight_kg) return null

  const start = goal.start_weight_kg ?? latest.weight_kg
  const target = goal.target_weight_kg
  const current = latest.weight_kg
  const totalToLose = start - target
  const lostSoFar = start - current
  const pct = totalToLose > 0 ? Math.min(100, Math.max(0, (lostSoFar / totalToLose) * 100)) : 0

  return (
    <div>
      <div className="flex justify-between text-[13px] mb-2" style={{ color: colors.text.secondary }}>
        <span>{start} kg</span>
        <span style={{ color: colors.accent.action }}>{current} kg</span>
        <span>{target} kg</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg.muted }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors.accent.action }} />
      </div>
    </div>
  )
}
