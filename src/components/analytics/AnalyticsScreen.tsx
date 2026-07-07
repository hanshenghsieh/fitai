'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import BBIcon from '@/components/icons/BBIcon'
import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'
import EmptyStateCard from '@/components/ui/EmptyStateCard'
import {
  buildAnalysisSummary,
  shiftAnalysisAnchor,
  type AnalysisCheckinRow,
  type AnalysisDayPlanHint,
  type AnalysisPeriodType,
  type AnalysisTargets,
} from '@/lib/analytics/analysis-summary'
import { buildProgressHeroDisplay } from '@/lib/analytics/progress-display'
import { buildMealRecommendationStrategy } from '@/lib/recommendation/meal-recommendation-strategy'
import { buildWorkoutRecommendationStrategy } from '@/lib/recommendation/workout-recommendation-strategy'
import type { BodyMeasurement } from '@/types'
import { isCapacitorNative } from '@/lib/capacitor-native'
import {
  appendWeightMeasurementLocal,
  mergeWeightMeasurementsMonotonic,
  readWeightMeasurementsSessionCache,
  resolveWeightMeasurementsFromSession,
  writeWeightMeasurementsSessionCache,
} from '@/lib/weight-measurements-session-cache'
import ProgressWeightLog from '@/components/progress/ProgressWeightLog'

const WeightTrendChart = dynamic(() => import('@/components/analytics/WeightTrendChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full py-8 text-center text-[13px]" style={{ color: BB_V2.text.secondary }}>
      載入趨勢圖…
    </div>
  ),
})

interface Props {
  measurements: BodyMeasurement[]
  checkins: AnalysisCheckinRow[]
  targets: AnalysisTargets
  dayPlansByDate?: Record<string, AnalysisDayPlanHint>
  currentWeightKg?: number | null
  profileWeightKg?: number | null
  plannedWorkoutTitle?: string
  todayDate?: string
}

const PERIODS: { id: AnalysisPeriodType; label: string }[] = [
  { id: 'day', label: '單日' },
  { id: 'week', label: '7 天' },
  { id: 'month', label: '30 天' },
]

