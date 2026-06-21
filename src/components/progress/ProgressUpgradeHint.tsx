'use client'

import Link from 'next/link'
import type { AccessStatus } from '@/lib/subscription-access'
import { colors } from '@/lib/design-system'

interface Props {
  access: AccessStatus
  children: React.ReactNode
  hasEarnedPreview: boolean
}

export default function ProgressUpgradeHint({ access, children, hasEarnedPreview }: Props) {
  if (access.hasFullAccess) return <>{children}</>

  if (hasEarnedPreview) {
    return (
      <div className="space-y-4">
        {children}
        <div className="mx-5 px-4 py-4 rounded-2xl text-center" style={{ backgroundColor: colors.bg.muted }}>
          <p className="text-[14px] leading-relaxed" style={{ color: colors.text.secondary }}>
            試用已結束。上面的趨勢是你這段時間留下的。
          </p>
          <Link
            href="/settings"
            className="inline-block mt-3 text-[14px] font-medium"
            style={{ color: colors.accent.action }}
          >
            繼續追蹤 →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mx-5 px-4 py-8 rounded-2xl text-center" style={{ backgroundColor: colors.bg.muted }}>
        <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
          記幾次體重，就能看見趨勢。
        </p>
      </div>
      <div className="mx-5 px-4 py-4 rounded-2xl text-center" style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}>
        <p className="text-[13px] leading-relaxed mb-3" style={{ color: colors.text.tertiary }}>
          訂閱後可持續追蹤長期變化。
        </p>
        <Link href="/settings" className="text-[14px] font-medium" style={{ color: colors.accent.action }}>
          了解會員 →
        </Link>
      </div>
    </div>
  )
}
