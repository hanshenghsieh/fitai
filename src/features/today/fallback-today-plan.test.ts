import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateGoalPlan } from '@/lib/goal-calculator'
import { buildFallbackTodayPlan } from '@/features/today/fallback-today-plan'
import type { Goal, UserProfile } from '@/types'

const profile = {
  id: 'qa-user',
  display_name: 'QA',
  gender: 'male',
  age: 34,
  height_cm: 178,
  weight_kg: 82,
  body_fat_pct: 24,
  muscle_mass_kg: null,
  activity_level: 'moderate',
  onboarding_completed: true,
  water_ml_target: 2870,
} as UserProfile

const goal = {
  id: 'qa-goal',
  user_id: profile.id,
  goal_type: 'lose_fat',
  target_weight_kg: 74,
  target_body_fat_pct: 17,
  start_date: '2026-07-16',
  end_date: '2026-11-16',
  start_weight_kg: 82,
  start_body_fat_pct: 24,
  is_active: true,
  created_at: '2026-07-16T00:00:00Z',
} as Goal

describe('Today calculated fallback target', () => {
  it('uses the same BMR/TDEE goal calculation as onboarding and plan generation', () => {
    const expected = calculateGoalPlan(profile, goal)
    const fallback = buildFallbackTodayPlan('2026-07-16', profile, goal)

    assert.ok(fallback)
    assert.equal(fallback.daily_targets.calories, expected.dailyCalories)
    assert.equal(fallback.daily_targets.protein_g, expected.proteinGrams)
    assert.equal(fallback.daily_targets.carbs_g, expected.carbsGrams)
    assert.equal(fallback.daily_targets.fat_g, expected.fatGrams)
    assert.notEqual(fallback.daily_targets.calories, 2000)
  })

  it('does not fabricate a target for incomplete onboarding or missing goals', () => {
    assert.equal(
      buildFallbackTodayPlan(
        '2026-07-16',
        { ...profile, onboarding_completed: false },
        goal
      ),
      null
    )
    assert.equal(buildFallbackTodayPlan('2026-07-16', profile, null), null)
    assert.equal(
      buildFallbackTodayPlan('2026-07-16', { ...profile, weight_kg: null }, goal),
      null
    )
  })
})
