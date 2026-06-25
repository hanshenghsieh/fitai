'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import BBIcon from '@/components/icons/BBIcon'
import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'
import {
  buildAnalysisSummary,
  shiftAnalysisAnchor,
  type AnalysisCheckinRow,
  type AnalysisDayPlanHint,
  type AnalysisPeriodType,
  type AnalysisTargets,
} from '@/lib/analytics/analysis-summary'
import { buildMealRecommendationStrategy } from '@/lib/recommendation/meal-recommendation-strategy'
import { buildWorkoutRecommendationStrategy } from '@/lib/recommendation/workout-recommendation-strategy'
import type { BodyMeasurement } from '@/types'

interface Props {
  measurements: BodyMeasurement[]
  checkins: AnalysisCheckinRow[]
  targets: AnalysisTargets
  dayPlansByDate?: Record<string, AnalysisDayPlanHint>
  currentWeightKg?: number | null
  plannedWorkoutTitle?: string
}

const PERIODS: { id: AnalysisPeriodType; label: string }[] = [
  { id: 'day', label: '日' },
  { id: 'week', label: '週' },
  { id: 'month', label: '月' },
]

function SegmentControl({
  value,
  onChange,
}: {
  value: AnalysisPeriodType
  onChange: (v: AnalysisPeriodType) => void
}) {
  return (
    <div
      className="flex p-1 rounded-full"
      style={{ backgroundColor: BB_V2.bg.pill }}
    >
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

export default function AnalyticsScreen({
  measurements,
  checkins,
  targets,
  dayPlansByDate,
  currentWeightKg,
  plannedWorkoutTitle,
}: Props) {
  const [periodType, setPeriodType] = useState<AnalysisPeriodType>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())

  const summary = useMemo(
    () =>
      buildAnalysisSummary({
        periodType,
        anchorDate,
        measurements,
        checkins,
        targets,
        dayPlansByDate,
        currentWeightKg,
      }),
    [periodType, anchorDate, measurements, checkins, targets, dayPlansByDate, currentWeightKg]
  )

  const mealRec = useMemo(() => buildMealRecommendationStrategy(summary), [summary])
  const workoutRec = useMemo(
    () => buildWorkoutRecommendationStrategy(summary, plannedWorkoutTitle),
    [summary, plannedWorkoutTitle]
  )

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

  if (summary.insufficient_data) {
    return (
      <div className="px-5 pb-8 space-y-6" style={{ fontFamily: BB_V2.font }}>
        <h1 className="text-[34px] pt-2" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          分析
        </h1>
        <SegmentControl value={periodType} onChange={setPeriodType} />
        <BBCard className="text-center py-12">
          <p className="text-[18px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
            {summary.insufficient_reason}
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

  const lastWeight = summary.weightTrend.points.at(-1)

  return (
    <div className="px-5 pb-8 space-y-5" style={{ fontFamily: BB_V2.font }}>
      <h1 className="text-[34px] pt-2" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
        分析
      </h1>

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

      {/* 1. 體重趨勢 */}
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
          <p className="text-[14px] py-6 text-center" style={{ color: BB_V2.text.secondary }}>
            再記一次，就能看見趨勢。
          </p>
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
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={summary.weightTrend.points}>
                <XAxis dataKey="label" hide />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke={BB_V2.accent.orange}
                  strokeWidth={2}
                  dot={{ r: 4, fill: BB_V2.accent.orange }}
                />
              </LineChart>
            </ResponsiveContainer>
            {lastWeight && (
              <p className="text-[12px] text-right -mt-2" style={{ color: BB_V2.accent.orange, fontWeight: 600 }}>
                {lastWeight.weight}
              </p>
            )}
          </>
        )}
      </BBCard>

      {/* 2. 熱量趨勢 */}
      <BBCard>
        <p className="text-[17px] mb-3" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          熱量趨勢
        </p>
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-[22px] tabular-nums" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            平均 {summary.calorieTrend.average ?? '—'} kcal
          </p>
          <p className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
            目標 {summary.calorieTrend.target} kcal
          </p>
        </div>
        {summary.calorieTrend.deltaFromTarget != null && summary.calorieTrend.deltaFromTarget <= 0 && (
          <p className="text-[13px] mb-3" style={{ color: BB_V2.accent.green }}>
            比目標少 {Math.abs(summary.calorieTrend.deltaFromTarget)} kcal
          </p>
        )}
        <ResponsiveContainer width="100%" height={120}>
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
        <p className="text-[13px] mt-2" style={{ color: BB_V2.text.secondary }}>
          達標天數 {summary.calorieTrend.metDays} / {summary.calorieTrend.totalDays} 天
        </p>
      </BBCard>

      {/* 3. 蛋白質達標 */}
      <BBCard>
        <p className="text-[17px] mb-3" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          蛋白質達標
        </p>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[22px] tabular-nums" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            平均 {summary.proteinTrend.average ?? '—'} g
          </p>
          <p className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
            目標 {summary.proteinTrend.target} g
          </p>
        </div>
        <ResponsiveContainer width="100%" height={120}>
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
          達標天數 {summary.proteinTrend.metDays} / {summary.proteinTrend.totalDays} 天
        </p>
      </BBCard>

      {/* 4. BetterBit 分析 */}
      <BBCard>
          <div className="flex items-center gap-2 mb-4">
          <BBIcon name="ai" size={20} tone="accent" />
          <p className="text-[17px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            BetterBit 分析
          </p>
        </div>
        <div className="space-y-5">
          {summary.insights.map((ins, i) => (
            <InsightRow key={i} tone={ins.tone} title={ins.title} body={ins.body} />
          ))}
        </div>
      </BBCard>

      {/* 5. 下週建議 */}
      <BBCard>
        <p className="text-[17px] mb-4" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          下週建議
        </p>
        <ul className="space-y-4">
          {summary.nextWeekSuggestions.map((s, i) => (
            <li key={i} className="text-[14px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
              · {s}
            </li>
          ))}
        </ul>
        {mealRec && (
          <p className="text-[13px] mt-4 pt-4 leading-relaxed" style={{ borderTop: `1px solid ${BB_V2.divider}`, color: BB_V2.text.primary }}>
            配餐建議：{mealRec.name}（{mealRec.calories} kcal / {mealRec.protein}g 蛋白）— {mealRec.reason}
          </p>
        )}
        {workoutRec && (
          <p className="text-[13px] mt-2 leading-relaxed" style={{ color: BB_V2.text.primary }}>
            運動建議：{workoutRec.title} {workoutRec.duration} 分鐘 — {workoutRec.reason}
          </p>
        )}
      </BBCard>

      {/* 6. 三大營養素 */}
      <BBCard>
        <p className="text-[17px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          三大營養素比例
        </p>
        <p className="text-[13px] mt-1 mb-4" style={{ color: BB_V2.text.secondary }}>
          用來觀察飲食結構，不是唯一目標。
        </p>
        {summary.macroRatio.sufficient ? (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={macroData} dataKey="value" innerRadius={36} outerRadius={52} paddingAngle={2}>
                  {macroData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-[14px]" style={{ color: BB_V2.text.secondary }}>
              <p>蛋白質 {summary.macroRatio.proteinPct}%</p>
              <p>碳水 {summary.macroRatio.carbsPct}%</p>
              <p>脂肪 {summary.macroRatio.fatPct}%</p>
            </div>
          </div>
        ) : (
          <p className="text-[14px]" style={{ color: BB_V2.text.secondary }}>資料不足</p>
        )}
      </BBCard>

      {/* 7. 熱量分布 */}
      <BBCard>
        <p className="text-[17px] mb-4" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          熱量分布
        </p>
        {summary.calorieDistribution.sufficient ? (
          <>
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
            {summary.calorieDistribution.insight && (
              <p className="text-[13px] mt-4 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
                {summary.calorieDistribution.insight}
              </p>
            )}
          </>
        ) : (
          <p className="text-[14px]" style={{ color: BB_V2.text.secondary }}>資料不足</p>
        )}
      </BBCard>

      {/* 8. 飲食紀錄總結 */}
      <BBCard>
        <p className="text-[17px] mb-4" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          飲食紀錄總結
        </p>
        <ul className="space-y-2 text-[14px]" style={{ color: BB_V2.text.secondary }}>
          <li>總餐數 {summary.dietRecordSummary.totalMeals} 餐</li>
          {summary.dietRecordSummary.avgCaloriesPerMeal != null && (
            <li>平均每餐熱量 {summary.dietRecordSummary.avgCaloriesPerMeal} kcal</li>
          )}
          <li>吃超標天數 {summary.dietRecordSummary.overTargetDays} 天</li>
          {summary.dietRecordSummary.exerciseBurnKcal != null && (
            <li>運動消耗 {summary.dietRecordSummary.exerciseBurnKcal} kcal</li>
          )}
          <li>
            喝水達標天數 {summary.dietRecordSummary.waterMetDays} / {summary.dietRecordSummary.waterTotalDays} 天
          </li>
        </ul>
      </BBCard>

      {/* 9. 最佳紀錄日 */}
      {summary.bestDay && (
        <BBCard>
          <p className="text-[17px] mb-3" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            最佳紀錄日
          </p>
          <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
            {summary.bestDay.label}
          </p>
          <p className="text-[14px] mt-1" style={{ color: BB_V2.text.secondary }}>
            熱量 {summary.bestDay.calories} kcal · {summary.bestDay.tags.join(' · ')}
          </p>
          <div className="mt-3">
            <BBIcon name="best" size={32} tone="success" />
          </div>
        </BBCard>
      )}

      {/* 10. 需要加油的日子 */}
      {summary.needsAttentionDay && (
        <BBCard>
          <p className="text-[17px] mb-3" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
            需要加油的日子
          </p>
          <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
            {summary.needsAttentionDay.label}
          </p>
          <ul className="mt-2 space-y-1 text-[14px]" style={{ color: BB_V2.text.secondary }}>
            {(summary.needsAttentionDay.issues ?? []).map((issue, i) => (
              <li key={i}>· {issue}</li>
            ))}
          </ul>
          <div className="mt-3">
            <BBIcon name="needImprove" size={32} tone="warning" />
          </div>
        </BBCard>
      )}

      {/* 11. 下一步行動 */}
      <BBCard>
        <p className="text-[17px] mb-4" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          下一步行動
        </p>
        <ul className="space-y-3">
          {summary.nextActions.map(action => (
            <li key={action.id} className="flex items-start gap-3 text-[14px]">
              <BBIcon
                name={action.done ? 'success' : 'neutral'}
                size={18}
                tone={action.done ? 'success' : 'muted'}
                className="mt-0.5 shrink-0"
              />
              <span style={{ color: BB_V2.text.primary, fontWeight: action.done ? 600 : 400 }}>{action.label}</span>
            </li>
          ))}
        </ul>
      </BBCard>
    </div>
  )
}
