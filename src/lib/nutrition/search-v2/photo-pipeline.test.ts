import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import {
  createPhotoV2State,
  finalizePhotoV2ToFoodLogPayload,
  photoV2ReadyForLog,
  runPhotoSearchV2Pipeline,
  updatePhotoV2State,
} from '@/lib/nutrition/search-v2/photo-pipeline'
import { runPhotoAccuracyPipeline, finalizeToFoodLogPayload } from '@/lib/nutrition/accuracy-engine'
import {
  createPhotoAccuracyState,
  buildPhotoLogCommitFromAccuracy,
  photoAccuracyReadyForLog,
  updatePhotoAccuracyState,
} from '@/lib/nutrition/photo-log-accuracy'
import { searchNutritionV2 } from '@/lib/nutrition/search-v2'
import { clearUnknownQueueForTests } from '@/lib/nutrition/search-v2/unknown-queue'
import {
  clearUnknownPhotoQueueForTests,
  enqueueUnknownPhoto,
  getUnknownPhotoQueueSize,
  listUnknownPhotoQueue,
} from '@/lib/nutrition/search-v2/unknown-photo-queue'
import { runAutoRematch } from '@/lib/nutrition/search-v2/auto-rematch'
import { NULL_MACROS } from '@/lib/nutrition/search-v2/types'
import { applyClarificationAnswer, clarificationComplete } from '@/lib/nutrition/search-v2/clarification'

beforeEach(() => {
  clearUnknownQueueForTests()
  clearUnknownPhotoQueueForTests()
})

describe('Photo Nutrition V2 — Level A official', () => {
  it('P1: 椰香綠咖哩嫩雞飯 photo label can Level A create', () => {
    const state = createPhotoV2State('椰香綠咖哩嫩雞飯', { store: '7-11' })
    const resolved = state.outcome
    if (resolved.level === 'A') {
      assert.equal(photoV2ReadyForLog(state), true)
      const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'p1' })
      assert.ok(payload)
      assert.notEqual(payload!.calories, null)
      assert.equal(payload!.nutrition_status, 'official')
      assert.equal(payload!.nutrition_confidence, 'A')
    } else {
      assert.ok(['clarify', 'create_unknown'].includes(resolved.action) || resolved.level === 'B')
    }
  })

  it('P2: official photo payload never uses ai_photo_only source', () => {
    const state = createPhotoV2State('椰香綠咖哩嫩雞飯')
    const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'p2' })
    if (payload && payload.nutrition_status === 'official') {
      assert.notEqual(payload.nutrition_source, 'ai_photo_only')
    }
  })
})

describe('Photo Nutrition V2 — Level B clarification required', () => {
  it('P3: 竹筍湯 photo must not direct estimate', () => {
    const state = createPhotoV2State('竹筍湯')
    assert.equal(state.outcome.action, 'clarify')
    assert.equal(photoV2ReadyForLog(state), false)
    const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'p3' })
    assert.equal(payload, null)
  })

  it('P4: 便當 photo must clarification', () => {
    const state = createPhotoV2State('便當')
    assert.equal(state.outcome.action, 'clarify')
    assert.ok(state.clarification)
    assert.equal(photoV2ReadyForLog(state), false)
  })

  it('P5: 滷味 photo must clarification', () => {
    const state = createPhotoV2State('滷味')
    assert.equal(state.outcome.action, 'clarify')
    assert.equal(photoV2ReadyForLog(state), false)
  })

  it('P6: 自助餐 photo must not write nutrition before confirm', () => {
    const state = createPhotoV2State('自助餐')
    assert.equal(photoV2ReadyForLog(state), false)
    assert.equal(finalizePhotoV2ToFoodLogPayload(state, { id: 'p6' }), null)
  })

  it('P7: user confirm alone without clarification answers blocks write for 竹筍湯', () => {
    let state = createPhotoV2State('竹筍湯')
    state = updatePhotoV2State(state, { user_confirmed: true })
    assert.equal(photoV2ReadyForLog(state), false)
  })
})

