'use client'

import { useState } from 'react'
import Link from 'next/link'
import { colors } from '@/lib/design-system'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'
import type { AccessStatus } from '@/lib/subscription-access'

export default function TrialBanner({ access }: { access: AccessStatus }) {
  if (access.isSubscribed) return null

  if (access.isTrial) {
    return (
      <div
        className="mx-4 mt-4 px-4 py-3 rounded-2xl flex items-center justify-between gap-3"
        style={{ backgroundColor: colors.bg.muted, border: `1px solid ${colors.border.subtle}` }}
      >
        <ZaiJian
          size="xs"
          line={{ text: '試用還剩幾天。', expression: 'normal', subtext: `還有 ${access.trialDaysLeft} 天。` }}
          layout="inline"
          className="flex-1 min-w-0"
        />
        <Link href="/settings" className="text-[12px] font-semibold flex-shrink-0" style={{ color: colors.accent.action }}>
          訂閱
        </Link>
      </div>
    )
  }

  if (access.trialExpired) {
    return (
      <div className="mx-4 mt-4 px-4 py-3 rounded-2xl space-y-2" style={{ backgroundColor: colors.bg.muted, border: `1px solid ${colors.border.subtle}` }}>
        <ZaiJian size="sm" line={{ text: '試用結束了。', expression: 'tired', subtext: '要繼續讓我幫你想吃什麼嗎？' }} layout="inline" />
        <Link
          href="/settings"
          className="inline-block text-[12px] font-semibold px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
        >
          訂閱 NT$500/月
        </Link>
      </div>
    )
  }

  return null
}
