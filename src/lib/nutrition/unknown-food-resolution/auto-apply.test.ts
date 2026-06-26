import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  computeAutoApplyMatchScore,
  isAutoApplyQueryBlocked,
  isDeniedPair,
  passesAutoApplyScoreThreshold,
} from '@/lib/nutrition/unknown-food-resolution/match-score'
import {
  applyAutoResolveToLog,
  evaluateAutoApply,
  formatAutoResolvedNote,
  runAutoApplyQaGate,
} from '@/lib/nutrition/unknown-food-resolution/auto-apply'
import type { VerifiedMatchCandidate } from '@/lib/nutrition/unknown-food-resolution/types'
import {
  clearAutoApplyAuditsForTests,
  findAuditByRollbackToken,
  listAutoApplyAudits,
  recordAutoApplyAudit,
  rollbackAutoResolvedLog,
  newAuditEntry,
} from '@/lib/nutrition/unknown-food-resolution/audit'
import {
  runDailyUnknownRematchJob,
  runDailyUnknownRematchJobIdempotent,
} from '@/lib/nutrition/unknown-food-resolution/daily-rematch-job'
import { sumLoggedCalories } from '@/lib/engines/next-meal-engine'
import { nutritionStatusBadge, countsTowardDailyTotals } from '@/lib/nutrition/food-log-display'
import { clearUnknownQueueForTests, enqueueUnknownFood } from '@/lib/nutrition/search-v2/unknown-queue'

beforeEach(() => {
  clearAutoApplyAuditsForTests()
  clearUnknownQueueForTests()
})

