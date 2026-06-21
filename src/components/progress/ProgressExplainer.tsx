'use client'

import { colors } from '@/lib/design-system'

export default function ProgressExplainer() {
  return (
    <p className="mx-5 px-1 text-[13px] leading-relaxed" style={{ color: colors.text.tertiary }}>
      體重每天會浮動一點。我們看的是趨勢，不是每一天。
    </p>
  )
}
