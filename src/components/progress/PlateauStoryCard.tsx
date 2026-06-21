'use client'

import { colors } from '@/lib/design-system'

interface Props {
  text: string
  subtext: string
}

export default function PlateauStoryCard({ text, subtext }: Props) {
  return (
    <div
      className="rounded-2xl px-4 py-4 space-y-2"
      style={{
        backgroundColor: colors.bg.muted,
        border: `1px solid ${colors.border.subtle}`,
      }}
    >
      <p className="text-[11px] font-medium tracking-wide" style={{ color: colors.text.tertiary }}>
        平台期
      </p>
      <p className="text-[15px] font-medium leading-snug" style={{ color: colors.text.primary }}>
        {text}
      </p>
      <p className="text-[13px] leading-relaxed" style={{ color: colors.text.secondary }}>
        {subtext}
      </p>
    </div>
  )
}
