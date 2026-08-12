import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  createPhotoV2State,
  finalizePhotoV2ToFoodLogPayload,
  photoV2ReadyForLog,
  updatePhotoV2State,
  type PhotoV2State,
} from '@/lib/nutrition/search-v2/photo-pipeline'
import {
  photoAccuracyDisplayMacros,
  photoAccuracyStateFromV2,
} from '@/lib/nutrition/photo-log-accuracy'
import { enrichFoodLog } from '@/lib/food-log-macros'
import { isFoodLogCountedTowardTotals } from '@/lib/food-log-totals'
import { isNutritionPendingConfirmation } from '@/lib/nutrition/nutrition-pending-status'
import type { SearchV2Candidate, SearchV2Outcome } from '@/lib/nutrition/search-v2/types'
import type { FoodLogEntry } from '@/lib/banks/types'

function readRepoFile(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
}

/** 豬腳: 535 kcal / 33g protein / 27g fat / 45g carbs — a confident, Level A official match. */
const PIG_KNUCKLE_CANDIDATE: SearchV2Candidate = {
  id: 'official-pig-knuckle',
  name: '豬腳',
  macros: { calories: 535, protein: 33, fat: 27, carbs: 45, fiber: null, sugar: null, sodium: null },
  nutrition_status: 'official',
  nutrition_confidence: 'A',
  nutrition_source: 'test-fixture',
  source_tier: 'official',
  match_score: 95,
  explanation: '官方資料庫比對成功',
}

function levelAOutcome(candidate: SearchV2Candidate): SearchV2Outcome {
  return {
    level: 'A',
    action: 'create_official',
    query: candidate.name,
    explanation: candidate.explanation,
    candidates: [candidate],
    official_record: candidate,
  }
}

function unknownOutcome(query: string): SearchV2Outcome {
  return {
    level: 'C',
    action: 'create_unknown',
    query,
    explanation: '完全沒有可信營養資料，建立 Photo Only Record。',
    candidates: [],
    unknown_record: {
      food_name: query,
      restaurant: null,
      nutrition_status: 'unknown',
      nutrition_confidence: 'Unknown',
      macros: { calories: null, protein: null, fat: null, carbs: null, fiber: null, sugar: null, sodium: null },
      ui_message: '目前沒有可信營養資料。可以先保存照片紀錄，之後找到資料再更新。',
    },
  }
}

function baseV2State(outcome: SearchV2Outcome, label: string): PhotoV2State {
  return {
    detected_label: label,
    visual_parse: {
      detected_label: label,
      visual_category: 'unknown',
      category_confidence: 'low',
    } as PhotoV2State['visual_parse'],
    photo_ai_original_candidates: [],
    outcome,
    clarification: null,
    answers: {},
    user_confirmed: false,
  }
}

