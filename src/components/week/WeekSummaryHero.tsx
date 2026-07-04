'use client'

import { BB_V2 } from '@/lib/betterbit-v2'
import type { WeekHeroDisplay } from '@/lib/analytics/week-display'
import BBCard from '@/components/ui/BBCard'

interface Props {
  hero: WeekHeroDisplay
}

export default function WeekSummaryHero({ hero }: Props) {
  return (
    <BBCard padding={20}>
      <p className="text-[13px] mb-2" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
        本週摘要
      </p>
      <p className="text-[20px] leading-snug" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
        {hero.headline}
      </p>
      <p className="text-[14px] mt-2 leading-relaxed" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
        {hero.interpretation}
      </p>
      <div className="grid grid-cols-3 gap-3 mt-5 pt-4" style={{ borderTop: `1px solid ${BB_V2.divider}` }}>
        <Stat label="平均熱量" value={hero.avgCalories != null ? `${hero.avgCalories}` : '—'} unit="kcal" />
        <Stat label="記錄天數" value={`${hero.loggedDays}`} unit={`/ ${hero.totalPastDays} 天`} />
        <Stat label="熱量達標" value={`${hero.metDays}`} unit={`/ ${hero.metTotalDays} 天`} />
      </div>
    </BBCard>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="text-center min-w-0">
      <p className="text-[11px] mb-1" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
        {label}
      </p>
      <p className="text-[18px] tabular-nums truncate" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
        {value}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
        {unit}
      </p>
    </div>
  )
}
