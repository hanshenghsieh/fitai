'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import BBIcon from '@/components/icons/BBIcon'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { WeekSummary } from '@/lib/analytics/week-summary'
import { useReveal } from '@/components/motion/useReveal'
import WeekHeroCard from './WeekHeroCard'
import WeekDailyPerformance from './WeekDailyPerformance'
import WeekChallengeGrid from './WeekChallengeGrid'
import WeekStrategyRow from './WeekStrategyRow'
import WeekBestWorst from './WeekBestWorst'
import BBCard from '@/components/ui/BBCard'

interface Props {
  summary: WeekSummary
  error?: string | null
}

function RevealSection({ index, children }: { index: number; children: ReactNode }) {
  const reveal = useReveal(index)
  return (
    <div ref={reveal.ref} className={reveal.className} style={reveal.style}>
      {children}
    </div>
  )
}

export default function WeekScreen({ summary, error }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  if (error) {
    return (
      <div className="px-5 pt-12 text-center" style={{ fontFamily: BB_V2.font }}>
        <p className="text-[16px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
          暫時無法載入本週資料
        </p>
        <p className="text-[14px] mt-2" style={{ color: BB_V2.text.secondary }}>
          {error}
        </p>
      </div>
    )
  }

  if (summary.insufficient_data) {
    return (
      <div className="px-5 pt-4 pb-8 space-y-6" style={{ fontFamily: BB_V2.font }}>
        <header>
          <h1 className="text-[34px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            本週
          </h1>
          <p className="text-[15px] mt-1" style={{ color: BB_V2.text.secondary }}>
            你的每一步，都讓改變更靠近。
          </p>
        </header>
        <BBCard className="text-center py-12">
          <p className="text-[18px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
            {summary.insufficient_reason ?? '再記錄 3 餐，我就能幫你看出趨勢'}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex mt-6 h-12 px-8 items-center justify-center rounded-full text-[15px]"
            style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 600 }}
          >
            去記錄第一餐
          </Link>
        </BBCard>
      </div>
    )
  }

  return (
    <div className="px-5 pt-4 pb-8 space-y-5 max-w-lg mx-auto" style={{ fontFamily: BB_V2.font }}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[34px] leading-tight" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            本週
          </h1>
          <p className="text-[15px] mt-1 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
            你的每一步，都讓改變更靠近。
          </p>
        </div>
        <button
          type="button"
          aria-label="本週日曆"
          className="p-2 rounded-full mt-1"
          style={{ color: BB_V2.text.secondary }}
        >
          <BBIcon name="calendar" size={20} tone="muted" />
        </button>
      </header>

      {summary.weekScore && (
        <RevealSection index={0}>
          <WeekHeroCard weekScore={summary.weekScore} metrics={summary.weeklyMetrics} />
        </RevealSection>
      )}

      <RevealSection index={1}>
        <WeekDailyPerformance
          days={summary.dailyScores}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
      </RevealSection>

      <RevealSection index={2}>
        <WeekChallengeGrid challenges={summary.challenges} />
      </RevealSection>

      <RevealSection index={3}>
        <WeekStrategyRow
          mealStrategy={summary.mealStrategy}
          workoutStrategy={summary.workoutStrategy}
        />
      </RevealSection>

      <RevealSection index={4}>
        <WeekBestWorst bestDay={summary.bestDay} worstDay={summary.worstDay} />
      </RevealSection>
    </div>
  )
}
