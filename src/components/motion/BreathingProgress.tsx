'use client'

import { colors } from '@/lib/design-system'
import { zaijian } from '@/lib/copy/zaijian'

interface Props {
  percent: number
  size?: number
}

export default function BreathingProgress({ percent, size = 128 }: Props) {
  const r = 54
  const circumference = 2 * Math.PI * r
  const dash = (percent / 100) * circumference

  return (
    <div className="flex justify-center py-2">
      <div className="relative mi-breathe-ring" style={{ width: size, height: size }}>
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ transform: 'rotate(-90deg)' }}
          viewBox="0 0 120 120"
          aria-hidden
        >
          <circle cx="60" cy="60" r={r} fill="none" stroke={colors.bg.muted} strokeWidth="7" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={colors.accent.action}
            strokeWidth="7"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p style={{ fontSize: 28, fontWeight: 600, color: colors.text.primary }}>{percent}%</p>
          <p style={{ fontSize: 13, marginTop: 4, color: colors.text.tertiary }}>{zaijian.todayMission}</p>
        </div>
      </div>
    </div>
  )
}
