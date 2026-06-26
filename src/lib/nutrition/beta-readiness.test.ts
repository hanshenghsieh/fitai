import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import {
  enqueueUnknownFood,
  getUnknownAnalytics,
  getFounderUnknownDashboard,
  clearUnknownQueueForTests,
} from '@/lib/nutrition/search-v2/unknown-queue'
import { computeUnknownPriorityScore } from '@/lib/nutrition/search-v2/unknown-priority'
import { buildRecommendationReasons } from '@/lib/nutrition/recommendation-explain'
import type { MealSuggestion, SuggestContext } from '@/lib/meal-engine-types'

beforeEach(() => clearUnknownQueueForTests())

describe('Unknown Learning Pipeline', () => {
  it('UL1: priority score increases with frequency', () => {
    const low = computeUnknownPriorityScore({ times_requested: 1, waiting_days: 0, possible_matches: [], restaurant: null })
    const high = computeUnknownPriorityScore({ times_requested: 10, waiting_days: 5, possible_matches: ['a'], restaurant: '7-11' })
    assert.ok(high > low)
  })

  it('UL2: analytics includes priority queue', () => {
    enqueueUnknownFood({ food_name: '竹筍湯', restaurant: '便當店', possible_matches: ['竹筍排骨湯'] })
    enqueueUnknownFood({ food_name: '竹筍湯', restaurant: '便當店' })
    const a = getUnknownAnalytics()
    assert.ok(a.priority_queue.length >= 1)
    assert.ok(a.longest_waiting.length >= 0)
  })

  it('UL3: founder dashboard merges text unknown', () => {
    enqueueUnknownFood({ food_name: '阿嬤家的湯' })
    const dash = getFounderUnknownDashboard()
    assert.ok(dash.text_unknown.unknown_foods >= 1)
    assert.ok(Array.isArray(dash.combined_priority))
  })
})

describe('Recommendation Explainability', () => {
  it('RE1: builds rule-based reasons max 5', () => {
    const suggestion = {
      id: 's1',
      meal_type: 'lunch',
      lines: [],
      totals: { calories: 450, protein_g: 35, carbs_g: 40, fat_g: 12, price: 120 },
      highlight: '',
      highlight_key: 'high_protein',
      stores: ['7-11'],
      nutrition_score: 80,
    } as MealSuggestion
    const ctx = {
      meal_type: 'lunch',
      daily_targets: { calories: 2000, protein_g: 120, carbs_g: 200, fat_g: 65 },
      day_state: { alreadyCalories: 800, alreadyProtein: 30, remainingCalories: 1200, proteinGap: 90, highProteinPriority: true },
    } as SuggestContext
    const reasons = buildRecommendationReasons(suggestion, ctx)
    assert.ok(reasons.length >= 1)
    assert.ok(reasons.length <= 5)
    assert.ok(reasons.every(r => r.label.length > 0))
  })
})
