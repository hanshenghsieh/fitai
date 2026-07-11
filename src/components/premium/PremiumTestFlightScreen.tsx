'use client'

import { useRouter } from 'next/navigation'
import { BB_V2 } from '@/lib/betterbit-v2'
import { PRO_V2_FEATURES } from '@/lib/pro-v2-features'
import {
  PREMIUM_TESTFLIGHT_BODY,
  PREMIUM_TESTFLIGHT_FOOTNOTE,
  PREMIUM_TESTFLIGHT_SUBTITLE,
} from '@/lib/premium-narrative'
import { navigateTo } from '@/lib/navigation/routes'
import V2PageBackground from '@/components/betterbit-v2/V2PageBackground'
import V2PageEnter from '@/components/betterbit-v2/V2PageEnter'
import V2Header from '@/components/betterbit-v2/V2Header'
import V2FeatureRow from '@/components/betterbit-v2/V2FeatureRow'
import V2PrimaryButton from '@/components/betterbit-v2/V2PrimaryButton'

export default function PremiumTestFlightScreen() {
  const router = useRouter()

  return (
    <V2PageBackground>
      <V2Header
        title="BetterBit Pro"
        variant="back"
        onBack={() => navigateTo('/settings', target => router.push(target))}
        hideRight
      />

      <V2PageEnter>
        <div
          className="max-w-[640px] mx-auto pb-[max(28px,var(--app-safe-bottom,0px))] space-y-5"
          style={{ paddingLeft: BB_V2.pagePadding, paddingRight: BB_V2.pagePadding }}
        >
          <div className="text-center pt-2 pb-1">
            <h2 className="text-[22px] leading-snug" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
              解鎖完整減脂體驗 👑
            </h2>
            <p className="text-[14px] mt-2" style={{ color: BB_V2.text.secondary }}>
              {PREMIUM_TESTFLIGHT_SUBTITLE}
            </p>
          </div>

          <p className="text-[14px] leading-relaxed px-1" style={{ color: BB_V2.text.secondary }}>
            {PREMIUM_TESTFLIGHT_BODY}
          </p>

          <div className="space-y-2.5">
            <p className="text-[16px] px-1" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
              BetterBit Pro 專屬功能
            </p>
            {PRO_V2_FEATURES.map(({ icon: Icon, title, subtitle }) => (
              <V2FeatureRow
                key={title}
                icon={<Icon className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
                title={title}
                subtitle={subtitle}
              />
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <V2PrimaryButton onClick={() => navigateTo('/dashboard', target => router.push(target))}>
              回到 Today
            </V2PrimaryButton>

            <p className="text-[11px] text-center leading-relaxed px-2" style={{ color: BB_V2.text.muted }}>
              {PREMIUM_TESTFLIGHT_FOOTNOTE}
            </p>
          </div>
        </div>
      </V2PageEnter>
    </V2PageBackground>
  )
}
