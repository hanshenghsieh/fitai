'use client'

import type { ReactNode } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  icon: ReactNode
  label: string
  value: string | number
  unit?: string
  delta?: string
  deltaPositive?: boolean
}

export default function V2MetricCard({ icon, label, value, unit, delta, deltaPositive }: Props) {
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
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
        style={{ backgroundColor: BB_V2.bg.softGreen, color: BB_V2.accent.green }}
      >
        {icon}
      </div>
      <p className="text-[11px] leading-tight" style={{ color: BB_V2.text.secondary }}>
        {label}
      </p>
      <p className="text-[18px] tabular-nums mt-1 leading-none" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
        {value}
        {unit && (
          <span className="text-[11px] ml-0.5 font-normal" style={{ color: BB_V2.text.secondary }}>
            {unit}
          </span>
        )}
      </p>
      {delta && (
        <p
          className="text-[11px] mt-1 tabular-nums"
          style={{ color: deltaPositive ? BB_V2.accent.green : BB_V2.accent.warning, fontWeight: 500 }}
        >
          {delta}
        </p>
      )}
    </div>
  )
}
