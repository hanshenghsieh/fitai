'use client'

import { useMemo } from 'react'
import type { AccessStatus } from '@/lib/subscription-access'
import {
  adaptationNote,
  buildProgressPosture,
  fatBankSummary,
  trendTone,
  weightChartPoints,
} from '@/lib/progress-narrative'
import ProgressHeader from '@/components/progress/ProgressHeader'
import ProgressTrendChart from '@/components/progress/ProgressTrendChart'
import ProgressWeightLog from '@/components/progress/ProgressWeightLog'
import ProgressFatBank from '@/components/progress/ProgressFatBank'
import ProgressExplainer from '@/components/progress/ProgressExplainer'
import ProgressAdaptation from '@/components/progress/ProgressAdaptation'
import ProgressHistory from '@/components/progress/ProgressHistory'
import ProgressPlateauNote from '@/components/progress/ProgressPlateauNote'
import ProgressUpgradeHint from '@/components/progress/ProgressUpgradeHint'
import { withSafeModeAccess } from '@/lib/app-store-safe-mode'
import type { BodyMeasurement, Goal } from '@/types'

interface GoalSnapshot {
  fat_to_lose_kg?: number
  weekly_fat_loss_g?: number
  weeks_remaining?: number
  target_weight?: number | null
}

interface Props {
  measurements: BodyMeasurement[]
  goal: Goal | null
  goalSnapshot: GoalSnapshot | null
  access: AccessStatus
  latestWeight: number | null
  plateau: { text: string; subtext: string } | null
}

export default function ProgressScreen({
  measurements,
  goal,
  goalSnapshot,
  access,
  latestWeight,
  plateau,
}: Props) {
  const effectiveAccess = withSafeModeAccess(access)

  const visibleMeasurements = effectiveAccess.hasFullAccess
    ? measurements
    : effectiveAccess.trialExpired
      ? measurements.slice(-14)
      : measurements

  const posture = useMemo(() => buildProgressPosture(visibleMeasurements), [visibleMeasurements])
  const tone = useMemo(() => trendTone(visibleMeasurements), [visibleMeasurements])
  const chartPoints = useMemo(
    () =>
      weightChartPoints(visibleMeasurements, effectiveAccess.hasFullAccess ? 21 : 14).map(p => ({
        label: p.label,
        weight: p.weight,
      })),
    [visibleMeasurements, effectiveAccess.hasFullAccess]
  )

  const fatBank = useMemo(() => {
    if (!effectiveAccess.hasFullAccess) return null
    return fatBankSummary({
      startWeight: goal?.start_weight_kg,
      targetWeight: goal?.target_weight_kg ?? goalSnapshot?.target_weight,
      latestWeight,
    })
  }, [effectiveAccess.hasFullAccess, goal, goalSnapshot, latestWeight])

  const showFullHistory = effectiveAccess.hasFullAccess || (effectiveAccess.trialExpired && measurements.length > 0)
  const hasEarnedPreview = effectiveAccess.trialExpired && measurements.length > 0

  const content = (
    <div className="space-y-5 pb-8">
      <ProgressHeader posture={posture} />
      <ProgressTrendChart points={chartPoints} tone={tone} />
      <ProgressWeightLog lastWeightKg={latestWeight} />
      {plateau && <ProgressPlateauNote text={plateau.text} subtext={plateau.subtext} />}
      {fatBank && <ProgressFatBank progressPct={fatBank.progressPct} line={fatBank.line} />}
      <ProgressAdaptation text={adaptationNote(goal)} />
      <ProgressExplainer />
      {showFullHistory && <ProgressHistory measurements={visibleMeasurements} />}
    </div>
  )

  if (effectiveAccess.hasFullAccess) return content

  return (
    <ProgressUpgradeHint access={effectiveAccess} hasEarnedPreview={hasEarnedPreview}>
      {hasEarnedPreview ? content : (
        <>
          <ProgressHeader posture={posture} />
          <ProgressWeightLog lastWeightKg={latestWeight} />
          <ProgressExplainer />
        </>
      )}
    </ProgressUpgradeHint>
  )
}
