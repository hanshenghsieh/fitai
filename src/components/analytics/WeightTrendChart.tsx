'use client'

import { useEffect, useRef, useState } from 'react'
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

const CHART_CLASS =
  '[&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-surface]:focus:outline-none [&_.recharts-surface]:focus-visible:outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-wrapper]:focus:outline-none [&_.recharts-wrapper]:focus-visible:outline-none [&_svg]:outline-none [&_svg]:focus:outline-none [&_svg]:focus-visible:outline-none [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-transparent'

export default function WeightTrendChart({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(0)
  const [remountKey, setRemountKey] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const width = el.getBoundingClientRect().width
      if (width > 0) setChartWidth(width)
    }

    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      measure()
      setRemountKey(k => k + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onVisible)

    return () => {
      ro?.disconnect()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
    }
  }, [points.length])

  if (points.length === 0) return null

  const weightYDomain = weightChartYDomain(points)
  const lastWeight = points.at(-1)
  const pointsKey = points.map(p => `${p.label}:${p.weight}`).join('|')

  return (
    <>
      <div
        ref={containerRef}
        className={`w-full weight-trend-chart ${CHART_CLASS}`}
        style={{
          minHeight: 120,
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
        }}
      >
        {chartWidth > 0 ? (
          <ResponsiveContainer width="100%" height={120} minWidth={chartWidth}>
            <LineChart data={points} key={`${remountKey}-${pointsKey}`}>
              <XAxis dataKey="label" hide />
              <YAxis hide domain={weightYDomain} />
              <Tooltip
                cursor={{ stroke: BB_V2.divider, strokeWidth: 1, fill: 'transparent' }}
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${BB_V2.divider}`,
                  boxShadow: 'none',
                  fontSize: 13,
                }}
                formatter={(value: number) => [`${value.toFixed(1)} kg`, '體重']}
                labelFormatter={label => label}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke={BB_V2.accent.orange}
                strokeWidth={2}
                dot={{ r: 3, fill: BB_V2.accent.orange }}
                activeDot={{ r: 4, fill: BB_V2.accent.orange, stroke: BB_V2.accent.orange, strokeWidth: 0 }}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[120px]" aria-hidden />
        )}
      </div>
      {lastWeight && (
        <p className="text-[12px] text-right -mt-1" style={{ color: BB_V2.accent.orange, fontWeight: 600 }}>
          {lastWeight.weight}
        </p>
      )}
    </>
  )
}