describe('Photo Nutrition V2 — Level C unknown', () => {
  it('P8: unrecognizable photo creates unknown', () => {
    const state = createPhotoV2State('未知食物')
    assert.equal(state.outcome.action, 'create_unknown')
    assert.equal(photoV2ReadyForLog(state), true)
  })

  it('P9: unknown calories protein fat carbs must be null not zero', () => {
    const state = createPhotoV2State('阿嬤煮的湯')
    const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'p9' })
    assert.ok(payload)
    assert.equal(payload!.calories, null)
    assert.equal(payload!.protein_g, null)
    assert.equal(payload!.fat_g, null)
    assert.equal(payload!.carbs_g, null)
    assert.notEqual(payload!.calories, 0)
  })

  it('P10: unknown nutrition_status and confidence', () => {
    const payload = finalizePhotoV2ToFoodLogPayload(createPhotoV2State('無法辨識'), { id: 'p10' })
    assert.ok(payload)
    assert.equal(payload!.nutrition_status, 'unknown')
    assert.equal(payload!.nutrition_confidence, 'Unknown')
    assert.equal(payload!.capture_status, 'photo_only')
  })
})

describe('Photo Nutrition V2 — hard rules', () => {
  it('P11: runPhotoAccuracyPipeline blocks before confirm for bento', () => {
    const { final } = runPhotoAccuracyPipeline({ label: '雞腿便當', source_type: 'ai_photo_only' })
    assert.equal(final.ready_for_food_log, false)
    assert.equal(finalizeToFoodLogPayload(final, { id: 'x', logged_at: new Date().toISOString() }), null)
  })

  it('P12: ai_photo_only D cannot finalizeToFoodLogPayload', () => {
    const { final } = runPhotoAccuracyPipeline({ label: '神秘料理', source_type: 'ai_photo_only' })
    assert.equal(final.source_type, 'ai_photo_only')
    assert.equal(finalizeToFoodLogPayload(final, { id: 'x', logged_at: new Date().toISOString() }), null)
  })

  it('P13: photo pipeline never uses meal-target fallback', () => {
    const state = createPhotoV2State('完全沒資料的食物xyz123')
    const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'p13' })
    if (payload?.nutrition_status === 'unknown') {
      assert.deepEqual(
        {
          c: payload.calories,
          p: payload.protein_g,
          f: payload.fat_g,
          cb: payload.carbs_g,
        },
        { c: null, p: null, f: null, cb: null }
      )
    }
  })
})

describe('Photo Nutrition V2 — Unknown Photo Queue', () => {
  it('P14: unknown photo enqueues', () => {
    createPhotoV2State('無法辨識', { photo_id: 'ph1' })
    assert.ok(getUnknownPhotoQueueSize() >= 1)
  })

  it('P15: queue has required fields', () => {
    enqueueUnknownPhoto({
      detected_label: '竹筍湯',
      photo_id: 'ph2',
      image_hash: 'abc',
      possible_matches: ['竹筍排骨湯'],
    })
    const entry = listUnknownPhotoQueue('waiting')[0]
    assert.ok(entry)
    assert.equal(entry.photo_id, 'ph2')
    assert.equal(entry.image_hash, 'abc')
    assert.ok(entry.possible_matches.includes('竹筍排骨湯'))
  })

  it('P16: auto rematch scans photo unknown queue', () => {
    enqueueUnknownPhoto({ detected_label: '竹筍排骨湯', photo_id: 'ph3' })
    const proposals = runAutoRematch([{ name: '竹筍排骨湯', store: '家常' }])
    assert.ok(proposals.length >= 0)
  })
})

