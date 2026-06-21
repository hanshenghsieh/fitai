/** Phase 10.3 — Progress reassurance copy (not KPI dashboard) */

import type { BodyMeasurement, Goal } from '@/types'

export type TrendTone = 'forward' | 'steady' | 'up' | 'empty'

export function buildProgressPosture(measurements: BodyMeasurement[]): string {
  const weights = measurements
    .filter(m => m.weight_kg != null)
    .map(m => m.weight_kg as number)

  if (weights.length === 0) return '從第一次記錄開始。不用完美。'
  if (weights.length === 1) return '有了起點。接下來看趨勢就好。'

  const recent = weights.slice(-5)
  const first = recent[0]!
  const last = recent[recent.length - 1]!
  const delta = last - first

  if (delta <= -0.25) return '最近還在往前。'
  if (delta >= 0.35) return '最近重一點也正常。長線還在走。'
  return '體重有起伏。你還在這裡，這樣就好。'
}

export function trendTone(measurements: BodyMeasurement[]): TrendTone {
  const weights = measurements.filter(m => m.weight_kg != null).map(m => m.weight_kg as number)
  if (weights.length < 2) return 'empty'
  const recent = weights.slice(-5)
  const delta = recent[recent.length - 1]! - recent[0]!
  if (delta <= -0.25) return 'forward'
  if (delta >= 0.35) return 'up'
  return 'steady'
}

export function weightChartPoints(measurements: BodyMeasurement[], limit = 14) {
  return measurements
    .filter(m => m.weight_kg != null)
    .slice(-limit)
    .map(m => ({
      date: m.measured_at,
      label: new Date(m.measured_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
      weight: m.weight_kg as number,
    }))
}

export function latestBodyFat(measurements: BodyMeasurement[]): number | null {
  for (let i = measurements.length - 1; i >= 0; i--) {
    const v = measurements[i]?.body_fat_pct
    if (v != null) return v
  }
  return null
}

export function fatBankSummary(params: {
  startWeight: number | null | undefined
  targetWeight: number | null | undefined
  latestWeight: number | null
}): { progressPct: number; line: string } | null {
  const { startWeight, targetWeight, latestWeight } = params
  if (!startWeight || !targetWeight || !latestWeight) return null
  const total = Math.max(0.1, startWeight - targetWeight)
  const done = Math.max(0, startWeight - latestWeight)
  const progressPct = Math.min(100, Math.round((done / total) * 100))
  return {
    progressPct,
    line: '脂肪銀行在背後慢慢累積。你不用每天盯秤。',
  }
}

export function adaptationNote(goal: Goal | null): string {
  if (!goal?.target_weight_kg) return '你的計畫會安靜地跟上變化。'
  return '體重變化夠大時，熱量與課表會悄悄調整。不用自己算。'
}
