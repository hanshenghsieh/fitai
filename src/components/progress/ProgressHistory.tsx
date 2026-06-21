'use client'

import { format } from 'date-fns'
import { colors } from '@/lib/design-system'
import type { BodyMeasurement } from '@/types'

interface Props {
  measurements: BodyMeasurement[]
}

export default function ProgressHistory({ measurements }: Props) {
  const entries = [...measurements]
    .filter(m => m.weight_kg != null)
    .reverse()
    .slice(0, 8)

  if (entries.length === 0) return null

  return (
    <div className="mx-5 pb-4">
      <p className="text-[13px] mb-3 px-1" style={{ color: colors.text.tertiary }}>
        最近記錄
      </p>
      <ul className="space-y-2">
        {entries.map(m => (
          <li
            key={m.id}
            className="flex items-baseline justify-between gap-3 px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: colors.bg.elevated }}
          >
            <span className="text-[13px]" style={{ color: colors.text.tertiary }}>
              {format(new Date(m.measured_at), 'M月d日')}
            </span>
            <span className="text-[15px] tabular-nums" style={{ color: colors.text.secondary }}>
              {m.weight_kg} kg
              {m.body_fat_pct != null && (
                <span className="text-[12px] ml-2" style={{ color: colors.text.tertiary }}>
                  · {m.body_fat_pct}%
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
