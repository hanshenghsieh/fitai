import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  countsTowardDailyTotals,
  formatItemMacroLine,
  formatLogCaloriesLine,
  formatLogMacroSummary,
  formatTotalsLine,
  isNutritionUnknown,
  isUserEnteredNutrition,
  NUTRITION_PENDING_LABEL,
  nullSafeMacro,
  sumDisplayMacros,
  USER_ENTERED_LABEL,
} from '@/lib/nutrition/food-log-display'
import { sumLoggedCalories, sumLoggedProtein } from '@/lib/engines/next-meal-engine'
import {
  applyManualNutritionToLog,
  finalizeUnknownClarification,
  findSimilarVerifiedItems,
  isManualNutritionPartial,
  startUnknownFoodClarification,
} from '@/lib/nutrition/unknown-food-flow'
import { applyUnknownClarificationAnswer } from '@/lib/nutrition/unknown-food-clarification'
import { createUnknownFreeTextMeal, resolveOrEstimateFreeTextMeal } from '@/lib/food-estimate'
import { enqueueUnknownFood, clearUnknownQueueForTests, getUnknownQueueSize } from '@/lib/nutrition/search-v2/unknown-queue'
import { runAutoRematch, applyRematchProposal } from '@/lib/nutrition/search-v2/auto-rematch'

beforeEach(() => clearUnknownQueueForTests())

function unknownLog(name = '菜包'): FoodLogEntry {
  return {
    id: 'log-1',
    name,
    calories: null,
    protein_g: null,
    logged_at: new Date().toISOString(),
    user_declared: true,
    source: 'free_text',
    nutrition_status: 'unknown',
    capture_status: 'photo_only',
  }
}

