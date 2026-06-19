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
    <div className="px-4 pb-2">
      <div
        className="rounded-2xl p-4 grid grid-cols-3 gap-3 text-center"
        style={cardStyle}
      >
        <div>
          <p className="text-[10px] font-medium" style={{ color: colors.text.tertiary }}>熱量</p>
          <p className="text-[15px] font-semibold mt-1" style={{ color: colors.text.primary }}>
            {Math.round(caloriesLogged)}
          </p>
          <p className="text-[11px]" style={{ color: colors.text.tertiary }}>
            / {caloriesTarget}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium" style={{ color: colors.text.tertiary }}>蛋白</p>
          <p className="text-[15px] font-semibold mt-1" style={{ color: colors.text.primary }}>
            {Math.round(proteinLogged)}g
          </p>
          <p className="text-[11px]" style={{ color: colors.text.tertiary }}>
            / {proteinTarget}g
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium" style={{ color: colors.text.tertiary }}>活動</p>
          <p className="text-[15px] font-semibold mt-1" style={{ color: colors.text.primary }}>
            {activityDone}
          </p>
          <p className="text-[11px]" style={{ color: colors.text.tertiary }}>
            / {activityTarget} 次
          </p>
        </div>
      </div>
    </div>
  )
}
