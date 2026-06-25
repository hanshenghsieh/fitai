'use client'

import { useCountUp } from '@/hooks/useCountUp'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { WeekScoreResult } from '@/lib/analytics/week-score'
import type { WeeklyMetrics } from '@/lib/analytics/week-challenge'
import type { BBIconName } from '@/components/icons'
import BBIcon from '@/components/icons/BBIcon'
import BBCard from '@/components/ui/BBCard'

import { weekScoreTextColor } from './week-colors'

interface Props {
  weekScore: WeekScoreResult
  metrics: WeeklyMetrics
}

function ArcGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score)) / 100
  const r = 52
  const cx = 64
  const cy = 64
  const start = Math.PI
  const end = Math.PI * (1 - pct)
  const x1 = cx + r * Math.cos(start)
  const y1 = cy + r * Math.sin(start)
  const x2 = cx + r * Math.cos(end)
  const y2 = cy + r * Math.sin(end)
  const large = pct > 0.5 ? 1 : 0
  const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`

  return (
    <svg width="128" height="80" viewBox="0 0 128 88" aria-hidden>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={BB_V2.ring.track}
        strokeWidth="10"
        strokeLinecap="round"
      />
      {pct > 0 && (
        <path d={d} fill="none" stroke={weekScoreTextColor(score)} strokeWidth="10" strokeLinecap="round" />
      )}
    </svg>
  )
}

function MetricBadge({
  icon,
  label,
  current,
  total,
  barTone,
}: {
  icon: BBIconName
  label: string
  current: number
  total: number
  barTone: 'success' | 'accent' | 'water'
}) {
  const iconTone = barTone === 'water' ? 'water' : barTone === 'accent' ? 'accent' : 'success'
  const barColor =
    barTone === 'water'
      ? 'var(--bb-icon-color-water)'
      : barTone === 'accent'
        ? 'var(--bb-icon-color-accent)'
        : 'var(--bb-icon-color-success)'
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 mb-1">
        <BBIcon name={icon} size={14} tone={iconTone} />
        <span className="text-[11px] truncate" style={{ color: 'var(--bb-text-secondary)' }}>
          {label}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: BB_V2.bg.pill }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      <p className="text-[11px] mt-1 tabular-nums" style={{ color: 'var(--bb-text-primary)', fontWeight: 600 }}>
        {current} / {total}
      </p>
    </div>
  )
}

export default function WeekHeroCard({ weekScore, metrics }: Props) {
  const displayScore = useCountUp(weekScore.score, BB_V2.motion.countUpMs)

  return (
    <BBCard padding={20}>
      <div className="flex gap-4 items-start">
        <div className="shrink-0 text-center -mt-1">
          <ArcGauge score={weekScore.score} />
          <p
            className="text-[28px] -mt-10 tabular-nums"
            style={{ color: weekScoreTextColor(weekScore.score), fontWeight: 700 }}
          >
            {displayScore}
            <span className="text-[14px] font-medium"> 分</span>
          </p>
          <p className="text-[13px] mt-1" style={{ color: weekScoreTextColor(weekScore.score) }}>
            {weekScore.label}
          </p>
        </div>
        <div className="flex-1 pt-2">
          <p className="text-[14px]" style={{ color: 'var(--bb-text-secondary)' }}>
            距離本週目標還差{' '}
            <span style={{ color: 'var(--bb-text-accent)', fontWeight: 600 }}>{weekScore.gapToGoal} 分</span>
          </p>
          <div className="mt-3 relative h-2 rounded-full" style={{ backgroundColor: BB_V2.bg.pill }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(100, (weekScore.score / weekScore.goalScore) * 100)}%`,
                backgroundColor: 'var(--bb-icon-color-accent)',
              }}
            />
          </div>
          <p className="text-[11px] mt-1 text-right" style={{ color: 'var(--bb-text-secondary)' }}>
            目標 {weekScore.goalScore} 分
          </p>
        </div>
      </div>
      <div className="flex gap-3 mt-5 pt-4" style={{ borderTop: `1px solid ${BB_V2.divider}` }}>
        <MetricBadge icon="calories" label="熱量達標" current={metrics.calorieMetDays} total={metrics.calorieTotalDays} barTone="accent" />
        <MetricBadge icon="protein" label="蛋白質" current={metrics.proteinMetDays} total={metrics.proteinTotalDays} barTone="success" />
        <MetricBadge icon="workout" label="運動" current={metrics.workoutCompleted} total={metrics.workoutTarget} barTone="accent" />
        <MetricBadge icon="water" label="喝水" current={metrics.waterMetDays} total={metrics.waterTotalDays} barTone="water" />
      </div>
    </BBCard>
  )
}
