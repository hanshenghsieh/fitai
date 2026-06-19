'use client'

import ZaiJian from '@/components/character/ZaiJian'
import { colors, cardStyle } from '@/lib/design-system'

interface Props {
  title: string
  body: string
}

/** 為什麼這餐？— 信任優先，非數字 */
export default function MealTrustCard({ title, body }: Props) {
  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{ ...cardStyle, backgroundColor: colors.bg.muted, borderColor: colors.border.subtle }}
    >
      <p className="text-[11px] font-semibold mb-1.5" style={{ color: colors.accent.action }}>
        為什麼這餐？
      </p>
      <ZaiJian
        size="xs"
        layout="inline"
        line={{ text: title, subtext: body, expression: 'normal' }}
        className="items-start"
      />
    </div>
  )
}