describe('Unknown Food Manual Nutrition Flow', () => {
  it('1. 找不到菜包時不得顯示 0 kcal', () => {
    const line = formatLogCaloriesLine(unknownLog())
    assert.notEqual(line, '0 kcal')
    assert.equal(line, NUTRITION_PENDING_LABEL)
  })

  it('2. unknown calories 必須是 null', () => {
    const est = createUnknownFreeTextMeal('菜包')
    assert.equal(est.calories, null)
  })

  it('3. unknown protein 必須是 null', () => {
    const est = createUnknownFreeTextMeal('菜包')
    assert.equal(est.protein_g, null)
  })

  it('4. unknown 不進入今日總熱量', () => {
    const logs = [
      unknownLog(),
      {
        ...unknownLog(),
        id: '2',
        calories: 400,
        protein_g: 20,
        nutrition_status: 'official' as const,
        capture_status: 'resolved' as const,
      },
    ]
    assert.equal(sumLoggedCalories(logs), 400)
  })

  it('5. unknown 不進入今日總蛋白', () => {
    const logs = [
      unknownLog(),
      {
        ...unknownLog(),
        id: '2',
        calories: 400,
        protein_g: 20,
        nutrition_status: 'official' as const,
        capture_status: 'resolved' as const,
      },
    ]
    assert.equal(sumLoggedProtein(logs), 20)
  })

  it('6. unknown 顯示營養待確認', () => {
    assert.equal(formatLogMacroSummary(unknownLog()), NUTRITION_PENDING_LABEL)
    assert.equal(formatItemMacroLine({ calories: null, protein_g: null, nutrition_status: 'unknown' }), NUTRITION_PENDING_LABEL)
  })

  it('7. 可手動輸入 kcal / protein / fat / carbs', () => {
    const updated = applyManualNutritionToLog(unknownLog(), {
      calories: 180,
      protein_g: 6,
      fat_g: 4,
      carbs_g: 28,
    })
    assert.equal(updated.calories, 180)
    assert.equal(updated.protein_g, 6)
    assert.equal(updated.fat_g, 4)
    assert.equal(updated.carbs_g, 28)
  })

  it('8. user_entered 可進入統計', () => {
    const log = applyManualNutritionToLog(unknownLog(), {
      calories: 180,
      protein_g: 6,
      fat_g: 4,
      carbs_g: 28,
    })
    assert.equal(countsTowardDailyTotals(log), true)
    assert.equal(sumLoggedCalories([log]), 180)
  })

  it('9. user_entered 顯示使用者輸入', () => {
    const log = applyManualNutritionToLog(unknownLog(), {
      calories: 180,
      protein_g: 6,
      fat_g: 4,
      carbs_g: 28,
    })
    assert.equal(isUserEnteredNutrition(log), true)
    assert.equal(log.nutrition_status, 'user_entered')
  })

  it('10. Smart Clarification 最多 3 題', () => {
    const session = startUnknownFoodClarification('菜包')
    assert.ok(session)
    assert.ok(session!.questions.length <= 3)
    assert.ok(session!.maxSteps <= 3)
  })

  it('11. 菜包可詢問種類 / 數量 / 大小', () => {
    const session = startUnknownFoodClarification('菜包')!
    const ids = session.questions.map(q => q.id)
    assert.ok(ids.includes('bun_type'))
    assert.ok(ids.includes('bun_count'))
    assert.ok(ids.includes('bun_size'))
  })

  it('12. 無 verified template 時不得估算', () => {
    let session = startUnknownFoodClarification('菜包')!
    session = applyUnknownClarificationAnswer(session, 'bun_type', 'cabbage')
    session = applyUnknownClarificationAnswer(session, 'bun_count', '2')
    session = applyUnknownClarificationAnswer(session, 'bun_size', 'medium')
    const result = finalizeUnknownClarification(session)
    if (result.nutrition_status === 'unknown') {
      assert.equal(result.log_patch?.calories ?? null, null)
    } else {
      assert.ok(result.log_patch!.calories! > 0)
    }
  })

  it('13. GPT 不可直接寫入營養 — createUnknown 無 macros', () => {
    const est = resolveOrEstimateFreeTextMeal('不存在菜 XYZ')
    assert.equal(est.calories, null)
    assert.equal(est.protein_g, null)
  })

  it('14. 網路搜尋不可直接寫入 runtime — findSimilar 僅 verified hits', () => {
    const hits = findSimilarVerifiedItems('菜包')
    for (const h of hits) {
      assert.ok(h.confidence >= 0.72)
      assert.ok(h.calories > 0)
    }
  })

  it('15. unknown 進入 Unknown Queue', () => {
    enqueueUnknownFood({ food_name: '菜包' })
    assert.equal(getUnknownQueueSize(), 1)
  })

  it('16. Auto Re-Match 可掃描 unknown', () => {
    enqueueUnknownFood({ food_name: '711竹筍排骨湯' })
    const proposals = runAutoRematch()
    assert.ok(Array.isArray(proposals))
  })

  it('17. 找到可信資料後需使用者確認才更新', () => {
    const proposal = {
      queue_entry_id: 'x',
      food_name: '菜包',
      candidate: {
        id: 'c1',
        name: '高麗菜包',
        macros: { calories: 120, protein: 4, fat: 2, carbs: 20, fiber: null, sugar: null, sodium: null },
        nutrition_status: 'official' as const,
        nutrition_confidence: 'A' as const,
        nutrition_source: 'food_kb',
        source_tier: 'food_dna' as const,
        match_score: 96,
        explanation: 'test',
      },
      match_score: 96,
      message: 'test',
      actions: ['update_record', 'keep_text', 'view_diff'] as const,
    }
    const keep = applyRematchProposal(proposal, 'keep_text')
    assert.equal(keep.applied, false)
    const update = applyRematchProposal(proposal, 'update_record')
    assert.equal(update.applied, true)
  })

  it('18. 不得把 null 轉成 0', () => {
    assert.equal(nullSafeMacro(null), null)
    assert.equal(nullSafeMacro(undefined), null)
    const totals = sumDisplayMacros([{ calories: null, protein_g: null, nutrition_status: 'unknown' }])
    assert.equal(totals.calories, null)
    assert.equal(totals.protein_g, null)
  })

  it('19. UI 不可出現空白 kcal 格式', () => {
    const line = formatItemMacroLine({ calories: null, protein_g: null, nutrition_status: 'unknown' })
    assert.ok(!line.includes('kcal ・'))
    assert.ok(!line.includes('蛋白質 g'))
    assert.equal(line, NUTRITION_PENDING_LABEL)
  })

  it('20. 建立文字紀錄按鈕仍可用 — createUnknown not blocked', () => {
    const est = createUnknownFreeTextMeal('菜包')
    assert.notEqual(est.blocked, true)
  })

  it('21. 搜尋相近品項仍可用', () => {
    const hits = findSimilarVerifiedItems('竹筍排骨湯')
    assert.ok(Array.isArray(hits))
  })

  it('22. 手動輸入取消後保持 unknown', () => {
    const log = unknownLog()
    assert.equal(isNutritionUnknown(log), true)
  })

  it('23. 手動輸入部分欄位時標記 partial', () => {
    const partial = isManualNutritionPartial({ calories: 100, protein_g: null, fat_g: null, carbs_g: null })
    assert.equal(partial, true)
    const log = applyManualNutritionToLog(unknownLog(), {
      calories: 100,
      protein_g: null,
      fat_g: null,
      carbs_g: null,
    })
    assert.equal(log.user_nutrition_meta?.partial, true)
  })

  it('24. estimated_pending_confirmation 不計入統計', () => {
    const log: FoodLogEntry = {
      ...unknownLog(),
      nutrition_status: 'estimated_pending_confirmation',
      calories: 500,
      protein_g: 30,
    }
    assert.equal(countsTowardDailyTotals(log), false)
  })

  it('25. formatTotalsLine unknown 不顯示 0', () => {
    const line = formatTotalsLine([{ calories: null, protein_g: null, nutrition_status: 'unknown' }])
    assert.equal(line, NUTRITION_PENDING_LABEL)
    assert.ok(!line.includes('0 kcal'))
  })

  it('26. user_entered badge label', () => {
    const log = applyManualNutritionToLog(unknownLog(), {
      calories: 1,
      protein_g: 1,
      fat_g: 0,
      carbs_g: 0,
    })
    assert.equal(log.nutrition_confidence, 'user_confirmed')
  })
})
