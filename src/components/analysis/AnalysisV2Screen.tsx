'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Footprints,
  Leaf,
  Percent,
  Scale,
  Sparkles,
  Target,
} from 'lucide-react'
import V2Header from '@/components/betterbit-v2/V2Header'
import V2PageBackground from '@/components/betterbit-v2/V2PageBackground'
import type { AnalysisCheckinRow, AnalysisDayPlanHint, AnalysisTargets } from '@/lib/analytics/analysis-summary'
import { weightChartYDomain } from '@/lib/analytics/analysis-summary'
import {
  buildAnalysisWeekView,
  canNavigateAnalysisWeek,
  initialAnalysisWeekAnchor,
  shiftAnalysisWeekAnchor,
  type AnalysisAdherencePoint,
  type AnalysisTrendPoint,
} from '@/lib/analysis/analysis-page-data'
import type { BodyMeasurement } from '@/types'

interface Props {
  todayStr: string
  measurements: BodyMeasurement[]
  checkins: AnalysisCheckinRow[]
  targets: AnalysisTargets
  dayPlansByDate?: Record<string, AnalysisDayPlanHint>
  currentWeightKg?: number | null
  profileWeightKg?: number | null
  anchorDate?: Date
  onNavigateWeek?: (direction: -1 | 1) => void
  canGoNextWeek?: boolean
  onRefresh?: () => void
  isWeekTransitioning?: boolean
}

