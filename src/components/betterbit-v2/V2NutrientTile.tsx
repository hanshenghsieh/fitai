'use client'

import type { ReactNode } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  title: string
  current: number
  target: number
  unit?: string
  color?: string
  icon?: ReactNode
}

export default function V2NutrientTile({ title, current, target, unit = 'g', color, icon }: Props) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const barColor = color ?? BB_V2.accent.green

  return (
    <div
      className="flex-1 min-w-0 p-3"
      style={{
        background: BB_V2.bg.card,
        borderRadius: BB_V2.radius.cardLg,
        boxShadow: BB_V2.shadow.soft,
        border: `1px solid ${BB_V2.border}`,
      }}
    >
      {icon && <div className="mb-1.5">{icon}</div>}
      <p className="text-[12px] truncate" style={{ color: BB_V2.text.secondary }}>
        {title}
      </p>
      <p className="text-[14px] tabular-nums mt-1" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
        {Math.round(current)} / {Math.round(target)} {unit}
      </p>
      <p className="text-[12px] mt-0.5 tabular-nums" style={{ color: barColor, fontWeight: 600 }}>
        {pct}%
      </p>
      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: BB_V2.ring.track }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
    </div>
  )
}
