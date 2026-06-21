'use client'

import { colors } from '@/lib/design-system'
import SettingsSection from './SettingsSection'

export default function SettingsAboutSection() {
  return (
    <SettingsSection title="關於 BetterBit">
      <div className="px-4 py-5 space-y-3">
        <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
          NASA inside. 精準在背後運算。
        </p>
        <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
          A friend outside. 外面像朋友，不像教練。
        </p>
        <p className="text-[12px] pt-2" style={{ color: colors.text.tertiary }}>
          BetterBit · 再健一點
        </p>
      </div>
    </SettingsSection>
  )
}