function SegmentControl({
  value,
  onChange,
}: {
  value: AnalysisPeriodType
  onChange: (v: AnalysisPeriodType) => void
}) {
  return (
    <div className="flex p-1 rounded-full" style={{ backgroundColor: BB_V2.bg.pill }}>
      {PERIODS.map(p => {
        const active = value === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className="flex-1 h-9 rounded-full text-[14px] transition-colors"
            style={{
              backgroundColor: active ? BB_V2.accent.orange : 'transparent',
              color: active ? '#FFFFFF' : BB_V2.text.secondary,
              fontWeight: active ? 600 : 400,
            }}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

function InsightRow({ tone, title, body }: { tone: 'success' | 'warning' | 'neutral'; title: string; body: string }) {
  const iconTone = tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'muted'
  const iconName = tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'neutral'
  return (
    <div className="space-y-1">
      <p className="text-[15px] flex items-center gap-2" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
        <BBIcon name={iconName} size={18} tone={iconTone} />
        {title}
      </p>
      <p className="text-[14px] leading-relaxed" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
        {body}
      </p>
    </div>
  )
}

function WeightTrendSection({
  summary,
  lastWeightKg,
  onSaved,
}: {
  summary: ReturnType<typeof buildAnalysisSummary>
  lastWeightKg?: number | null
  onSaved: (weightKg: number) => void | Promise<void>
}) {
  return (
    <BBCard>
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[17px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          體重趨勢
        </p>
        {summary.weightTrend.deltaLabel && (
          <span
            className="text-[12px] px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(118,182,154,0.15)', color: BB_V2.accent.green, fontWeight: 600 }}
          >
            {summary.weightTrend.deltaLabel}
          </span>
        )}
      </div>
      {!summary.weightTrend.sufficient ? (
        <div className="py-2 text-center space-y-2">
          {summary.weightTrend.currentKg != null ? (
            <div>
              <p className="text-[12px]" style={{ color: BB_V2.text.secondary }}>目前</p>
              <p className="text-[22px] tabular-nums" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                {summary.weightTrend.currentKg.toFixed(1)} kg
              </p>
            </div>
          ) : null}
          <p className="text-[14px]" style={{ color: BB_V2.text.secondary }}>
            {summary.weightTrend.points.length === 1
              ? '再記一次，就能看見趨勢。'
              : '記一下體重，開始追蹤。'}
          </p>
          {summary.weightTrend.points.length === 1 && (
            <p className="text-[13px] tabular-nums" style={{ color: BB_V2.text.secondary }}>
              已記 {summary.weightTrend.points.length} 次
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-6 mb-4">
            <div>
              <p className="text-[12px]" style={{ color: BB_V2.text.secondary }}>目前</p>
              <p className="text-[22px] tabular-nums" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                {summary.weightTrend.currentKg?.toFixed(1)} kg
              </p>
            </div>
            {summary.weightTrend.targetKg != null && (
              <div>
                <p className="text-[12px]" style={{ color: BB_V2.text.secondary }}>目標</p>
                <p className="text-[22px] tabular-nums" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                  {summary.weightTrend.targetKg.toFixed(1)} kg
                </p>
              </div>
            )}
          </div>
          <WeightTrendChart points={summary.weightTrend.points} />
          <p className="text-[12px] mt-2 text-right" style={{ color: BB_V2.text.secondary }}>
            共 {summary.weightTrend.points.length} 次紀錄
          </p>
        </>
      )}
      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${BB_V2.divider}` }}>
        <ProgressWeightLog embedded lastWeightKg={lastWeightKg} onSaved={onSaved} />
      </div>
    </BBCard>
  )
}

export default function AnalyticsScreen({
  measurements,
  checkins,
  targets,
  dayPlansByDate,
  currentWeightKg,
  profileWeightKg,
  plannedWorkoutTitle,
  todayDate,
}: Props) {
  const [periodType, setPeriodType] = useState<AnalysisPeriodType>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [showDetails, setShowDetails] = useState(false)
  const [liveMeasurements, setLiveMeasurements] = useState<BodyMeasurement[] | null>(null)
  const [liveCurrentWeightKg, setLiveCurrentWeightKg] = useState<number | null | undefined>(undefined)
  const liveMeasurementsRef = useRef<BodyMeasurement[] | null>(null)

  const serverMeasurements = useMemo(
    () => resolveWeightMeasurementsFromSession(measurements),
    [measurements]
  )
  const effectiveMeasurements = liveMeasurements ?? serverMeasurements

  useEffect(() => {
    liveMeasurementsRef.current = liveMeasurements
  }, [liveMeasurements])
  const effectiveCurrentWeightKg =
    liveCurrentWeightKg !== undefined ? liveCurrentWeightKg : currentWeightKg
  const profileWeightRef = useRef(profileWeightKg)
  useEffect(() => {
    if (profileWeightKg != null) profileWeightRef.current = profileWeightKg
  }, [profileWeightKg])
  const trendProfileWeightKg = profileWeightRef.current ?? profileWeightKg
  const priorWeightRef = useRef<number | null>(null)

  const refreshMeasurements = useCallback(
    async (latestWeightKg?: number, clientSnapshot?: BodyMeasurement[]) => {
      try {
        const res = await fetch('/api/measurements', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (!res.ok) return
        const data = (await res.json()) as { measurements?: BodyMeasurement[] }
        const apiRows = data.measurements ?? []
        const floor = [
          clientSnapshot,
          liveMeasurementsRef.current,
          readWeightMeasurementsSessionCache(),
          serverMeasurements,
        ]
        const merged = mergeWeightMeasurementsMonotonic(apiRows, ...floor)
        const minExpected = Math.max(...floor.map(f => f?.length ?? 0), 0)
        if (minExpected > 0 && merged.length < minExpected) return
        liveMeasurementsRef.current = merged
        setLiveMeasurements(merged)
        writeWeightMeasurementsSessionCache(merged)
        if (latestWeightKg != null) setLiveCurrentWeightKg(latestWeightKg)
      } catch {
        // ignore — SSR + session cache remain fallback
      }
    },
    [serverMeasurements]
  )

  useEffect(() => {
    if (!isCapacitorNative()) return
    void refreshMeasurements()
  }, [refreshMeasurements])

  const summary = useMemo(
    () =>
      buildAnalysisSummary({
        periodType,
        anchorDate,
        todayDate,
        measurements: effectiveMeasurements,
        checkins,
        targets,
        dayPlansByDate,
        currentWeightKg: effectiveCurrentWeightKg,
        profileWeightKg: trendProfileWeightKg,
        priorWeightKg: priorWeightRef.current,
      }),
    [
      periodType,
      anchorDate,
      todayDate,
      effectiveMeasurements,
      checkins,
      targets,
      dayPlansByDate,
      effectiveCurrentWeightKg,
      trendProfileWeightKg,
    ]
  )

  const hero = useMemo(() => buildProgressHeroDisplay(summary), [summary])
  const mealRec = useMemo(() => buildMealRecommendationStrategy(summary), [summary])
  const workoutRec = useMemo(
    () => buildWorkoutRecommendationStrategy(summary, plannedWorkoutTitle),
    [summary, plannedWorkoutTitle]
  )

  const primaryInsight = summary.insights[0]
  const nextAction = summary.nextActions.find(a => !a.done) ?? summary.nextActions[0]

  const macroData = [
    { name: '蛋白質', value: summary.macroRatio.proteinPct, color: BB_V2.macro.protein },
    { name: '碳水', value: summary.macroRatio.carbsPct, color: BB_V2.macro.carbs },
    { name: '脂肪', value: summary.macroRatio.fatPct, color: BB_V2.macro.fat },
  ]

  const distData = [
    { name: '早餐', pct: summary.calorieDistribution.breakfastPct, kcal: summary.calorieDistribution.breakfastKcal },
    { name: '午餐', pct: summary.calorieDistribution.lunchPct, kcal: summary.calorieDistribution.lunchKcal },
    { name: '晚餐', pct: summary.calorieDistribution.dinnerPct, kcal: summary.calorieDistribution.dinnerKcal },
    { name: '點心', pct: summary.calorieDistribution.snackPct, kcal: summary.calorieDistribution.snackKcal },
  ]

  const handleWeightSaved = useCallback(
    async (weightKg: number, savedMeasurements?: BodyMeasurement[]) => {
      const userId = measurements[0]?.user_id ?? 'local'
      const base = liveMeasurementsRef.current ?? serverMeasurements
      const priorKg = base
        .filter(m => m.weight_kg != null)
        .map(m => m.weight_kg as number)
        .at(-1)
      if (
        priorKg != null &&
        Math.abs(priorKg - weightKg) >= 0.05 &&
        !base.some(m => m.weight_kg != null && Math.abs(m.weight_kg - weightKg) < 0.05)
      ) {
        priorWeightRef.current = priorKg
      }
      const floor = [base, readWeightMeasurementsSessionCache()]
      const optimistic = appendWeightMeasurementLocal(base, {
        user_id: userId,
        measured_at: todayDate,
        weight_kg: weightKg,
      })
      const next = mergeWeightMeasurementsMonotonic(
        savedMeasurements?.length ? savedMeasurements : optimistic,
        optimistic,
        ...floor
      )
      liveMeasurementsRef.current = next
      writeWeightMeasurementsSessionCache(next)
      setLiveMeasurements(next)
      setLiveCurrentWeightKg(weightKg)
      if (
        savedMeasurements &&
        savedMeasurements.length < next.length &&
        savedMeasurements.length < base.length + 1
      ) {
        toast.error('部分體重紀錄可能未同步，請稍後再試')
      }
      await refreshMeasurements(weightKg, next)
    },
    [measurements, refreshMeasurements, serverMeasurements, todayDate]
  )

  if (summary.insufficient_data) {
    return (
      <div className="px-5 app-page-top pb-10 space-y-5 max-w-lg mx-auto" style={{ fontFamily: BB_V2.font }}>
        <header>
          <h1 className="text-[22px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            進步
          </h1>
          <p className="text-[14px] mt-1" style={{ color: BB_V2.text.secondary }}>
            先記體重，飲食紀錄夠了就能看完整趨勢
          </p>
        </header>
        <SegmentControl value={periodType} onChange={setPeriodType} />
        <WeightTrendSection
          summary={summary}
          lastWeightKg={summary.weightTrend.previousKg ?? summary.weightTrend.currentKg}
          onSaved={handleWeightSaved}
        />
        <EmptyStateCard
          title="飲食紀錄還不夠"
          reason={summary.insufficient_reason ?? '先記錄今天第一餐，BetterBit 就能幫你看熱量趨勢。'}
          ctaLabel="回到今天"
          ctaHref="/dashboard"
        />
      </div>
    )
  }

  return (
    <div className="px-5 app-page-top pb-10 space-y-5 max-w-lg mx-auto" style={{ fontFamily: BB_V2.font }}>
      <header>
        <h1 className="text-[22px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          進步
        </h1>
        <p className="text-[14px] mt-1" style={{ color: BB_V2.text.secondary }}>
          看看最近有沒有變好，以及下一步怎麼做
        </p>
      </header>

      <SegmentControl value={periodType} onChange={setPeriodType} />

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="上一段"
          onClick={() => setAnchorDate(d => shiftAnalysisAnchor(periodType, d, -1))}
          className="p-2 rounded-full"
          style={{ color: BB_V2.text.secondary }}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />
        </button>
        <p className="text-[14px] text-center flex-1" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
          {summary.dateRange.label}
        </p>
        <button
          type="button"
          aria-label="下一段"
          onClick={() => setAnchorDate(d => shiftAnalysisAnchor(periodType, d, 1))}
          className="p-2 rounded-full"
          style={{ color: BB_V2.text.secondary }}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />
        </button>
      </div>

      {/* Progress Hero */}
      <BBCard padding={20}>
        <p className="text-[13px] mb-2" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
          {hero.periodLabel}摘要
        </p>
        <p className="text-[20px] leading-snug" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          {hero.headline}
        </p>
        <p className="text-[14px] mt-2 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
          {hero.interpretation}
        </p>
      </BBCard>

      {/* Weight trend chart */}
      <WeightTrendSection
        summary={summary}
        lastWeightKg={summary.weightTrend.previousKg ?? summary.weightTrend.currentKg}
        onSaved={handleWeightSaved}
      />

      {/* Calorie trend */}
      <BBCard>
        <p className="text-[17px] mb-1" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          熱量趨勢
        </p>
        <p className="text-[13px] mb-3" style={{ color: BB_V2.text.secondary }}>
          {summary.calorieTrend.deltaFromTarget != null && summary.calorieTrend.deltaFromTarget > 0
            ? `平均高出目標 ${summary.calorieTrend.deltaFromTarget} kcal，下一餐選小份量就好`
            : summary.calorieTrend.deltaFromTarget != null && summary.calorieTrend.deltaFromTarget <= -80
              ? `平均低於目標 ${Math.abs(summary.calorieTrend.deltaFromTarget)} kcal，節奏不錯`
              : '接近目標，維持記錄習慣'}
        </p>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[22px] tabular-nums" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            平均 {summary.calorieTrend.average ?? '—'} kcal
          </p>
          <p className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
            目標 {summary.calorieTrend.target} kcal
          </p>
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={summary.calorieTrend.points}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <ReferenceLine y={summary.calorieTrend.target} stroke={BB_V2.text.secondary} strokeDasharray="4 4" />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {summary.calorieTrend.points.map(p => (
                <Cell key={p.date} fill={p.metTarget ? BB_V2.accent.green : BB_V2.accent.orange} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </BBCard>

      {/* Primary insight + next action */}
      {(primaryInsight || nextAction) && (
        <BBCard>
          <p className="text-[17px] mb-4" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            這段時間的重點
          </p>
          {primaryInsight ? <InsightRow tone={primaryInsight.tone} title={primaryInsight.title} body={primaryInsight.body} /> : null}
          {nextAction && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${BB_V2.divider}` }}>
              <p className="text-[13px] mb-1" style={{ color: BB_V2.accent.orange, fontWeight: 600 }}>
                下一步
              </p>
              <p className="text-[14px] leading-relaxed" style={{ color: BB_V2.text.primary }}>
                {nextAction.label}
              </p>
              {mealRec && (
                <p className="text-[13px] mt-2 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
                  配餐參考：{mealRec.name} — {mealRec.reason}
                </p>
              )}
              {workoutRec && (
                <p className="text-[13px] mt-1 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
                  運動參考：{workoutRec.title} {workoutRec.duration} 分鐘
                </p>
              )}
            </div>
          )}
        </BBCard>
      )}

      {/* Collapsible secondary details */}
      <button
        type="button"
        onClick={() => setShowDetails(v => !v)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-[14px]"
        style={{ color: BB_V2.text.secondary, fontWeight: 500 }}
      >
        {showDetails ? '收起詳細分析' : '查看更多分析'}
        {showDetails ? (
          <ChevronUp className="h-4 w-4" strokeWidth={BB_V2.iconStroke} />
        ) : (
          <ChevronDown className="h-4 w-4" strokeWidth={BB_V2.iconStroke} />
        )}
      </button>

      {showDetails && (
        <div className="space-y-5">
          <BBCard>
            <p className="text-[17px] mb-3" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              蛋白質達標
            </p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={summary.proteinTrend.points}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <ReferenceLine y={summary.proteinTrend.target} stroke={BB_V2.text.secondary} strokeDasharray="4 4" />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {summary.proteinTrend.points.map(p => (
                    <Cell key={p.date} fill={p.metTarget ? BB_V2.accent.green : BB_V2.macro.protein} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[13px] mt-2" style={{ color: BB_V2.text.secondary }}>
              達標 {summary.proteinTrend.metDays} / {summary.proteinTrend.totalDays} 天
            </p>
          </BBCard>

          {summary.insights.length > 1 && (
            <BBCard>
              <div className="space-y-5">
                {summary.insights.slice(1).map((ins, i) => (
                  <InsightRow key={i} tone={ins.tone} title={ins.title} body={ins.body} />
                ))}
              </div>
            </BBCard>
          )}

          <BBCard>
            <p className="text-[17px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              三大營養素比例
            </p>
            {summary.macroRatio.sufficient ? (
              <div className="flex items-center gap-4 mt-3">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={macroData} dataKey="value" innerRadius={30} outerRadius={44} paddingAngle={2}>
                      {macroData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 text-[14px]" style={{ color: BB_V2.text.secondary }}>
                  <p>蛋白質 {summary.macroRatio.proteinPct}%</p>
                  <p>碳水 {summary.macroRatio.carbsPct}%</p>
                  <p>脂肪 {summary.macroRatio.fatPct}%</p>
                </div>
              </div>
            ) : (
              <p className="text-[14px] mt-2" style={{ color: BB_V2.text.secondary }}>
                資料不足，多記幾餐後會顯示
              </p>
            )}
          </BBCard>

          <BBCard>
            <p className="text-[17px] mb-3" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              熱量分布
            </p>
            {summary.calorieDistribution.sufficient ? (
              <div className="space-y-2">
                {distData.map(row => (
                  <div key={row.name} className="flex justify-between text-[14px]">
                    <span style={{ color: BB_V2.text.secondary }}>{row.name}</span>
                    <span style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                      {row.pct}%（{row.kcal} kcal）
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px]" style={{ color: BB_V2.text.secondary }}>
                資料不足
              </p>
            )}
          </BBCard>

          {summary.bestDay && (
            <BBCard>
              <p className="text-[17px] mb-2" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                表現最好的一天
              </p>
              <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                {summary.bestDay.label}
              </p>
              <p className="text-[14px] mt-1" style={{ color: BB_V2.text.secondary }}>
                熱量 {summary.bestDay.calories} kcal
              </p>
            </BBCard>
          )}
        </div>
      )}

      {/* Terminal CTAs */}
      <div className="space-y-3 pt-2">
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
        <Link
          href="/weekly"
          className="flex w-full h-12 items-center justify-center text-[14px] active:opacity-90"
          style={{
            borderRadius: BB_V2.radius.button,
            backgroundColor: BB_V2.bg.pill,
            color: BB_V2.text.primary,
            fontWeight: 600,
          }}
        >
          看本週建議
        </Link>
      </div>
    </div>
  )
}