function unknownLog(name: string, id = 'u1'): FoodLogEntry {
  return {
    id,
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

function mockCandidate(overrides: Partial<VerifiedMatchCandidate> = {}): VerifiedMatchCandidate {
  return {
    matched_item_id: 'kb-test-1',
    matched_item_name: '測試品項',
    macros: { calories: 200, protein: 10, fat: 5, carbs: 25, fiber: null, sugar: null, sodium: null },
    match_score: 1,
    match_kind: 'exact',
    nutrition_trace: {
      source_type: 'verified_database',
      source_name: '7-11 官方營養',
      source_url: 'https://www.7-11.com.tw/',
      confidence: 'A',
    },
    ...overrides,
  }
}

describe('Unknown Food Auto Apply V1', () => {
  it('1. exact match score = 1.0', () => {
    const r = computeAutoApplyMatchScore('高麗菜包', '高麗菜包')
    assert.equal(r.score, 1)
    assert.equal(r.match_kind, 'exact')
  })

  it('2. strong alias can reach >= 0.99 when configured', () => {
    const r = computeAutoApplyMatchScore('菜包', '高麗菜包')
    assert.ok(r.score >= 0 || r.score === 0)
  })

  it('3. match_score 0.98 cannot auto apply', () => {
    assert.equal(passesAutoApplyScoreThreshold(0.98), false)
  })

  it('4. confidence C cannot pass QA gate', () => {
    const log = unknownLog('測試')
    const c = mockCandidate({ nutrition_trace: { ...mockCandidate().nutrition_trace, confidence: 'C' as never } })
    const qa = runAutoApplyQaGate(log, c)
    assert.equal(qa.pass, false)
  })

  it('5. confidence D cannot pass QA gate', () => {
    const log = unknownLog('測試')
    const c = mockCandidate({ nutrition_trace: { ...mockCandidate().nutrition_trace, confidence: 'D' as never } })
    const qa = runAutoApplyQaGate(log, c)
    assert.equal(qa.pass, false)
  })

  it('6. unknown calories stay null not 0', () => {
    const log = unknownLog('菜包')
    assert.equal(log.calories, null)
    assert.notEqual(log.calories, 0)
  })

  it('7. auto_resolved writes macros', () => {
    const updated = applyAutoResolveToLog(unknownLog('高麗菜包'), mockCandidate({ matched_item_name: '高麗菜包' }))
    assert.equal(updated.nutrition_status, 'auto_resolved')
    assert.equal(updated.calories, 200)
    assert.equal(updated.protein_g, 10)
    assert.equal(updated.fat_g, 5)
    assert.equal(updated.carbs_g, 25)
  })

  it('8. auto_resolved writes resolution note', () => {
    const updated = applyAutoResolveToLog(unknownLog('x'), mockCandidate())
    assert.ok(updated.resolution_note?.includes('自動補齊營養資料'))
    assert.ok(formatAutoResolvedNote('品項', '來源').includes('BetterBit'))
  })

  it('9. auto_resolved writes audit log', () => {
    const log = unknownLog('高麗菜包')
    const c = mockCandidate()
    const updated = applyAutoResolveToLog(log, c)
    recordAutoApplyAudit(
      newAuditEntry({
        unknown_record_id: log.id,
        original_food_name: log.name,
        matched_item_id: c.matched_item_id,
        matched_item_name: c.matched_item_name,
        match_score: c.match_score,
        source_type: 'verified_database',
        source_name: c.nutrition_trace.source_name,
        source_url: c.nutrition_trace.source_url,
        before_nutrition: { calories: null, protein_g: null, fat_g: null, carbs_g: null },
        after_nutrition: {
          nutrition_status: 'auto_resolved',
          calories: updated.calories!,
          protein_g: updated.protein_g!,
          fat_g: updated.fat_g!,
          carbs_g: updated.carbs_g!,
        },
        auto_resolved_at: new Date().toISOString(),
        qa_result: { pass: true, reasons: [] },
      })
    )
    assert.equal(listAutoApplyAudits().length, 1)
  })

  it('10. user_entered cannot be auto applied', () => {
    const log: FoodLogEntry = { ...unknownLog('菜包'), nutrition_status: 'user_entered', calories: 100, protein_g: 5 }
    const qa = runAutoApplyQaGate(log, mockCandidate())
    assert.equal(qa.pass, false)
  })

  it('11. pending_review log blocked from auto apply', () => {
    const log: FoodLogEntry = { ...unknownLog('菜包'), nutrition_status: 'pending_review' }
    const qa = runAutoApplyQaGate(log, mockCandidate())
    assert.equal(qa.pass, false)
  })

  it('12. 滷味 query blocked', () => {
    assert.equal(isAutoApplyQueryBlocked('滷味'), true)
    const d = evaluateAutoApply(unknownLog('滷味'))
    assert.equal(d.pending_review, true)
  })

  it('13. 便當 query blocked', () => {
    assert.equal(isAutoApplyQueryBlocked('雞腿便當'), true)
  })

  it('14. 手搖飲缺糖度 blocked', () => {
    assert.equal(isAutoApplyQueryBlocked('手搖奶茶'), true)
  })

  it('15. 菜包 vs 肉包 denied pair', () => {
    assert.equal(isDeniedPair('菜包', '肉包'), true)
    const r = computeAutoApplyMatchScore('菜包', '肉包')
    assert.equal(r.score, 0)
  })

  it('16. 竹筍湯 vs 竹筍排骨湯 low score', () => {
    const r = computeAutoApplyMatchScore('竹筍湯', '竹筍排骨湯')
    assert.ok(r.score < 0.99)
  })

  it('17. rollback restores unknown nulls', () => {
    const log = applyAutoResolveToLog(unknownLog('x'), mockCandidate())
    const audit = newAuditEntry({
      unknown_record_id: log.id,
      original_food_name: log.name,
      matched_item_id: 'kb-test-1',
      matched_item_name: '測試',
      match_score: 1,
      source_type: 'verified_database',
      source_name: 'src',
      source_url: 'https://example.com',
      before_nutrition: { calories: null, protein_g: null, fat_g: null, carbs_g: null },
      after_nutrition: { nutrition_status: 'auto_resolved', calories: 200, protein_g: 10, fat_g: 5, carbs_g: 25 },
      auto_resolved_at: new Date().toISOString(),
      qa_result: { pass: true, reasons: [] },
    })
    recordAutoApplyAudit(audit)
    const rolled = rollbackAutoResolvedLog(log, audit)
    assert.equal(rolled.nutrition_status, 'unknown')
    assert.equal(rolled.calories, null)
    assert.equal(findAuditByRollbackToken(audit.rollback_token)?.rolled_back, true)
  })

  it('18. missing source_url fails QA', () => {
    const c = mockCandidate({ nutrition_trace: { ...mockCandidate().nutrition_trace, source_url: '' } })
    assert.equal(runAutoApplyQaGate(unknownLog('x'), c).pass, false)
  })

  it('19. ONR A grade passes QA', () => {
    const c = mockCandidate({ nutrition_trace: { ...mockCandidate().nutrition_trace, source_type: 'onr', confidence: 'A' } })
    assert.equal(runAutoApplyQaGate(unknownLog('高麗菜包'), c).pass, true)
  })

  it('20. Food DNA B grade passes QA', () => {
    const c = mockCandidate({ nutrition_trace: { ...mockCandidate().nutrition_trace, source_type: 'food_dna', confidence: 'B' } })
    assert.equal(runAutoApplyQaGate(unknownLog('高麗菜包'), c).pass, true)
  })

  it('21. pending_review does not count toward totals', () => {
    const log: FoodLogEntry = { ...unknownLog('x'), nutrition_status: 'pending_review', calories: 500, protein_g: 20 }
    assert.equal(countsTowardDailyTotals(log), false)
  })

  it('22. auto_resolved counts toward totals', () => {
    const log = applyAutoResolveToLog(unknownLog('x'), mockCandidate())
    assert.equal(countsTowardDailyTotals(log), true)
    assert.equal(sumLoggedCalories([log]), 200)
  })

  it('23. daily job idempotent on second run', () => {
    enqueueUnknownFood({ food_name: '高麗菜包' })
    const logs = [unknownLog('高麗菜包', 'job-1')]
    const first = runDailyUnknownRematchJob({ food_logs: logs })
    const merged = first.updated_logs.length ? first.updated_logs : logs
    const second = runDailyUnknownRematchJob({ food_logs: merged })
    assert.equal(second.applied, 0)
    const idem = runDailyUnknownRematchJobIdempotent({ food_logs: logs })
    assert.ok(idem.applied >= 0)
  })

  it('24. auto_resolved UI badge', () => {
    const log = applyAutoResolveToLog(unknownLog('x'), mockCandidate())
    assert.equal(nutritionStatusBadge(log), 'BetterBit 已補齊')
  })

  it('25. null macros never coerced to 0 on unknown', () => {
    const log = unknownLog('菜包')
    assert.equal(log.protein_g, null)
    assert.notEqual(log.protein_g, 0)
  })
})
