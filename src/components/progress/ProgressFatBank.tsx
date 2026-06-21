'use client'

import { colors } from '@/lib/design-system'

interface Props {
  progressPct: number
  line: string
}

export default function ProgressFatBank({ progressPct, line }: Props) {
  return (
    <div className="mx-5 px-4 py-4 rounded-2xl space-y-3" style={{ backgroundColor: colors.bg.muted }}>
      <p className="text-[14px] leading-relaxed" style={{ color: colors.text.secondary }}>
        {line}
      </p>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg.elevated }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progressPct}%`, backgroundColor: colors.accent.sage, opacity: 0.7 }}
        />
      </div>
    </div>
  )
}
