'use client'

import { colors, cardStyle } from '@/lib/design-system'

interface Props {
  caloriesLogged: number
  caloriesTarget: number
  proteinLogged: number
  proteinTarget: number
  activityDone: number
  activityTarget: number
}

export default function TodaySummary({
  caloriesLogged,
  caloriesTarget,
  proteinLogged,
  proteinTarget,
  activityDone,
  activityTarget,
}: Props) {
  return (
    <div className="px-5 pb-3">
      <div
        className="p-5 grid grid-cols-3 gap-4"
        style={cardStyle}
      >
        <div>
          <p className="text-[10px] font-medium tracking-wide" style={{ color: colors.text.tertiary }}>熱量</p>
          <p className="text-[16px] font-medium mt-1.5 tabular-nums" style={{ color: colors.text.primary }}>
            {Math.round(caloriesLogged)}
          </p>
          <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: colors.text.tertiary }}>
            {caloriesTarget}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium tracking-wide" style={{ color: colors.text.tertiary }}>蛋白</p>
          <p className="text-[16px] font-medium mt-1.5 tabular-nums" style={{ color: colors.text.primary }}>
            {Math.round(proteinLogged)}g
          </p>
          <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: colors.text.tertiary }}>
            {proteinTarget}g
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium tracking-wide" style={{ color: colors.text.tertiary }}>活動</p>
          <p className="text-[16px] font-medium mt-1.5 tabular-nums" style={{ color: colors.text.primary }}>
            {activityDone}
          </p>
          <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: colors.text.tertiary }}>
            {activityTarget} 次
          </p>
        </div>
      </div>
    </div>
  )
}
