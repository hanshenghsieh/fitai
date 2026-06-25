'use client'

import { Info } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { CoachInsightCard } from '@/lib/analytics/week-insights'
import BBIcon from '@/components/icons/BBIcon'
import { INSIGHT_ICON_MAP } from '@/components/icons'
import BBCard from '@/components/ui/BBCard'

export default function WeekCoachInsights({ insights }: { insights: CoachInsightCard[] }) {
  if (!insights.length) return null
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[17px]" style={{ color: 'var(--bb-text-primary)', fontWeight: 700 }}>
          AI 教練本週分析
        </h2>
        <Info className="bb-icon h-4 w-4" strokeWidth={2} />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {insights.map(card => (
          <BBCard key={card.id} padding={16} className="shrink-0 w-[min(280px,78vw)]">
            <BBIcon
              name={INSIGHT_ICON_MAP[card.icon]}
              size={22}
              tone={card.tone === 'success' ? 'success' : card.tone === 'warning' ? 'warning' : 'default'}
              className="mb-2"
            />
            <p className="text-[15px] mb-1" style={{ color: 'var(--bb-text-primary)', fontWeight: 600 }}>
              {card.title}
            </p>
            <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--bb-text-secondary)' }}>
              {card.body}
            </p>
            <div
              className="rounded-xl px-3 py-2 text-[12px] leading-relaxed"
              style={{
                backgroundColor: card.tone === 'success' ? 'rgba(118,182,154,0.12)' : 'rgba(232,162,78,0.12)',
                color: 'var(--bb-text-primary)',
              }}
            >
              {card.suggestion}
            </div>
          </BBCard>
        ))}
      </div>
    </section>
  )
}
