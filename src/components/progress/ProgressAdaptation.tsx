'use client'

import { colors } from '@/lib/design-system'

interface Props {
  text: string
}

export default function ProgressAdaptation({ text }: Props) {
  return (
    <p className="mx-5 px-4 py-3 rounded-2xl text-[13px] leading-relaxed" style={{ backgroundColor: colors.bg.muted, color: colors.text.tertiary }}>
      {text}
    </p>
  )
}
