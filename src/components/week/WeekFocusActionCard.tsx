'use client'

import { Target } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { WeekFocusAction } from '@/lib/analytics/week-display'
import BBCard from '@/components/ui/BBCard'

interface Props {
  action: WeekFocusAction
}

export default function WeekFocusActionCard({ action }: Props) {
  return (
    <BBCard padding={20}>
      <div className="flex items-start gap-3">
        <span
          className="shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: 40,
            height: 40,
            backgroundColor: action.tone === 'accent' ? 'rgba(216,154,82,0.14)' : BB_V2.bg.pill,
          }}
        >
          <Target
            className="h-5 w-5"
            strokeWidth={BB_V2.iconStroke}
            style={{ color: action.tone === 'accent' ? BB_V2.accent.orange : BB_V2.text.secondary }}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] mb-1" style={{ color: BB_V2.accent.orange, fontWeight: 600 }}>
            本週最重要的一件事
          </p>
          <p className="text-[17px] leading-snug" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            {action.title}
          </p>
          <p className="text-[14px] mt-2 leading-relaxed" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
            {action.body}
          </p>
        </div>
      </div>
    </BBCard>
  )
}
