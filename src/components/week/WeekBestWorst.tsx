'use client'

import { BB_V2 } from '@/lib/betterbit-v2'
import type { WeekHighlightCard } from '@/lib/analytics/week-summary'
import BBIcon from '@/components/icons/BBIcon'
import BBCard from '@/components/ui/BBCard'

function HighlightCard({
  titleIcon,
  title,
  data,
  tone,
}: {
  titleIcon: 'best' | 'needImprove'
  title: string
  data: WeekHighlightCard
  tone: 'best' | 'worst'
}) {
  return (
    <BBCard
      padding={16}
      className="flex-1 min-w-0"
      style={{
        backgroundColor: tone === 'best' ? 'var(--bb-surface-success)' : 'var(--bb-surface-warning)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <BBIcon name={titleIcon} size={18} tone={tone === 'best' ? 'success' : 'warning'} />
        <h3 className="text-[15px]" style={{ color: 'var(--bb-text-primary)', fontWeight: 700 }}>
          {title}
        </h3>
      </div>
      <p className="text-[14px]" style={{ color: 'var(--bb-text-primary)', fontWeight: 600 }}>
        {data.label}
      </p>
      <p
        className="text-[22px] tabular-nums mt-1"
        style={{
          color: tone === 'best' ? 'var(--bb-text-success)' : 'var(--bb-text-danger)',
          fontWeight: 700,
        }}
      >
        {data.score} 分
      </p>
      <ul className="mt-3 space-y-1.5 text-[13px]">
        {tone === 'best' && data.positives?.map(line => (
          <li key={line} className="flex items-start gap-1.5" style={{ color: 'var(--bb-icon-color-success)' }}>
            <BBIcon name="success" size={14} tone="success" className="mt-0.5 shrink-0" />
            <span>{line}</span>
          </li>
        ))}
        {tone === 'worst' && data.issues.map(issue => (
          <li key={issue} className="flex items-start gap-1.5" style={{ color: 'var(--bb-icon-color-danger)' }}>
            <BBIcon name="warning" size={14} tone="warning" className="mt-0.5 shrink-0" />
            <span>{issue}</span>
          </li>
        ))}
      </ul>
    </BBCard>
  )
}

export default function WeekBestWorst({
  bestDay,
  worstDay,
}: {
  bestDay: WeekHighlightCard | null
  worstDay: WeekHighlightCard | null
}) {
  if (!bestDay && !worstDay) return null
  return (
    <section className="flex flex-col sm:flex-row gap-3">
      {bestDay && (
        <HighlightCard titleIcon="best" title="本週最佳表現" data={bestDay} tone="best" />
      )}
      {worstDay && (
        <HighlightCard titleIcon="needImprove" title="最需要改善" data={worstDay} tone="worst" />
      )}
    </section>
  )
}
