'use client'

import type { ReactNode } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  label: string
  value: number
  unit?: string
  consumed: number
  target: number
  color?: string
}

export default function V2ProgressRing({ label, value, unit = 'kcal', consumed, target, color }: Props) {
  const fill = color ?? BB_V2.ring.fill
  const safeTarget = Math.max(target, 1)
  const pct = Math.min(1, consumed / safeTarget)
  const size = 120
  const stroke = BB_V2.ring.strokeWidth
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)

  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BB_V2.ring.track} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={fill}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-1">
          <span className="text-[32px] tabular-nums leading-none" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            {Math.round(value).toLocaleString()}
          </span>
          <span className="text-[12px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
            {unit}
          </span>
          <span className="text-[11px] mt-0.5" style={{ color: BB_V2.text.muted }}>
            {label}
          </span>
        </div>
      </div>
    </div>
  )
}
