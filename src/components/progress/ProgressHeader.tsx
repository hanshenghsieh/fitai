'use client'

import { colors } from '@/lib/design-system'

interface Props {
  posture: string
}

export default function ProgressHeader({ posture }: Props) {
  return (
    <header className="px-5 pt-12 pb-4 space-y-2">
      <h1 className="text-[22px] font-medium tracking-tight" style={{ color: colors.text.primary }}>
        進度
      </h1>
      <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
        {posture}
      </p>
    </header>
  )
}
