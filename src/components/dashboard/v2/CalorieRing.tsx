'use client'

import { BB_V2 } from '@/lib/betterbit-v2'
import { useCountUp } from '@/hooks/useCountUp'

interface Props {
  logged: number
  target: number
  remaining?: number
}

export default function CalorieRing({ logged, target, remaining }: Props) {
  const safeTarget = Math.max(target, 1)
  const pct = Math.min(1, logged / safeTarget)
  const display = useCountUp(Math.round(logged), BB_V2.motion.countUpMs)
  const size = 200
  const stroke = BB_V2.ring.strokeWidth
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)

  const left = remaining ?? Math.max(0, target - logged)

  return (
    <div className="flex flex-col items-center py-2" style={{ fontFamily: BB_V2.font }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={BB_V2.ring.track}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={BB_V2.ring.fill}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.25,0.1,0.25,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[36px] tabular-nums leading-none" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            {display.toLocaleString()}
          </span>
          <span className="text-[15px] mt-1 tabular-nums" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
            / {target.toLocaleString()} kcal
          </span>
        </div>
      </div>
      <p className="text-[14px] mt-4 text-center" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
        {left > 0 ? `還可以吃 ${left.toLocaleString()} kcal` : '今天的目標已達成'}
      </p>
    </div>
  )
}
