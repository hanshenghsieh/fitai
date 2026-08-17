/**
 * Phase 3 (Founder Dashboard correctness pass) — funnel calculation (pure, DB-agnostic).
 *
 * Account Created -> Onboarding Completed -> First Meal Logged -> Trial
 * Started -> Subscription Started.
 *
 * Every stage's conversionPct is "% of the accountCreated cohort" — a single,
 * fixed denominator for the whole funnel, never a chain of stage/prior-stage
 * ratios and never a mix of independent all-time event counts. This is a
 * deliberate replacement of the previous design (stage/prior-stage for
 * onboarding+firstMeal, stage/firstMealLogged for D1/D7/trial/subscription),
 * which produced >100% conversions in production (e.g. firstMealLogged 2 /
 * onboardingCompleted 1 = 200%, trialStarted 5 / firstMealLogged 2 = 250%)
 * because the underlying counts were never guaranteed to be subsets of each
 * other — a user can log a first meal without ever firing
 * onboarding_completed, and can start a trial without ever logging a meal.
 *
 * The caller (queries.ts) is responsible for passing true cohort-intersected
 * counts here — i.e. counts.onboardingCompleted must be "how many of the
 * accountCreated cohort also fired onboarding_completed", not "how many
 * users total ever fired onboarding_completed". Given that contract, every
 * stage here is a literal subset of accountCreated, so conversionPct can
 * never exceed 100% by construction — no clamping needed or wanted.
 *
 * D1/D7 retention and Trial->Paid conversion are deliberately NOT part of
 * this funnel — they are separate questions ("of the people who activated,
 * how many came back" / "of the people who trialed, how many paid") with
 * their own cohorts and eligibility rules, computed in retention.ts and
 * queries.ts respectively. Folding them into this chain is exactly what
 * caused the previous bug.
 */

export interface FunnelStageCounts {
  accountCreated: number
  /** Count of accountCreated-cohort users who also fired onboarding_completed. */
  onboardingCompleted: number
  /** Count of accountCreated-cohort users who also fired first_meal_logged. */
  firstMealLogged: number
  /** Count of accountCreated-cohort users who also fired trial_started. */
  trialStarted: number
  /** Count of accountCreated-cohort users who also fired subscription_started. */
  subscriptionStarted: number
}

export interface FunnelStageResult {
  stage: keyof FunnelStageCounts
  count: number
  /** 0-100, one decimal place, always relative to accountCreated. Null for the first stage or when accountCreated is 0. */
  conversionPct: number | null
}

const FUNNEL_STAGES: (keyof FunnelStageCounts)[] = [
  'onboardingCompleted',
  'firstMealLogged',
  'trialStarted',
  'subscriptionStarted',
]

function roundPct(value: number): number {
  return Math.round(value * 1000) / 10
}

export function calculateFunnel(counts: FunnelStageCounts): FunnelStageResult[] {
  const cohortSize = counts.accountCreated

  const results: FunnelStageResult[] = [
    { stage: 'accountCreated', count: counts.accountCreated, conversionPct: null },
  ]

  for (const stage of FUNNEL_STAGES) {
    const count = counts[stage]
    const conversionPct = cohortSize > 0 ? roundPct(count / cohortSize) : null
    results.push({ stage, count, conversionPct })
  }

  return results
}
