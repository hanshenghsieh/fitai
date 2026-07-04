'use client'

import { BB_V2 } from '@/lib/betterbit-v2'
import type { WeekSummary } from '@/lib/analytics/week-summary'
import BBCard from '@/components/ui/BBCard'

interface Props {
  summary: WeekSummary
}

export default function WeekTrendCards({ summary }: Props) {
  const { analysis, weeklyMetrics } = summary
  const dinnerPct = Math.round((analysis.dinnerCaloriesRatio ?? 0) * 100)
  const proteinStable =
    analysis.proteinTrend.totalDays > 0 &&
    analysis.proteinTrend.metDays / analysis.proteinTrend.totalDays >= 0.6

  const cards = [
    {
      title: '熱量趨勢',
      value: analysis.calorieTrend.average != null ? `${analysis.calorieTrend.average}` : '—',
      unit: 'kcal 平均',
      note:
        analysis.calorieTrend.deltaFromTarget != null
          ? analysis.calorieTrend.deltaFromTarget > 0
            ? `比目標高 ${analysis.calorieTrend.deltaFromTarget} kcal`
            : analysis.calorieTrend.deltaFromTarget < -80
              ? `比目標低 ${Math.abs(analysis.calorieTrend.deltaFromTarget)} kcal`
              : '接近目標，節奏穩定'
          : '多記幾餐就能看趨勢',
    },
    {
      title: '記錄天數',
      value: `${weeklyMetrics.calorieTotalDays > 0 ? analysis.calorieTrend.points.filter(p => p.value > 0).length : 0}`,
      unit: '天有記錄',
      note: '不用補過去，記下一餐就好',
    },
    {
      title: '晚餐佔比',
      value: dinnerPct > 0 ? `${dinnerPct}` : '—',
      unit: dinnerPct > 0 ? '% 每日熱量' : '待確認',
      note:
        dinnerPct > 42
          ? '晚餐最容易超出，下一餐選小份量'
          : dinnerPct > 0
            ? '晚餐比例還算合理'
            : '記錄幾餐後會顯示',
    },
    {
      title: '蛋白質',
      value: analysis.proteinTrend.average != null ? `${analysis.proteinTrend.average}` : '—',
      unit: 'g 平均',
      note: proteinStable ? '這週蛋白質算穩定' : '可以優先補一點蛋白質',
    },
  ]

  return (
    <section className="space-y-3">
      <h2 className="text-[17px] px-0.5" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
        週趨勢
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => (
          <BBCard key={card.title} padding={16}>
            <p className="text-[12px] mb-2" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
              {card.title}
            </p>
            <p className="text-[22px] tabular-nums leading-none" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              {card.value}
            </p>
            <p className="text-[11px] mt-1" style={{ color: BB_V2.text.secondary }}>
              {card.unit}
            </p>
            <p className="text-[12px] mt-2 leading-snug" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
              {card.note}
            </p>
          </BBCard>
        ))}
      </div>
    </section>
  )
}
