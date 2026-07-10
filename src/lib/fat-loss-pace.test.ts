import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzePaceGoal,
  buildPacePreviews,
  classifyCaloriesByPace,
  dailyCalorieRangeForPace,
  manualPaceDescription,
  resolveFatLossPace,
} from '@/lib/fat-loss-pace'
import type { Goal, UserProfile } from '@/types'

const profile: UserProfile = {
  id: 'u1',
  display_name: 'Test',
  gender: 'female',
  age: 30,
  height_cm: 165,
  weight_kg: 70,
  body_fat_pct: 28,
  muscle_mass_kg: null,
  activity_level: 'moderate',
  is_vegetarian: false,
  is_vegan: false,
  is_halal: false,
  is_gluten_free: false,
  allergens: [],
  disliked_foods: [],
  cuisine_preference: 'asian',
  cooking_time_mins: 30,
  food_budget: 'medium',
  equipment: [],
  injuries: [],
  health_conditions: [],
  fitness_level: 'beginner',
  sleep_hours_target: 7.5,
  water_ml_target: 2000,
  onboarding_completed: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

const goal: Goal = {
  id: 'g1',
  user_id: 'u1',
  goal_type: 'lose_fat',
  target_weight_kg: 62,
  target_body_fat_pct: 22,
  start_date: '2026-01-01',
  end_date: '2026-04-01',
  start_weight_kg: 70,
  start_body_fat_pct: 28,
  is_active: true,
  created_at: '2026-01-01',
}

describe('fat-loss-pace', () => {
  it('resolveFatLossPace defaults to standard', () => {
    assert.equal(resolveFatLossPace(null), 'standard')
    assert.equal(resolveFatLossPace('conservative'), 'conservative')
  })

  it('pace cards produce different calorie ranges', () => {
    const conservative = dailyCalorieRangeForPace(profile, 'conservative')
    const aggressive = dailyCalorieRangeForPace(profile, 'aggressive')
    assert.ok(conservative.mid > aggressive.mid)
  })

  it('auto mode uses pace midpoint when no deadline', () => {
    const analysis = analyzePaceGoal(profile, goal, {
      fat_loss_pace: 'standard',
      target_days: null,
    })
    assert.ok(analysis)
    assert.equal(analysis!.pace, 'standard')
    assert.ok(analysis!.dailyCalories >= 1200)
    assert.ok(analysis!.dailyDeficit > 0)
    assert.ok(analysis!.daysInGoal >= 7)
  })

  it('aggressive pace respects female calorie floor', () => {
    const analysis = analyzePaceGoal(profile, goal, {
      fat_loss_pace: 'aggressive',
      target_days: 30,
    })
    assert.ok(analysis)
    assert.ok(analysis!.dailyCalories >= 1200)
  })

  it('manual calories are not overridden and get classified', () => {
    const analysis = analyzePaceGoal(profile, goal, {
      calorie_mode: 'manual',
      manual_calorie_target: 1600,
      fat_loss_pace: 'standard',
    })
    assert.ok(analysis)
    assert.equal(analysis!.dailyCalories, 1600)
    const hint = manualPaceDescription(profile, 1600)
    assert.ok(hint?.includes('保守') || hint?.includes('標準') || hint?.includes('積極'))
  })

  it('buildPacePreviews returns three cards with weekly ranges', () => {
    const cards = buildPacePreviews(profile, 'standard')
    assert.equal(cards.length, 3)
    assert.ok(cards[1]!.weeklyLossMaxKg > cards[1]!.weeklyLossMinKg)
  })

  it('classifyCaloriesByPace buckets deficit correctly', () => {
    const tdee = 2000
    assert.equal(classifyCaloriesByPace({ ...profile, gender: 'male', weight_kg: 80 }, 1200, tdee), 'aggressive')
    assert.equal(classifyCaloriesByPace(profile, 1900, tdee), 'conservative')
  })
})
