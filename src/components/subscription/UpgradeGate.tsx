'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import type { AccessStatus } from '@/lib/subscription-access'
import { colors } from '@/lib/design-system'

interface Props {
  access: AccessStatus
  feature: string
  children: React.ReactNode
  /** 試用結束仍顯示內容 + 底部訂閱提示（價值先給再看） */
  preview?: boolean
}

export default function UpgradeGate({ access, feature, children, preview }: Props) {
  if (access.hasFullAccess) return <>{children}</>

  if (preview) {
    return (
      <div className="space-y-4">
        {children}
        <div
          className="rounded-2xl p-5 text-center"
          style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
        >
          <p className="text-[14px] font-medium mb-1" style={{ color: colors.text.primary }}>
            試用已結束
          </p>
          <p className="text-[13px] mb-4 leading-relaxed" style={{ color: colors.text.secondary }}>
            上面是你在試用期累積的趨勢。訂閱後可持續追蹤{feature}。
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
    )
  }

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