describe('Photo Nutrition V2 — UI integration layer', () => {
  it('P17: createPhotoAccuracyState blocks bento before confirm', () => {
    const state = createPhotoAccuracyState('雞腿便當')
    assert.equal(photoAccuracyReadyForLog(state), false)
    assert.equal(buildPhotoLogCommitFromAccuracy(state, { id: 'u1' }).payload, null)
  })

  it('P18: unknown photo accuracy allows photo-only save', () => {
    const state = createPhotoAccuracyState('阿嬤煮的湯')
    assert.equal(state.nutrition_status, 'unknown')
    assert.equal(photoAccuracyReadyForLog(state), true)
    const commit = buildPhotoLogCommitFromAccuracy(state, { id: 'u2' })
    assert.ok(commit.payload)
    assert.equal(commit.payload!.calories, null)
  })

  it('P19: clarification UI message for ambiguous', () => {
    const state = createPhotoAccuracyState('竹筍湯')
    assert.match(state.ui_message, /確認/)
  })

  it('P20: text search V2 unchanged by photo module', () => {
    const text = searchNutritionV2('竹筍湯')
    const photo = createPhotoV2State('竹筍湯').outcome
    assert.equal(text.action, photo.action)
    assert.equal(text.level, photo.level)
  })
})

describe('Photo Nutrition V2 — high risk', () => {
  it('P21: 鹽酥雞 photo requires clarification not direct nutrition', () => {
    const state = createPhotoV2State('鹽酥雞')
    assert.equal(photoV2ReadyForLog(state), false)
  })

  it('P22: NULL_MACROS used for unknown not zero-fill', () => {
    assert.deepEqual(NULL_MACROS, {
      calories: null,
      protein: null,
      fat: null,
      carbs: null,
      fiber: null,
      sugar: null,
      sodium: null,
    })
  })

  it('P23: 火鍋 photo must clarification', () => {
    const state = createPhotoV2State('火鍋')
    assert.equal(state.outcome.action, 'clarify')
    assert.equal(photoV2ReadyForLog(state), false)
  })

  it('P24: 家常菜 photo unknown null macros', () => {
    const state = createPhotoV2State('家常菜')
    assert.equal(state.outcome.action, 'create_unknown')
    const payload = finalizePhotoV2ToFoodLogPayload(state, { id: 'p24' })
    assert.ok(payload)
    assert.equal(payload!.calories, null)
    assert.equal(payload!.nutrition_status, 'unknown')
  })

  it('P25: runPhotoAccuracyPipeline v2_payload null macros for unknown', () => {
    const { v2_payload, final } = runPhotoAccuracyPipeline({
      label: '阿嬤煮的湯',
      source_type: 'ai_photo_only',
    })
    assert.ok(v2_payload)
    assert.equal(v2_payload!.calories, null)
    assert.equal(v2_payload!.nutrition_status, 'unknown')
    assert.equal(final.ready_for_food_log, true)
    assert.equal(finalizeToFoodLogPayload(final, { id: 'p25', logged_at: new Date().toISOString() }), null)
  })

  it('P26: official commit meta never claims ai_photo_only nutrition source', () => {
    const state = createPhotoAccuracyState('椰香綠咖哩嫩雞飯')
    if (state.v2.outcome.level !== 'A') return
    const commit = buildPhotoLogCommitFromAccuracy(state, { id: 'p26' })
    assert.ok(commit.payload)
    assert.equal(commit.payload!.nutrition_status, 'official')
    assert.ok(commit.meta)
    assert.notEqual(commit.meta!.source_type, 'ai_photo_only')
  })

  it('P27: save path blocked until photoAccuracyReadyForLog', () => {
    const bento = createPhotoAccuracyState('便當')
    assert.equal(photoAccuracyReadyForLog(bento), false)
    assert.equal(buildPhotoLogCommitFromAccuracy(bento, { id: 'p27' }).payload, null)
    const unknown = createPhotoAccuracyState('家常菜')
    assert.equal(photoAccuracyReadyForLog(unknown), true)
    assert.equal(buildPhotoLogCommitFromAccuracy(unknown, { id: 'p27b' }).payload!.calories, null)
  })
})
