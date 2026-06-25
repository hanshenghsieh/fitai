'use client'

import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'

interface Point {
  label: string
  weight: number
}

interface Props {
  points: Point[]
}

export default function ProgressTrendChart({ points }: Props) {
  if (points.length < 2) {
    return (
      <BBCard className="mx-5 text-center" padding={32}>
        <p className="text-[14px] leading-relaxed" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
          再記一次，就能看見趨勢。
        </p>
      </BBCard>
    )
  }

  return (
    <BBCard className="mx-5">
      <p className="text-[15px] mb-1" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
        體重趨勢
      </p>
      <p className="text-[12px] mb-4" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
        Apple Stocks 風格 · 看方向，不看每一天
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={points} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
          <XAxis dataKey="label" hide />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: 'none',
              boxShadow: BB_V2.shadow.card,
              fontFamily: BB_V2.font,
            }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke={BB_V2.accent.orange}
            strokeWidth={2}
            dot={{ r: 4, fill: BB_V2.accent.orange, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: BB_V2.accent.orange }}
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </BBCard>
  )
}
