'use client'

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BB_V2 } from '@/lib/betterbit-v2'
import { weightChartYDomain } from '@/lib/analytics/analysis-summary'

interface Point {
  label: string
  weight: number
}

interface Props {
  points: Point[]
}

export default function WeightTrendChart({ points }: Props) {
  if (points.length === 0) return null

  const weightYDomain = weightChartYDomain(points)
  const lastWeight = points.at(-1)

  return (
    <>
      <div className="w-full" style={{ minHeight: 120 }}>
        <ResponsiveContainer width="100%" height={120} minWidth={0}>
          <LineChart data={points} key={points.length}>
            <XAxis dataKey="label" hide />
            <YAxis hide domain={weightYDomain} />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)} kg`, '體重']}
              labelFormatter={label => label}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke={BB_V2.accent.orange}
              strokeWidth={2}
              dot={{ r: 3, fill: BB_V2.accent.orange }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {lastWeight && (
        <p className="text-[12px] text-right -mt-1" style={{ color: BB_V2.accent.orange, fontWeight: 600 }}>
          {lastWeight.weight}
        </p>
      )}
    </>
  )
}
