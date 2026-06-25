'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

interface MacroRow {
  label: string
  logged: number
  target: number
  color: string
}

interface Props {
  proteinLogged: number
  proteinTarget: number
  carbsLogged: number
  carbsTarget: number
  fatLogged: number
  fatTarget: number
}

function MacroBar({ label, logged, target, color }: MacroRow) {
  const pct = Math.min(100, Math.round((logged / Math.max(target, 1)) * 100))
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
          {label}
        </span>
        <span className="text-[13px] tabular-nums" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
          {Math.round(logged)} / {target}g
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: BB_V2.bg.pill }}>
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function MacroBars({
  proteinLogged,
  proteinTarget,
  carbsLogged,
  carbsTarget,
  fatLogged,
  fatTarget,
}: Props) {
  return (
    <div className="space-y-4" style={{ fontFamily: BB_V2.font }}>
      <MacroBar label="蛋白質" logged={proteinLogged} target={proteinTarget} color={BB_V2.macro.protein} />
      <MacroBar label="碳水" logged={carbsLogged} target={carbsTarget} color={BB_V2.macro.carbs} />
      <MacroBar label="脂肪" logged={fatLogged} target={fatTarget} color={BB_V2.macro.fat} />
    </div>
  )
}
