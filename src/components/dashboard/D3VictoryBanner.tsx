'use client'

import ZaiJian from '@/components/character/ZaiJian'
import { colors, cardStyle } from '@/lib/design-system'
import type { ZaiJianLine } from '@/lib/copy/zaijian'

export default function D3VictoryBanner({ line }: { line: ZaiJianLine }) {
  return (
    <div className="mx-4 mt-2 rounded-2xl px-4 py-3" style={{ ...cardStyle, backgroundColor: colors.bg.elevated }}>
      <ZaiJian size="sm" layout="bubble" line={line} />
    </div>
  )
}
