'use client'

import { TODAY } from '@/lib/today-design'

interface Props {
  caloriesLogged: number
  caloriesTarget: number
  proteinLogged: number
  proteinTarget: number
  overTarget?: boolean
}

export default function TodayIntakeBar({
  caloriesLogged,
  caloriesTarget,
  proteinLogged,
  proteinTarget,
  overTarget = false,
}: Props) {
  const safeTarget = Math.max(caloriesTarget, 1)
  const calPct = Math.min(100, Math.round((caloriesLogged / safeTarget) * 100))
  const proPct = Math.min(100, Math.round((proteinLogged / Math.max(proteinTarget, 1)) * 100))

  return (
    <div
      className="px-5 pb-4 max-w-[640px] mx-auto space-y-2.5"
      style={{ fontFamily: TODAY.font }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] tabular-nums" style={{ color: TODAY.text, fontWeight: 500 }}>
          已攝取 {Math.round(caloriesLogged)} / {caloriesTarget} kcal
        </p>
        <p className="text-[12px] tabular-nums shrink-0" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          蛋白質 {Math.round(proteinLogged)} / {proteinTarget}g
        </p>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: TODAY.pillBg }}
        aria-hidden
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{
            width: `${calPct}%`,
            backgroundColor: TODAY.mocha,
            opacity: 0.38,
          }}
        />
      </div>
      <div
        className="h-1 rounded-full overflow-hidden -mt-1"
        style={{ backgroundColor: TODAY.pillBg }}
        aria-hidden
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{
            width: `${proPct}%`,
            backgroundColor: TODAY.mocha,
            opacity: 0.22,
          }}
        />
      </div>
      {overTarget && (
        <p className="text-[12px] leading-relaxed pt-0.5" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          今天營養量攝取已經很足夠了，不需要更多攝取
        </p>
      )}
    </div>
  )
}
