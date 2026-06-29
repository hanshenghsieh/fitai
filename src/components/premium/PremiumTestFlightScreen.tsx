'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { colors } from '@/lib/design-system'
import {
  PREMIUM_TESTFLIGHT_BODY,
  PREMIUM_TESTFLIGHT_FEATURES,
  PREMIUM_TESTFLIGHT_FOOTNOTE,
  PREMIUM_TESTFLIGHT_SUBTITLE,
} from '@/lib/premium-narrative'

export default function PremiumTestFlightScreen() {
  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: colors.bg.canvas }}>
      <div className="px-5 pt-12 pb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-[14px] mb-6"
          style={{ color: colors.text.tertiary }}
        >
          <ChevronLeft className="h-4 w-4" />
          設定
        </Link>

        <h1 className="text-[22px] font-medium tracking-tight" style={{ color: colors.text.primary }}>
          BetterBit 會員
        </h1>
        <p className="text-[15px] mt-3 leading-relaxed" style={{ color: colors.text.secondary }}>
          {PREMIUM_TESTFLIGHT_SUBTITLE}
        </p>
      </div>

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
