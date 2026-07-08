'use client'

import Link from 'next/link'
import { colors } from '@/lib/design-system'
import {
  PREMIUM_TESTFLIGHT_BODY,
  PREMIUM_TESTFLIGHT_FEATURES,
  PREMIUM_TESTFLIGHT_FOOTNOTE,
  PREMIUM_TESTFLIGHT_SUBTITLE,
} from '@/lib/premium-narrative'
import SettingsSubpageHeader from '@/components/settings/SettingsSubpageHeader'

export default function PremiumTestFlightScreen() {
  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: colors.bg.canvas }}>
      <SettingsSubpageHeader title="BetterBit 會員" subtitle={PREMIUM_TESTFLIGHT_SUBTITLE} />

      <div className="px-5 space-y-8">
        <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
          {PREMIUM_TESTFLIGHT_BODY}
        </p>

        <ul className="space-y-2">
          {PREMIUM_TESTFLIGHT_FEATURES.map(feature => (
            <li key={feature} className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
              ・{feature}
            </li>
          ))}
        </ul>

        <p className="text-[13px] leading-relaxed" style={{ color: colors.text.tertiary }}>
          {PREMIUM_TESTFLIGHT_FOOTNOTE}
        </p>

        <Link
          href="/dashboard"
          className="inline-block text-[15px] font-medium"
          style={{ color: colors.accent.action }}
        >
          回到 Today
        </Link>
      </div>
    </div>
  )
}
