'use client'

import { colors } from '@/lib/design-system'

export default function SettingsHeader() {
  return (
    <header className="px-5 app-page-top pb-2">
      <h1 className="text-[22px] font-medium tracking-tight" style={{ color: colors.text.primary }}>
        設定
      </h1>
      <p className="text-[15px] mt-2 leading-relaxed" style={{ color: colors.text.secondary }}>
        這裡是你的後台。其餘的事，我們安靜處理。
      </p>
    </header>
  )
}