function formatNum(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('zh-TW', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function formatInt(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('zh-TW')
}

export function formatAnalysisTrendDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return date
  return `${Number(match[2])} 月 ${Number(match[3])} 日`
}

function DeltaBadge({ value, unit, invert = false }: { value: number | null; unit?: string; invert?: boolean }) {
  if (value == null || Math.abs(value) < 0.05) return null
  const improved = invert ? value > 0 : value < 0
  const arrow = value < 0 ? '▼' : '▲'
  const display = Math.abs(value)
  return (
    <span className="v2-analysis-delta" style={{ color: improved ? '#2f8f35' : '#d85b4a' }}>
      {arrow} {display}
      {unit ?? ''}
    </span>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  unit,
  delta,
  deltaUnit,
  invertDelta,
  stagger,
}: {
  icon: ReactNode
  label: string
  value: string
  unit: string
  delta: number | null
  deltaUnit?: string
  invertDelta?: boolean
  stagger: number
}) {
  return (
    <div className="v2-analysis-summary-card v2-analysis-stagger" style={{ animationDelay: `${stagger}ms` }}>
      <div className="v2-analysis-summary-icon">{icon}</div>
      <p className="v2-analysis-summary-label">{label}</p>
      <p className="v2-analysis-summary-value">
        {value}
        <span className="v2-analysis-summary-unit">{unit}</span>
      </p>
      <DeltaBadge value={delta} unit={deltaUnit} invert={invertDelta} />
    </div>
  )
}

function LineChartCard({
  title,
  unit,
  points,
  emptyMessage,
  stagger,
  interactive = false,
}: {
  title: string
  unit: string
  points: AnalysisTrendPoint[]
  emptyMessage: string
  stagger: number
  interactive?: boolean
}) {
  const cardRef = useRef<HTMLElement>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const values = points.map(p => p.value).filter((v): v is number => v != null)
  const hasData = values.length >= 2

  useEffect(() => {
    if (!interactive || selectedDate == null) return
    const closeOutside = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) setSelectedDate(null)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [interactive, selectedDate])

  if (!hasData) {
    return (
      <section className="v2-analysis-chart-card v2-analysis-stagger" style={{ animationDelay: `${stagger}ms` }}>
        <div className="v2-analysis-chart-head">
          <h3 className="v2-analysis-chart-title">{title}</h3>
          <span className="v2-analysis-chart-unit">單位：{unit}</span>
        </div>
        <p className="v2-analysis-empty-chart">{emptyMessage}</p>
      </section>
    )
  }

  const w = 300
  const h = 140
  const padL = 28
  const padR = 44
  const padT = 16
  const padB = 28
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const [yMin, yMax] = weightChartYDomain(values.map(v => ({ weight: v })))
  const latest = values.at(-1)!

  const coords = points.map((p, i) => {
    const x = padL + (i / Math.max(points.length - 1, 1)) * innerW
    const v = p.value ?? yMin
    const y = padT + innerH - ((v - yMin) / Math.max(yMax - yMin, 0.1)) * innerH
    return { x, y, label: p.label, value: p.value }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const areaPath = `${linePath} L ${coords.at(-1)!.x} ${padT + innerH} L ${coords[0].x} ${padT + innerH} Z`
  const selectedIndex = interactive ? points.findIndex(point => point.date === selectedDate) : -1
  const selectedPoint = selectedIndex >= 0 ? points[selectedIndex] : null
  const selectedCoord = selectedIndex >= 0 ? coords[selectedIndex] : null

  const yTicks = 4
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const v = yMin + ((yMax - yMin) * i) / (yTicks - 1)
    const y = padT + innerH - ((v - yMin) / Math.max(yMax - yMin, 0.1)) * innerH
    return { v: Math.round(v * 10) / 10, y }
  })

  return (
    <section
      ref={cardRef}
      className="v2-analysis-chart-card v2-analysis-stagger"
      style={{ animationDelay: `${stagger}ms` }}
      onClick={event => {
        if (!(event.target as Element).closest('[data-analysis-point]')) setSelectedDate(null)
      }}
    >
      <div className="v2-analysis-chart-head">
        <h3 className="v2-analysis-chart-title">{title}</h3>
        <span className="v2-analysis-chart-unit">單位：{unit}</span>
      </div>
      <div className="v2-analysis-chart-wrap">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="v2-analysis-line-chart"
          aria-hidden={interactive ? undefined : true}
          aria-label={interactive ? `${title}，點選資料點查看日期與${unit}` : undefined}
        >
          {yLabels.map(t => (
            <g key={t.v}>
              <line x1={padL} y1={t.y} x2={w - padR} y2={t.y} className="v2-analysis-grid-line" />
              <text x={padL - 6} y={t.y + 4} className="v2-analysis-axis-label" textAnchor="end">
                {t.v}
              </text>
            </g>
          ))}
          <path d={areaPath} className="v2-analysis-area-fill" />
          <path d={linePath} className="v2-analysis-line" fill="none" />
          {coords.map((c, i) => {
            if (c.value == null) return null
            if (!interactive) {
              return <circle key={points[i].date} cx={c.x} cy={c.y} r="4" className="v2-analysis-dot" />
            }
            const active = points[i].date === selectedDate
            const toggle = () => setSelectedDate(current => (current === points[i].date ? null : points[i].date))
            return (
              <g
                key={points[i].date}
                data-analysis-point={points[i].date}
                data-active={active ? 'true' : 'false'}
                className="v2-analysis-point-target"
                role="button"
                tabIndex={0}
                aria-label={`${formatAnalysisTrendDate(points[i].date)}，${formatNum(c.value)} ${unit}`}
                aria-pressed={active}
                onClick={event => {
                  event.stopPropagation()
                  toggle()
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggle()
                  }
                }}
              >
                <circle cx={c.x} cy={c.y} r="12" className="v2-analysis-dot-hit" />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={active ? 6 : 4}
                  className={`v2-analysis-dot ${active ? 'v2-analysis-dot--active' : ''}`}
                />
              </g>
            )
          })}
          <text x={w - padR + 4} y={coords.at(-1)!.y + 4} className="v2-analysis-latest-value">
            {latest}
          </text>
        </svg>
        {selectedPoint?.value != null && selectedCoord && (
          <div
            className="v2-analysis-point-tooltip"
            style={{ left: `clamp(58px, ${(selectedCoord.x / w) * 100}%, calc(100% - 58px))` }}
            role="status"
            data-analysis-tooltip
          >
            <span>{formatAnalysisTrendDate(selectedPoint.date)}</span>
            <strong>{formatNum(selectedPoint.value)} {unit}</strong>
          </div>
        )}
        <div className="v2-analysis-x-labels">
          {points.map(p => (
            <span key={p.date} className="v2-analysis-x-label">
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function AdherenceChart({
  points,
  stagger,
}: {
  points: AnalysisAdherencePoint[]
  stagger: number
}) {
  const maxBar = 100
  return (
    <section className="v2-analysis-chart-card v2-analysis-stagger" style={{ animationDelay: `${stagger}ms` }}>
      <div className="v2-analysis-chart-head">
        <h3 className="v2-analysis-chart-title">每日熱量達成率</h3>
      </div>
      <div className="v2-analysis-bar-chart">
        {points.map(p => {
          const pct = p.percent ?? 0
          const height = p.percent != null ? Math.min(100, Math.max(8, (pct / maxBar) * 100)) : 0
          return (
            <div key={p.date} className="v2-analysis-bar-col">
              <span className={`v2-analysis-bar-pct ${p.overTarget ? 'v2-analysis-bar-pct--high' : ''}`}>
                {p.percent != null ? `${p.percent}%` : '—'}
              </span>
              <div className="v2-analysis-bar-track">
                <div
                  className={`v2-analysis-bar-fill ${p.overTarget ? 'v2-analysis-bar-fill--high' : ''}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="v2-analysis-x-label">{p.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function AnalysisV2Screen({
  todayStr,
  measurements,
  checkins,
  targets,
  dayPlansByDate,
  currentWeightKg,
  profileWeightKg,
  anchorDate: anchorDateProp,
  onNavigateWeek,
  canGoNextWeek: canGoNextWeekProp,
  onRefresh,
  isWeekTransitioning,
}: Props) {
  const router = useRouter()
  const [internalAnchor, setInternalAnchor] = useState(() => initialAnalysisWeekAnchor(todayStr))
  const [isPending, startTransition] = useTransition()
  const anchor = anchorDateProp ?? internalAnchor

  const weekView = useMemo(
    () =>
      buildAnalysisWeekView({
        anchorDate: anchor,
        todayStr,
        measurements,
        checkins,
        targets,
        dayPlansByDate,
        currentWeightKg,
        profileWeightKg,
      }),
    [anchor, todayStr, measurements, checkins, targets, dayPlansByDate, currentWeightKg, profileWeightKg]
  )

  const canPrev = true
  const canNext = canGoNextWeekProp ?? canNavigateAnalysisWeek(anchor, 1, todayStr)
  const isPendingState = isWeekTransitioning ?? isPending

  const navigateWeek = useCallback(
    (direction: -1 | 1) => {
      if (direction === 1 && !canNext) return
      if (onNavigateWeek) {
        onNavigateWeek(direction)
        return
      }
      startTransition(() => {
        setInternalAnchor(prev => shiftAnalysisWeekAnchor(prev, direction))
      })
    },
    [canNext, onNavigateWeek]
  )

  const refresh = useCallback(() => {
    if (onRefresh) {
      onRefresh()
      return
    }
    router.refresh()
  }, [onRefresh, router])

  return (
    <V2PageBackground className="v2-analysis-page">
      <V2Header onHistory={refresh} hideRight={false} />

      <div className="v2-analysis-inner app-tab-page-content app-tab-column">
        <div className="v2-analysis-week-switch">
          <button
            type="button"
            className="v2-analysis-week-arrow touch-manipulation"
            onClick={() => navigateWeek(-1)}
            disabled={!canPrev || isPendingState}
            aria-label="前一週"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
          </button>
          <div className="v2-analysis-week-label">
            <p className="v2-analysis-week-title">本週回顧</p>
            <p className="v2-analysis-week-range">{weekView.weekLabel}</p>
          </div>
          <button
            type="button"
            className="v2-analysis-week-arrow touch-manipulation"
            onClick={() => navigateWeek(1)}
            disabled={!canNext || isPendingState}
            aria-label="後一週"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>

        <div className={`v2-analysis-body ${isPendingState ? 'v2-analysis-body--pending' : ''}`}>
          <div className="v2-analysis-summary-row">
            <SummaryCard
              icon={<Scale className="h-4 w-4" />}
              label="平均體重"
              value={formatNum(weekView.summary.avgWeight)}
              unit="kg"
              delta={weekView.summary.weightDelta}
              stagger={0}
            />
            <SummaryCard
              icon={<Percent className="h-4 w-4" />}
              label="平均體脂"
              value={formatNum(weekView.summary.avgBodyFat)}
              unit="%"
              delta={weekView.summary.bodyFatDelta}
              stagger={40}
            />
            <SummaryCard
              icon={<Flame className="h-4 w-4" />}
              label="平均熱量"
              value={formatInt(weekView.summary.avgCalories)}
              unit="kcal"
              delta={weekView.summary.calorieDelta}
              deltaUnit=""
              stagger={80}
            />
            <SummaryCard
              icon={<Target className="h-4 w-4" />}
              label="熱量達成率"
              value={weekView.summary.adherenceRate != null ? String(weekView.summary.adherenceRate) : '—'}
              unit="%"
              delta={weekView.summary.adherenceDelta}
              deltaUnit="%"
              invertDelta
              stagger={120}
            />
          </div>

          <LineChartCard
            title="體重趨勢"
            unit="kg"
            points={weekView.weightTrend}
            emptyMessage="尚未有足夠體重紀錄。到「我的 → 身體數據」新增後，這裡會顯示趨勢。"
            stagger={160}
            interactive
          />

          <LineChartCard
            title="體脂趨勢"
            unit="%"
            points={weekView.bodyFatTrend}
            emptyMessage="尚未有足夠體脂紀錄。新增身體數據後，這裡會顯示趨勢。"
            stagger={200}
          />

          <AdherenceChart points={weekView.calorieAdherence} stagger={240} />

          <section className="v2-analysis-coach-card v2-analysis-stagger" style={{ animationDelay: '280ms' }}>
            <div className="v2-analysis-coach-head">
              <div className="v2-analysis-coach-icon">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="v2-analysis-chart-title">本週教練總結</h3>
            </div>
            <p className="v2-analysis-coach-line">{weekView.coachSummary.line1}</p>
            <p className="v2-analysis-coach-line">{weekView.coachSummary.line2}</p>
          </section>

          <section className="v2-analysis-goals v2-analysis-stagger" style={{ animationDelay: '320ms' }}>
            <h3 className="v2-analysis-goals-title">下週目標：</h3>
            <div className="v2-analysis-goals-row">
              <div className="v2-analysis-goal-card">
                <div className="v2-analysis-goal-icon v2-analysis-goal-icon--cal">
                  <Flame className="h-4 w-4" />
                </div>
                <p className="v2-analysis-goal-label">每日熱量</p>
                <p className="v2-analysis-goal-value">
                  {weekView.nextWeekTargets.calories.toLocaleString('zh-TW')}
                  <span className="v2-analysis-summary-unit">kcal</span>
                </p>
              </div>
              <div className="v2-analysis-goal-card">
                <div className="v2-analysis-goal-icon v2-analysis-goal-icon--pro">
                  <Leaf className="h-4 w-4" />
                </div>
                <p className="v2-analysis-goal-label">蛋白質</p>
                <p className="v2-analysis-goal-value">
                  {weekView.nextWeekTargets.protein_g}
                  <span className="v2-analysis-summary-unit">g</span>
                </p>
              </div>
              <div className="v2-analysis-goal-card">
                <div className="v2-analysis-goal-icon v2-analysis-goal-icon--steps">
                  <Footprints className="h-4 w-4" />
                </div>
                <p className="v2-analysis-goal-label">
                  每日步數{weekView.nextWeekTargets.stepsIsSuggestion ? '（建議）' : ''}
                </p>
                <p className="v2-analysis-goal-value">
                  {weekView.nextWeekTargets.steps.toLocaleString('zh-TW')}
                  <span className="v2-analysis-summary-unit">步</span>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </V2PageBackground>
  )
}
