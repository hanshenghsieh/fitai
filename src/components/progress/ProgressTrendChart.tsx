'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { colors } from '@/lib/design-system'
import type { TrendTone } from '@/lib/progress-narrative'

interface Point {
  label: string
  weight: number
}

interface Props {
  points: Point[]
  tone: TrendTone
}

export default function ProgressTrendChart({ points, tone }: Props) {
  if (points.length < 2) {
    return (
      <div className="mx-5 px-4 py-8 rounded-2xl text-center" style={{ backgroundColor: colors.bg.muted }}>
        <p className="text-[14px] leading-relaxed" style={{ color: colors.text.secondary }}>
          再記一次，就能看見趨勢。
        </p>
      </div>
    )
  }

  const stroke =
    tone === 'forward' ? colors.accent.sage : tone === 'up' ? colors.text.tertiary : colors.accent.action

  return (
    <div className="mx-5 px-4 py-5 rounded-2xl" style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}>
      <p className="text-[13px] mb-4" style={{ color: colors.text.tertiary }}>
        體重趨勢
      </p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <Line
            type="monotone"
            dataKey="weight"
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[12px] mt-2 leading-relaxed" style={{ color: colors.text.tertiary }}>
        看方向，不看每一天。
      </p>
    </div>
  )
}
