'use client'

import { colors } from '@/lib/design-system'

interface Props {
  text: string
  subtext: string
}

export default function ProgressPlateauNote({ text, subtext }: Props) {
  return (
    <div className="mx-5 px-4 py-4 rounded-2xl space-y-2" style={{ backgroundColor: colors.bg.muted }}>
      <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
        {text}
      </p>
      <p className="text-[13px] leading-relaxed" style={{ color: colors.text.tertiary }}>
        {subtext}
      </p>
    </div>
  )
}
