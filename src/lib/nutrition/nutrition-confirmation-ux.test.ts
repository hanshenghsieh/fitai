import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  countPendingNutritionLogs,
  filterPendingNutritionLogs,
  formatLogCaloriesLine,
  isNutritionPendingConfirmation,
  NUTRITION_PENDING_LABEL,
  nullSafeMacro,
  USER_ENTERED_LABEL,
  nutritionStatusBadge,
} from '@/lib/nutrition/food-log-display'
import { sumLoggedCalories, sumLoggedProtein } from '@/lib/engines/next-meal-engine'
import {
  applyManualNutritionToLog,
  findSimilarVerifiedItems,
  hitToFoodLogPatch,
} from '@/lib/nutrition/unknown-food-flow'
import { applyRematchProposal } from '@/lib/nutrition/search-v2/auto-rematch'
import type { MenuLookupHit } from '@/lib/food-menu-lookup'

function pendingLog(name: string, id = 'p1'): FoodLogEntry {
  return {
    id,
    name,
    calories: null,
    protein_g: null,
    logged_at: new Date().toISOString(),
    user_declared: true,
    source: 'free_text',
    nutrition_status: 'unknown',
  }
}

describe('Nutrition Confirmation UX', () => {
  it('1. pending item is detectable for click affordance', () => {
    assert.equal(isNutritionPendingConfirmation(pendingLog('菜包')), true)
  })

  it('2. pending_confirmation status is pending', () => {
    assert.equal(
      isNutritionPendingConfirmation({ ...pendingLog('x'), nutrition_status: 'pending_confirmation' }),
      true
    )
  })

  it('3. estimated_pending_confirmation is pending', () => {
    assert.equal(
      isNutritionPendingConfirmation({
        ...pendingLog('x'),
        nutrition_status: 'estimated_pending_confirmation',
      }),
      true
    )
  })

  it('4. manual input becomes user_entered', () => {
    const log = applyManualNutritionToLog(pendingLog('菜包'), {
      calories: 200,
      protein_g: 8,
      fat_g: 5,
      carbs_g: 30,
    })
    assert.equal(log.nutrition_status, 'user_entered')
    assert.equal(log.nutrition_confidence, 'user_confirmed')
  })

  it('5. user_entered counts toward daily totals', () => {
    const log = applyManualNutritionToLog(pendingLog('菜包'), {
      calories: 200,
      protein_g: 8,
      fat_g: 5,
      carbs_g: 30,
    })
    assert.equal(sumLoggedCalories([log]), 200)
    assert.equal(sumLoggedProtein([log]), 8)
  })

  it('6. unknown does not count toward daily totals', () => {
    const official: FoodLogEntry = {
      ...pendingLog('飯', 'o1'),
      calories: 500,
      protein_g: 20,
      nutrition_status: 'official',
      capture_status: 'resolved',
    }
    assert.equal(sumLoggedCalories([pendingLog('菜包'), official]), 500)
  })

  it('7. unknown does not display 0 kcal', () => {
    const line = formatLogCaloriesLine(pendingLog('菜包'))
    assert.equal(line, NUTRITION_PENDING_LABEL)
    assert.ok(!line.includes('0'))
  })

  it('8. count pending nutrition logs for header badge', () => {
    const logs = [pendingLog('菜包', '1'), pendingLog('殷子牛', '2'), pendingLog('菜包', '3')]
    assert.equal(countPendingNutritionLogs(logs), 3)
  })

  it('9. filter pending queue lists all pending items', () => {
    const logs = [
      pendingLog('菜包', '1'),
      { ...pendingLog('飯', '2'), calories: 400, protein_g: 10, nutrition_status: 'official' as const },
      pendingLog('殷子牛', '3'),
    ]
    assert.equal(filterPendingNutritionLogs(logs).length, 2)
  })

  it('10. keep text record stays unknown with null macros', () => {
    const log = pendingLog('菜包')
    assert.equal(log.nutrition_status, 'unknown')
    assert.equal(log.calories, null)
    assert.equal(log.protein_g, null)
  })

  it('11. verified pick requires explicit user confirm action', () => {
    const hit: MenuLookupHit = {
      id: 'h1',
      name: '高麗菜包',
      store: '通用',
      calories: 120,
      protein_g: 4,
      carbs_g: 20,
      fat_g: 2,
      source: 'food_kb',
      confidence: 0.9,
    }
    const patch = hitToFoodLogPatch(hit)
    assert.equal(patch.nutrition_status, 'official')
    const keep = applyRematchProposal(
      {
        queue_entry_id: 'q1',
        food_name: '菜包',
        candidate: {
          id: hit.id,
          name: hit.name,
          macros: { calories: 120, protein: 4, fat: 2, carbs: 20, fiber: null, sugar: null, sodium: null },
          nutrition_status: 'official',
          nutrition_confidence: 'A',
          nutrition_source: 'food_kb',
          source_tier: 'food_dna',
          match_score: 96,
          explanation: 'test',
        },
        match_score: 96,
        message: 'test',
        actions: ['update_record', 'keep_text', 'view_diff'],
      },
      'keep_text'
    )
    assert.equal(keep.applied, false)
  })

  it('12. no verified candidates means empty similar list for 菜包', () => {
    assert.equal(findSimilarVerifiedItems('菜包xyznotreal').length, 0)
  })

  it('13. null must not become 0', () => {
    assert.equal(nullSafeMacro(null), null)
  })

  it('14. user_entered shows badge label', () => {
    const log = applyManualNutritionToLog(pendingLog('菜包'), {
      calories: 1,
      protein_g: 1,
      fat_g: 0,
      carbs_g: 0,
    })
    assert.equal(nutritionStatusBadge(log), USER_ENTERED_LABEL)
  })

  it('15. pending logs have null macros not zero', () => {
    const log = pendingLog('菜包')
    assert.notEqual(log.calories, 0)
    assert.notEqual(log.protein_g, 0)
    assert.equal(log.calories, null)
  })
})