describe('BUG 1 — photo first save must not zero out nutrition (root cause fix)', () => {
  describe('source regression: native iOS must resolve real nutrition before the first save, same as web', () => {
    const source = readRepoFile('src/components/dashboard/TodayOS.tsx')
    const parsePhotoDraft = source.slice(
      source.indexOf('const parsePhotoDraft = useCallback(async ('),
      source.indexOf('const handlePhotoPick = useCallback(')
    )

    it('parsePhotoDraft no longer short-circuits on native with every macro nulled out', () => {
      assert.doesNotMatch(
        parsePhotoDraft,
        /if \(isNativeIOS\(\)\)/,
        'native iOS must not skip nutrition matching — that produced the always-0/null first save'
      )
    })

    it('fetchPhotoMatch runs unconditionally for both native and web (single shared path)', () => {
      const fetchCalls = [...parsePhotoDraft.matchAll(/fetchPhotoMatch\(/g)]
      assert.equal(fetchCalls.length, 1, 'expected exactly one unconditional fetchPhotoMatch call site')
    })
  })

  describe('Test A — confident match (豬腳 535/33/27/45) shows real nutrition immediately, no manual edit', () => {
    const v2 = baseV2State(levelAOutcome(PIG_KNUCKLE_CANDIDATE), '豬腳')
    const accuracy = photoAccuracyStateFromV2(v2)
    const display = photoAccuracyDisplayMacros(accuracy)

    it('display macros are the real values immediately after matching, not 0/null', () => {
      assert.equal(display.calories, 535)
      assert.equal(display.protein_g, 33)
      assert.equal(display.fat_g, 27)
      assert.equal(display.carbs_g, 45)
    })

    it('ready_for_food_log is true without any user_confirmed step (Level A commits as-is)', () => {
      assert.equal(photoV2ReadyForLog(v2), true)
    })

    it('the committed payload carries the same real macros, not a zeroed placeholder', () => {
      const payload = finalizePhotoV2ToFoodLogPayload(v2, { id: 'log-1' })
      assert.ok(payload)
      assert.equal(payload!.calories, 535)
      assert.equal(payload!.protein_g, 33)
      assert.equal(payload!.fat_g, 27)
      assert.equal(payload!.carbs_g, 45)
      assert.equal(payload!.nutrition_status, 'official')
      assert.equal(payload!.capture_status, 'resolved')
    })
  })

  describe('Test B — unresolved nutrition must show as pending, never a fake 0 kcal', () => {
    const v2 = baseV2State(unknownOutcome('神秘食物'), '神秘食物')

    it('finalized payload has null macros, not 0, when nutrition cannot be confirmed', () => {
      const payload = finalizePhotoV2ToFoodLogPayload(v2, { id: 'log-2' })
      assert.ok(payload)
      assert.equal(payload!.calories, null)
      assert.equal(payload!.protein_g, null)
      assert.equal(payload!.nutrition_status, 'unknown')
    })

    it('a pending/unknown log is recognized as pending confirmation, not counted toward totals', () => {
      const payload = finalizePhotoV2ToFoodLogPayload(v2, { id: 'log-2' })!
      const log = { ...payload, logged_at: new Date().toISOString(), user_declared: true as const } as FoodLogEntry
      assert.equal(isNutritionPendingConfirmation(log), true)
      assert.equal(isFoodLogCountedTowardTotals(log), false)
    })
  })

  describe('Test C — photo save -> state update -> render requires no manual edit step for a confident match', () => {
    it('a Level A state is ready to log the moment matching resolves (updatePhotoV2State/user_confirmed never called)', () => {
      const v2 = baseV2State(levelAOutcome(PIG_KNUCKLE_CANDIDATE), '豬腳')
      // Explicitly do NOT call updatePhotoV2State here — simulates straight
      // photo-capture -> match -> save, with zero manual confirmation steps.
      assert.equal(v2.user_confirmed, false)
      assert.equal(photoV2ReadyForLog(v2), true)
      const payload = finalizePhotoV2ToFoodLogPayload(v2, { id: 'log-3' })
      assert.equal(payload!.calories, 535)
    })

    it('manually re-confirming the same candidate (updatePhotoV2State) must not change the resolved macros', () => {
      const v2 = baseV2State(levelAOutcome(PIG_KNUCKLE_CANDIDATE), '豬腳')
      const reconfirmed = updatePhotoV2State(v2, {
        user_confirmed: true,
        selected_candidate_id: PIG_KNUCKLE_CANDIDATE.id,
      })
      const payload = finalizePhotoV2ToFoodLogPayload(reconfirmed, { id: 'log-3b' })
      assert.equal(payload!.calories, 535)
      assert.equal(payload!.protein_g, 33)
    })
  })

  describe('Test D — nutrition must survive a persisted-state reload (app close/reopen)', () => {
    it('enrichFoodLog (the rehydration/backfill pass run on loaded logs) does not strip a resolved photo log\'s nutrition', () => {
      const v2 = baseV2State(levelAOutcome(PIG_KNUCKLE_CANDIDATE), '豬腳')
      const payload = finalizePhotoV2ToFoodLogPayload(v2, { id: 'log-4' })!
      const persisted: FoodLogEntry = {
        ...payload,
        logged_at: new Date().toISOString(),
        user_declared: true,
      } as FoodLogEntry

      const rehydrated = enrichFoodLog(persisted)
      assert.equal(rehydrated.calories, 535)
      assert.equal(rehydrated.protein_g, 33)
      assert.equal(rehydrated.fat_g, 27)
      assert.equal(rehydrated.carbs_g, 45)
      assert.equal(isFoodLogCountedTowardTotals(rehydrated), true)
    })

    it('a pending/unknown log rehydrated the same way stays pending — reload never invents a 0', () => {
      const v2 = baseV2State(unknownOutcome('神秘食物'), '神秘食物')
      const payload = finalizePhotoV2ToFoodLogPayload(v2, { id: 'log-5' })!
      const persisted: FoodLogEntry = {
        ...payload,
        logged_at: new Date().toISOString(),
        user_declared: true,
      } as FoodLogEntry

      const rehydrated = enrichFoodLog(persisted)
      assert.equal(rehydrated.calories, null)
      assert.equal(isNutritionPendingConfirmation(rehydrated), true)
    })
  })
})
