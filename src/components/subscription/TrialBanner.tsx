'use client'

import Link from 'next/link'
import { colors } from '@/lib/design-system'
import type { AccessStatus } from '@/lib/subscription-access'

interface Props {
  access: AccessStatus
}

export default function TrialBanner({ access }: Props) {
  if (access.isSubscribed) return null

  if (access.isTrial) {
    return (
      <div
        className="mx-5 mt-5 px-4 py-3.5 flex items-center justify-between gap-4"
        style={{ backgroundColor: colors.bg.muted, border: `1px solid ${colors.border.subtle}`, borderRadius: 16 }}
      >
        <p className="text-[13px] leading-relaxed flex-1" style={{ color: colors.text.secondary }}>
          試用還剩 {access.trialDaysLeft} 天
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
        <p className="text-[14px] font-medium" style={{ color: colors.text.primary }}>試用結束了</p>
        <p className="text-[13px]" style={{ color: colors.text.secondary }}>要繼續讓我幫你調整嗎？</p>
        <Link
          href="/settings"
          className="inline-block text-[12px] font-medium px-4 py-2"
          style={{ backgroundColor: colors.accent.action, color: colors.bg.elevated, borderRadius: 12 }}
        >
          訂閱 NT$499/月
        </Link>
      </div>
    )
  }

  return null
}
