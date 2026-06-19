'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import type { AccessStatus } from '@/lib/subscription-access'
import { colors } from '@/lib/design-system'

interface Props {
  access: AccessStatus
  feature: string
  children: React.ReactNode
}

export default function UpgradeGate({ access, feature, children }: Props) {
  if (access.hasFullAccess) return <>{children}</>

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-40 blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div
          className="rounded-2xl p-6 text-center max-w-xs shadow-lg"
          style={{ backgroundColor: colors.bg.elevated, border: `2px solid ${colors.border.subtle}` }}
        >
          <Lock className="h-8 w-8 mx-auto mb-3" style={{ color: colors.accent.action }} />
          <p className="font-bold mb-1" style={{ color: colors.text.primary }}>{feature}需要訂閱</p>
          <p className="text-sm mb-4" style={{ color: colors.text.secondary }}>
            試用結束後，訂閱可持續獲得每週自動重算的個人化計畫、進度分析與計畫調整。
          </p>
          <Link
            href="/settings"
            className="inline-block px-6 py-2.5 rounded-xl font-semibold text-white text-sm"
            style={{ backgroundColor: colors.accent.action }}
          >
            訂閱 NT$500/月
          </Link>
        </div>
      </div>
    </div>
  )
}
