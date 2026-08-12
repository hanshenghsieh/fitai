/**
 * Phase 2 TASK 4 — funnel calculation (pure, DB-agnostic).
 *
 * Account Created -> Onboarding Completed -> First Meal Logged -> D1 Active
 * -> D7 Active -> Trial Started -> Subscription Started.
 *
 * Conversion % has two different denominators depending on the stage,
 * matching the worked example in the task spec exactly:
 *   - Onboarding Completed and First Meal Logged: % of the IMMEDIATELY
 *     PRIOR stage (72/100 = 72%, 55/72 = 76.4%).
 *   - D1 Active, D7 Active, Trial Started, Subscription Started: % of the
 *     ACTIVATED cohort (First Meal Logged), not of each other sequentially
 *     (22/55 = 40% for D1, but D7 is 8/55 = 14.5% — NOT 8/22 = 36.4%).
 *     This matches the retention/conversion definitions in
 *     docs/founder-kpi-definitions.md, where D1/D7 retention and trial/paid
 *     conversion are both defined as "% of the activated cohort who did X",
 *     not a strictly nested funnel where each step is a subset % of the
 *     step before it.
 */

export interface FunnelStageCounts {
  accountCreated: number
  onboardingCompleted: number
  firstMealLogged: number
  d1Active: number
  d7Active: number
  trialStarted: number
  subscriptionStarted: number
}

export interface FunnelStageResult {
  stage: keyof FunnelStageCounts
  count: number
  /** 0-100, one decimal place. Null for the first stage or when its denominator is 0. */
  conversionPct: number | null
}

const SEQUENTIAL_STAGES: (keyof FunnelStageCounts)[] = ['onboardingCompleted', 'firstMealLogged']
const ACTIVATED_RELATIVE_STAGES: (keyof FunnelStageCounts)[] = [
  'd1Active',
  'd7Active',
  'trialStarted',
  'subscriptionStarted',
]

function roundPct(value: number): number {
  return Math.round(value * 1000) / 10
}

export function calculateFunnel(counts: FunnelStageCounts): FunnelStageResult[] {
  const activated = counts.firstMealLogged
  let prevCount = counts.accountCreated

  const results: FunnelStageResult[] = [
    { stage: 'accountCreated', count: counts.accountCreated, conversionPct: null },
  ]

  for (const stage of [...SEQUENTIAL_STAGES, ...ACTIVATED_RELATIVE_STAGES]) {
    const count = counts[stage]
    let conversionPct: number | null
    if (SEQUENTIAL_STAGES.includes(stage)) {
      conversionPct = prevCount > 0 ? roundPct(count / prevCount) : null
      prevCount = count
    } else {
      conversionPct = activated > 0 ? roundPct(count / activated) : null
    }
    results.push({ stage, count, conversionPct })
  }

  return results
}
