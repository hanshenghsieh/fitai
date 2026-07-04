'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { WeekSummary } from '@/lib/analytics/week-summary'
import { buildWeekHeroDisplay, pickWeekFocusAction } from '@/lib/analytics/week-display'
import EmptyStateCard from '@/components/ui/EmptyStateCard'
import WeekSummaryHero from './WeekSummaryHero'
import WeekFocusActionCard from './WeekFocusActionCard'
import WeekTrendCards from './WeekTrendCards'
import WeekDailyPerformance from './WeekDailyPerformance'

interface Props {
  summary: WeekSummary
  error?: string | null
}

export default function WeekScreen({ summary, error }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  if (error) {
    return (
      <div className="px-5 app-page-top pb-8 max-w-lg mx-auto space-y-4" style={{ fontFamily: BB_V2.font }}>
        <header>
          <h1 className="text-[22px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            本週
          </h1>
        </header>
        <EmptyStateCard
          title="暫時無法載入本週資料"
          reason={error}
          ctaLabel="回到今天"
          ctaHref="/dashboard"
        />
      </div>
    )
  }

  if (summary.insufficient_data) {
    return (
      <div className="px-5 app-page-top pb-8 space-y-6 max-w-lg mx-auto" style={{ fontFamily: BB_V2.font }}>
        <header>
          <h1 className="text-[22px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            本週
          </h1>
          <p className="text-[14px] mt-1" style={{ color: BB_V2.text.secondary }}>
            記錄幾餐，就能幫你整理本週節奏。
          </p>
        </header>
        <EmptyStateCard
          title="還沒有本週資料"
          reason={summary.insufficient_reason ?? '先記錄今天第一餐，BetterBit 就能幫你整理趨勢。'}
          ctaLabel="回到今天"
          ctaHref="/dashboard"
        />
      </div>
    )
  }

  const hero = buildWeekHeroDisplay(summary)
  const focusAction = pickWeekFocusAction(summary)

  return (
    <div className="px-5 app-page-top pb-10 space-y-5 max-w-lg mx-auto" style={{ fontFamily: BB_V2.font }}>
      <header>
        <h1 className="text-[22px] leading-tight" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          本週
        </h1>
        <p className="text-[14px] mt-1 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
          本週狀態與下一步建議
        </p>
      </header>

      <WeekSummaryHero hero={hero} />

      <WeekFocusActionCard action={focusAction} />

      <WeekTrendCards summary={summary} />

      <WeekDailyPerformance
        days={summary.dailyScores}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />

      <Link
          href="/dashboard"
          className="flex w-full h-14 items-center justify-center text-[15px] active:opacity-90"
          style={{
            borderRadius: BB_V2.radius.button,
            backgroundColor: BB_V2.accent.orange,
            color: '#FFFFFF',
            fontWeight: 600,
          }}
        >
          回到今天，記錄下一餐
        </Link>
    </div>
  )
}
