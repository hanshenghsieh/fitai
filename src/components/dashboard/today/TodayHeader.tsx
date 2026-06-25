'use client'

import Link from 'next/link'
import { TODAY } from '@/lib/today-design'

interface Props {
  trialDaysLeft?: number | null
}

export default function TodayHeader({ trialDaysLeft }: Props) {
  return (
    <header
      className="px-5 pt-11 pb-1 max-w-[640px] mx-auto"
      style={{ fontFamily: TODAY.font }}
    >
      <div>
        <h1
          className="text-[22px] tracking-tight leading-tight"
          style={{ color: TODAY.text, fontWeight: 700 }}
        >
          今天
        </h1>
        {trialDaysLeft != null && trialDaysLeft > 0 && trialDaysLeft <= 14 && (
          <Link
            href="/settings"
            prefetch
            className="text-[13px] mt-1.5 block leading-relaxed"
            style={{ color: TODAY.textSecondary, fontWeight: 400 }}
          >
            試用還剩 {trialDaysLeft} 天
          </Link>
        )}
      </div>
    </header>
  )
}
