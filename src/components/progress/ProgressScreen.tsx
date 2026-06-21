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
  const visibleMeasurements = access.hasFullAccess
    ? measurements
    : access.trialExpired
      ? measurements.slice(-14)
      : measurements

  const posture = useMemo(() => buildProgressPosture(visibleMeasurements), [visibleMeasurements])
  const tone = useMemo(() => trendTone(visibleMeasurements), [visibleMeasurements])
  const chartPoints = useMemo(
    () =>
      weightChartPoints(visibleMeasurements, access.hasFullAccess ? 21 : 14).map(p => ({
        label: p.label,
        weight: p.weight,
      })),
    [visibleMeasurements, access.hasFullAccess]
  )

  const fatBank = useMemo(() => {
    if (!access.hasFullAccess) return null
    return fatBankSummary({
      startWeight: goal?.start_weight_kg,
      targetWeight: goal?.target_weight_kg ?? goalSnapshot?.target_weight,
      latestWeight,
    })
  }, [access.hasFullAccess, goal, goalSnapshot, latestWeight])

  const showFullHistory = access.hasFullAccess || (access.trialExpired && measurements.length > 0)
  const hasEarnedPreview = access.trialExpired && measurements.length > 0

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

  if (access.hasFullAccess) return content

  return (
    <ProgressUpgradeHint access={access} hasEarnedPreview={hasEarnedPreview}>
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
