'use client'

import Link from 'next/link'
import { colors } from '@/lib/design-system'
import { TRIAL_DAYS, type AccessStatus } from '@/lib/subscription-access'
import { isAppStoreSafeMode } from '@/lib/app-store-safe-mode'

interface Props {
  access: AccessStatus
}

export default function TrialBanner({ access }: Props) {
  if (isAppStoreSafeMode() || access.isSubscribed) return null

  if (access.isTrial) {
    return (
      <div
        className="mx-5 mt-5 px-4 py-3.5 flex items-center justify-between gap-4"
        style={{ backgroundColor: colors.bg.muted, border: `1px solid ${colors.border.subtle}`, borderRadius: 16 }}
      >
        <p className="text-[13px] leading-relaxed flex-1" style={{ color: colors.text.secondary }}>
          試用還剩 {access.trialDaysLeft} 天 · 少煩「今天吃什麼」就是進步
        </p>
        <Link href="/settings" className="text-[12px] font-medium flex-shrink-0" style={{ color: colors.accent.action }}>
          訂閱
        </Link>
      </div>
    )
  }

  if (access.trialExpired) {
    return (
      <div
        className="mx-5 mt-5 px-4 py-4 space-y-3"
        style={{ backgroundColor: colors.bg.muted, border: `1px solid ${colors.border.subtle}`, borderRadius: 16 }}
      >
        <p className="text-[14px] font-medium" style={{ color: colors.text.primary }}>{TRIAL_DAYS} 天試用完了</p>
        <p className="text-[13px]" style={{ color: colors.text.secondary }}>
          NT$500 ≈ 兩杯手搖/月，比一次營養諮詢便宜。要繼續少煩決策嗎？
        </p>
        <Link
          href="/settings"
          className="inline-block text-[12px] font-medium px-4 py-2"
          style={{ backgroundColor: colors.accent.action, color: colors.bg.elevated, borderRadius: 12 }}
        >
          訂閱 NT$500/月
        </Link>
      </div>
    )
  }

  return null
}
